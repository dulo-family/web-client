import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api';
import { AuthService } from './auth.service';

const RETRIED_AFTER_REFRESH = new HttpContextToken(() => false);

/**
 * Adds the access token to API calls (refreshing it first when it's about to expire). A 401
 * refreshes once and retries. Other URLs, such as `/oauth2/token`, are left alone.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (!request.url.startsWith(`${inject(API_BASE_URL)}/api/`)) {
    return next(request);
  }
  return from(auth.accessToken()).pipe(
    switchMap((token) => next(withToken(request, token))),
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.context.get(RETRIED_AFTER_REFRESH) &&
        auth.hasRefreshToken()
      ) {
        const retry = request.clone({
          context: request.context.set(RETRIED_AFTER_REFRESH, true),
        });
        return from(auth.refresh()).pipe(
          switchMap((token) => (token ? next(withToken(retry, token)) : throwError(() => error))),
        );
      }
      return throwError(() => error);
    }),
  );
};

function withToken<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
