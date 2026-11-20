import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, Schemas, Tree, apiUrl } from '../../core/api/api';

export type SetupDefaults = Schemas['SetupDefaultsResponse'];
export type SetupRequest = Schemas['SetupRequest'];

const SETUP_TOKEN_HEADER = 'X-Dulo-Setup-Token';

/** The setup endpoints; each needs the setup token from the server log. */
@Injectable({ providedIn: 'root' })
export class SetupApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** The defaults; also how the wizard checks the token (403 `invalid-setup-token`). */
  defaults(token: string): Promise<SetupDefaults> {
    return firstValueFrom(
      this.http.get<SetupDefaults>(apiUrl(this.base, '/setup/defaults'), {
        headers: this.headers(token),
      }),
    );
  }

  /** The merged server configuration as YAML, secrets masked. */
  async configuration(token: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<Schemas['SetupConfigurationResponse']>(apiUrl(this.base, '/setup/config'), {
        headers: this.headers(token),
      }),
    );
    return response.configuration;
  }

  /** Creates the tree; the signed-in caller becomes root. */
  complete(token: string, request: SetupRequest): Promise<Tree> {
    return firstValueFrom(
      this.http.post<Tree>(apiUrl(this.base, '/setup'), request, { headers: this.headers(token) }),
    );
  }

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({ [SETUP_TOKEN_HEADER]: token });
  }
}
