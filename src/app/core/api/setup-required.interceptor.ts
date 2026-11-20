import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SetupStatus } from '../setup/setup-status';
import { isProblem } from './problem';

/** Until the initial setup is done the API answers 503 `setup-required`; go to the setup then. */
export const setupRequiredInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const status = inject(SetupStatus);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (isProblem(error, 'setup-required')) {
        status.markPending();
        if (!router.url.startsWith('/setup')) {
          void router.navigateByUrl('/setup');
        }
      }
      return throwError(() => error);
    }),
  );
};
