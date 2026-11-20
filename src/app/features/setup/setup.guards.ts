import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';
import { SETUP_STEPS, SetupStepId, SetupStore } from './setup.store';

/** Opens a step only when every step before it is valid; otherwise the first one that isn't. */
export const setupStepGuard: CanActivateFn = (route) => {
  const store = inject(SetupStore);
  const step = route.data['step'] as SetupStepId;
  const blocked = store.firstInvalidBefore(step);
  if (blocked) {
    return inject(Router).createUrlTree(['/setup', blocked]);
  }
  store.reach(step);
  return true;
};

/** `/setup` continues where the wizard was left. */
export const resumeSetup: RedirectFunction = () => `/setup/${inject(SetupStore).resumeStep()}`;

/** The done page only makes sense right after the setup finished. */
export const setupDoneGuard: CanActivateFn = () =>
  inject(SetupStore).finishedTreeName() !== null || inject(Router).createUrlTree(['/']);

export function isSetupStep(value: string | undefined): value is SetupStepId {
  return SETUP_STEPS.includes(value as SetupStepId);
}
