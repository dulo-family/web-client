import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { components } from './schema';

/** Origin of the Dulo server: empty when same-origin (the image), the dev server otherwise. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/** Types of the server's API, generated from its OpenAPI document (`npm run api:types`). */
export type Schemas = components['schemas'];
export type IdentityProvider = Schemas['IdentityProviderResponse'];
export type Me = Schemas['MeResponse'];
export type SetupStatus = Schemas['SetupStatusResponse'];
export type Tree = Schemas['TreeResponse'];

/** `${base}/api/v1${path}`. */
export function apiUrl(base: string, path: `/${string}`): string {
  return `${base}/api/v1${path}`;
}
