import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, SIGN_IN_PATH } from './auth.service';

/** Pages that need a session; without one, the sign-in page, which returns here afterwards. */
export const signedInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.signedIn() || (await auth.accessToken()) !== null) {
    return true;
  }
  return router.createUrlTree([SIGN_IN_PATH], {
    queryParams: state.url === '/' ? {} : { returnTo: state.url },
  });
};
