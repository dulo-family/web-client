import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api/api';
import { BROWSER_LOCATION } from '../browser/location';
import { codeChallenge, randomToken } from './pkce';

/** The web client's registration at Dulo's authorization server. */
export const CLIENT_ID = 'dulo-web';
export const CALLBACK_PATH = '/auth/callback';
export const SIGN_IN_PATH = '/sign-in';
/** Refresh tokens survive reloads in localStorage; access and ID tokens stay in memory. */
export const REFRESH_TOKEN_STORAGE_KEY = 'dulo.auth.refreshToken';
/** The sign-in in progress, kept across the redirects to the identity provider. */
export const PENDING_SIGN_IN_STORAGE_KEY = 'dulo.auth.pending';
/** Where to go after the next sign-in, when a sign-out asked for it. */
export const AFTER_SIGN_OUT_STORAGE_KEY = 'dulo.auth.afterSignOut';
/** Access tokens this close to expiry are refreshed before use. */
export const EXPIRY_MARGIN_MS = 60_000;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface Session {
  readonly accessToken: string;
  readonly expiresAt: number;
  readonly idToken?: string;
}

interface PendingSignIn {
  readonly verifier: string;
  readonly state: string;
  readonly returnTo: string;
}

/** The sign-in came back without a usable result (wrong state, provider error, rejected code). */
export class SignInError extends Error {}

/**
 * Signs in with the authorization code flow and PKCE, always naming the identity provider with
 * `idp=`, keeps the tokens, refreshes them one request at a time, and signs out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly location = inject(BROWSER_LOCATION);
  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly session = signal<Session | null>(null);
  private refreshing: Promise<string | null> | null = null;

  readonly signedIn = computed(() => this.session() !== null);

  /** Leaves the app for the authorization server, which sends the user to the provider. */
  async signIn(providerId: string, returnTo = '/'): Promise<void> {
    const verifier = randomToken();
    const state = randomToken(16);
    const pending: PendingSignIn = { verifier, state, returnTo: safeReturnTo(returnTo) };
    this.store('session', PENDING_SIGN_IN_STORAGE_KEY, JSON.stringify(pending));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: this.redirectUri,
      scope: 'openid',
      code_challenge: await codeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
      idp: providerId,
    });
    this.location.assign(`${this.base}/oauth2/authorize?${params}`);
  }

  /** Handles the redirect back to the callback; returns where the user started. */
  async completeSignIn(params: {
    code: string | null;
    state: string | null;
    error: string | null;
  }): Promise<string> {
    const pending = this.takePending();
    if (params.error || !params.code || !pending || params.state !== pending.state) {
      throw new SignInError(params.error ?? 'Invalid sign-in response');
    }
    try {
      this.accept(
        await this.requestTokens({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: this.redirectUri,
          client_id: CLIENT_ID,
          code_verifier: pending.verifier,
        }),
      );
    } catch (error) {
      throw new SignInError('Code exchange failed', { cause: error });
    }
    return pending.returnTo;
  }

  /** Restores the session from the stored refresh token. Never fails. */
  async restore(): Promise<void> {
    if (this.hasRefreshToken()) {
      await this.refresh();
    }
  }

  /** A valid access token, refreshed first when it's about to expire; null when signed out. */
  async accessToken(): Promise<string | null> {
    const session = this.session();
    if (session && session.expiresAt - Date.now() > EXPIRY_MARGIN_MS) {
      return session.accessToken;
    }
    return this.hasRefreshToken() ? this.refresh() : null;
  }

  /**
   * Gets new tokens with the refresh token. Concurrent callers share one request, because the
   * server replaces the refresh token on every use.
   */
  refresh(): Promise<string | null> {
    this.refreshing ??= this.doRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  hasRefreshToken(): boolean {
    return this.read('local', REFRESH_TOKEN_STORAGE_KEY) !== null;
  }

  /**
   * Forgets the tokens and ends the server's session, which returns to the sign-in page. With
   * `returnTo`, the next sign-in from that page returns there.
   */
  async signOut(returnTo?: string): Promise<void> {
    const idToken = this.session()?.idToken;
    this.clear();
    if (returnTo) {
      this.store('session', AFTER_SIGN_OUT_STORAGE_KEY, safeReturnTo(returnTo));
    }
    if (idToken) {
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: `${this.location.origin}${SIGN_IN_PATH}`,
      });
      this.location.assign(`${this.base}/connect/logout?${params}`);
    } else {
      await this.router.navigateByUrl(SIGN_IN_PATH);
    }
  }

  /** The return address a sign-out left for the next sign-in, once. */
  takeReturnAfterSignOut(): string | null {
    const returnTo = this.read('session', AFTER_SIGN_OUT_STORAGE_KEY);
    this.remove('session', AFTER_SIGN_OUT_STORAGE_KEY);
    return returnTo;
  }

  private async doRefresh(): Promise<string | null> {
    const refreshToken = this.read('local', REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) {
      return null;
    }
    try {
      const tokens = await this.requestTokens({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      });
      this.accept(tokens);
      return tokens.access_token;
    } catch (error) {
      // The server rejected the refresh token (expired, used, server restarted): signed out.
      // Without an answer (offline) keep it and try again on the next call.
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
        this.clear();
      }
      return null;
    }
  }

  private requestTokens(form: Record<string, string>): Promise<TokenResponse> {
    return firstValueFrom(
      this.http.post<TokenResponse>(
        `${this.base}/oauth2/token`,
        new URLSearchParams(form).toString(),
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        },
      ),
    );
  }

  private accept(tokens: TokenResponse): void {
    this.session.update((previous) => ({
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      idToken: tokens.id_token ?? previous?.idToken,
    }));
    if (tokens.refresh_token) {
      this.store('local', REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
    }
  }

  private clear(): void {
    this.session.set(null);
    this.remove('local', REFRESH_TOKEN_STORAGE_KEY);
  }

  private takePending(): PendingSignIn | null {
    const value = this.read('session', PENDING_SIGN_IN_STORAGE_KEY);
    this.remove('session', PENDING_SIGN_IN_STORAGE_KEY);
    try {
      return value ? (JSON.parse(value) as PendingSignIn) : null;
    } catch {
      return null;
    }
  }

  private get redirectUri(): string {
    return `${this.location.origin}${CALLBACK_PATH}`;
  }

  private storage(kind: 'local' | 'session'): Storage | undefined {
    return kind === 'local' ? this.window?.localStorage : this.window?.sessionStorage;
  }

  private read(kind: 'local' | 'session', key: string): string | null {
    try {
      return this.storage(kind)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private store(kind: 'local' | 'session', key: string, value: string): void {
    try {
      this.storage(kind)?.setItem(key, value);
    } catch {
      // Blocked storage: the session lasts until the next reload.
    }
  }

  private remove(kind: 'local' | 'session', key: string): void {
    try {
      this.storage(kind)?.removeItem(key);
    } catch {
      // Nothing stored then.
    }
  }
}

/** Only paths inside the app, so a crafted link can't send the user elsewhere after sign-in. */
export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    value.startsWith(CALLBACK_PATH) ||
    value.startsWith(SIGN_IN_PATH)
  ) {
    return '/';
  }
  return value;
}
