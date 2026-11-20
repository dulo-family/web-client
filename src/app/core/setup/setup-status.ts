import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, SetupStatus as SetupStatusResponse, apiUrl } from '../api/api';

/**
 * Whether the initial setup is still pending. The server is asked once per page load; the app
 * updates the answer itself when the setup finishes or the API says it's required.
 */
@Injectable({ providedIn: 'root' })
export class SetupStatus {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private readonly state = signal<boolean | null>(null);
  private loading: Promise<boolean | null> | null = null;

  /** True while the setup is pending; null until known. */
  readonly pending = this.state.asReadonly();

  /** Asks the server unless the answer is known; null when the server can't be reached. */
  isPending(): Promise<boolean | null> {
    const known = this.state();
    if (known !== null) {
      return Promise.resolve(known);
    }
    this.loading ??= this.load().finally(() => (this.loading = null));
    return this.loading;
  }

  markPending(): void {
    this.state.set(true);
  }

  markCompleted(): void {
    this.state.set(false);
  }

  private async load(): Promise<boolean | null> {
    try {
      const status = await firstValueFrom(
        this.http.get<SetupStatusResponse>(apiUrl(this.base, '/setup/status')),
      );
      this.state.set(status.pending);
      return status.pending;
    } catch {
      // Unknown: let the navigation go on; a 503 `setup-required` still leads to the setup.
      return null;
    }
  }
}
