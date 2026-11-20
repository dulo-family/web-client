import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SetupStatus } from './setup-status';

/** The app's own pages: while the setup is pending they lead to the setup. */
export const setupCompletedGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const pending = await inject(SetupStatus).isPending();
  return pending === true ? router.createUrlTree(['/setup']) : true;
};

/** The setup wizard: once the setup is done it leads home. */
export const setupPendingGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const pending = await inject(SetupStatus).isPending();
  return pending === false ? router.createUrlTree(['/']) : true;
};
