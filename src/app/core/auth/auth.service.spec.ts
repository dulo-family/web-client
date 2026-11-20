import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../api/api';
import { BROWSER_LOCATION } from '../browser/location';
import {
  AuthService,
  PENDING_SIGN_IN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  SignInError,
  TokenResponse,
  safeReturnTo,
} from './auth.service';
import { codeChallenge } from './pkce';

const API = 'http://api.test';
const APP = 'http://app.test';

function tokens(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    access_token: 'access-1',
    token_type: 'Bearer',
    expires_in: 900,
    refresh_token: 'refresh-1',
    id_token: 'id-1',
    ...overrides,
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let assign: ReturnType<typeof vi.fn>;

  function expectTokenRequest() {
    const request = http.expectOne(`${API}/oauth2/token`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    return { request, form: new URLSearchParams(request.request.body as string) };
  }

  async function signInAndReturn(): Promise<string> {
    await auth.signIn('mock', '/people?x=1');
    const authorize = new URL(assign.mock.calls[0][0] as string);
    const result = auth.completeSignIn({
      code: 'the-code',
      state: authorize.searchParams.get('state'),
      error: null,
    });
    expectTokenRequest().request.flush(tokens());
    return result;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assign = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: API },
        { provide: BROWSER_LOCATION, useValue: { origin: APP, assign } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('starts the authorization code flow with PKCE and the provider hint', async () => {
    await auth.signIn('mock', '/people');

    const url = new URL(assign.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(`${API}/oauth2/authorize`);
    const params = url.searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe('dulo-web');
    expect(params.get('redirect_uri')).toBe(`${APP}/auth/callback`);
    expect(params.get('scope')).toBe('openid');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('idp')).toBe('mock');

    const pending = JSON.parse(sessionStorage.getItem(PENDING_SIGN_IN_STORAGE_KEY)!);
    expect(pending.returnTo).toBe('/people');
    expect(pending.state).toBe(params.get('state'));
    expect(params.get('code_challenge')).toBe(await codeChallenge(pending.verifier));
  });

  it('exchanges the code, keeps the tokens and returns where the user started', async () => {
    await auth.signIn('mock', '/people?x=1');
    const authorize = new URL(assign.mock.calls[0][0] as string);
    const pending = JSON.parse(sessionStorage.getItem(PENDING_SIGN_IN_STORAGE_KEY)!);

    const result = auth.completeSignIn({
      code: 'the-code',
      state: authorize.searchParams.get('state'),
      error: null,
    });
    const { request, form } = expectTokenRequest();
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: `${APP}/auth/callback`,
      client_id: 'dulo-web',
      code_verifier: pending.verifier,
    });
    request.flush(tokens());

    expect(await result).toBe('/people?x=1');
    expect(auth.signedIn()).toBe(true);
    expect(await auth.accessToken()).toBe('access-1');
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
    expect(sessionStorage.getItem(PENDING_SIGN_IN_STORAGE_KEY)).toBeNull();
  });

  it('rejects a callback with the wrong state, without calling the server', async () => {
    await auth.signIn('mock');

    await expect(
      auth.completeSignIn({ code: 'the-code', state: 'forged', error: null }),
    ).rejects.toBeInstanceOf(SignInError);
    expect(auth.signedIn()).toBe(false);
  });

  it('rejects a callback with an error or without a pending sign-in', async () => {
    await expect(
      auth.completeSignIn({ code: 'the-code', state: 's', error: null }),
    ).rejects.toBeInstanceOf(SignInError);
    await auth.signIn('mock');
    await expect(
      auth.completeSignIn({ code: null, state: null, error: 'access_denied' }),
    ).rejects.toBeInstanceOf(SignInError);
  });

  it('rejects a callback whose code the server refuses', async () => {
    await auth.signIn('mock');
    const state = new URL(assign.mock.calls[0][0] as string).searchParams.get('state');

    const result = auth.completeSignIn({ code: 'old', state, error: null });
    expectTokenRequest().request.flush(
      { error: 'invalid_grant' },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(result).rejects.toBeInstanceOf(SignInError);
  });

  it('refreshes an access token that is about to expire, once for all callers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await signInAndReturn();
    vi.setSystemTime(Date.now() + 850_000);

    const first = auth.accessToken();
    const second = auth.accessToken();
    const { request, form } = expectTokenRequest();
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      client_id: 'dulo-web',
    });
    request.flush(
      tokens({ access_token: 'access-2', refresh_token: 'refresh-2', id_token: undefined }),
    );

    expect(await first).toBe('access-2');
    expect(await second).toBe('access-2');
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-2');
  });

  it('restores the session from the stored refresh token', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');

    const restored = auth.restore();
    expectTokenRequest().request.flush(tokens({ refresh_token: 'refresh-2' }));
    await restored;

    expect(auth.signedIn()).toBe(true);
  });

  it('signs out when the server rejects the refresh token', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');

    const restored = auth.restore();
    expectTokenRequest().request.flush(
      { error: 'invalid_grant' },
      { status: 400, statusText: 'Bad Request' },
    );
    await restored;

    expect(auth.signedIn()).toBe(false);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('keeps the refresh token when the server cannot be reached', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-1');

    const refreshed = auth.refresh();
    expectTokenRequest().request.error(new ProgressEvent('error'));

    expect(await refreshed).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
  });

  it('signs out through the server with the ID token', async () => {
    await signInAndReturn();
    assign.mockClear();

    await auth.signOut();

    const url = new URL(assign.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(`${API}/connect/logout`);
    expect(url.searchParams.get('id_token_hint')).toBe('id-1');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(`${APP}/sign-in`);
    expect(auth.signedIn()).toBe(false);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('remembers where the next sign-in should return to after signing out', async () => {
    await signInAndReturn();

    await auth.signOut('/setup/sign-in');

    expect(auth.takeReturnAfterSignOut()).toBe('/setup/sign-in');
    expect(auth.takeReturnAfterSignOut()).toBeNull();
  });

  it('goes to the sign-in page when there is no ID token to sign out with', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await auth.signOut();

    expect(assign).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });
});

describe('safeReturnTo', () => {
  it('keeps paths inside the app', () => {
    expect(safeReturnTo('/people/1?tab=events')).toBe('/people/1?tab=events');
  });

  it('replaces anything else with the home page', () => {
    for (const value of [
      null,
      '',
      'people',
      'https://evil.test',
      '//evil.test',
      '/\\evil.test',
      '/sign-in',
      '/auth/callback?code=x',
    ]) {
      expect(safeReturnTo(value)).toBe('/');
    }
  });
});
