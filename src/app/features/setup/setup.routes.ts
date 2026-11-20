import { Routes } from '@angular/router';
import { resumeSetup, setupStepGuard } from './setup.guards';
import { SetupStepId } from './setup.store';

function step(id: SetupStepId, loadComponent: Routes[number]['loadComponent']) {
  return { path: id, data: { step: id }, canActivate: [setupStepGuard], loadComponent };
}

/** The wizard's steps, under the shell in `setup.page.ts`. */
export const SETUP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: resumeSetup },
  step('welcome', () => import('./steps/welcome.step').then((m) => m.WelcomeStep)),
  step('token', () => import('./steps/token.step').then((m) => m.TokenStep)),
  step('sign-in', () => import('./steps/sign-in.step').then((m) => m.SignInStep)),
  step('name', () => import('./steps/name.step').then((m) => m.NameStep)),
  step('description', () => import('./steps/description.step').then((m) => m.DescriptionStep)),
  step('features', () => import('./steps/features.step').then((m) => m.FeaturesStep)),
  step('access', () => import('./steps/access.step').then((m) => m.AccessStep)),
  step('review', () => import('./steps/review.step').then((m) => m.ReviewStep)),
  { path: '**', redirectTo: '' },
];
