import { Routes } from '@angular/router';
import { signedInGuard } from './core/auth/auth.guard';
import { setupCompletedGuard, setupPendingGuard } from './core/setup/setup-status.guards';
import { setupJustFinishedGuard } from './features/setup/setup.guards';

export const routes: Routes = [
  {
    path: 'sign-in',
    loadComponent: () => import('./features/sign-in/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/sign-in/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'setup/done',
    canActivate: [setupJustFinishedGuard],
    loadComponent: () => import('./features/setup/done.page').then((m) => m.SetupDonePage),
  },
  {
    path: 'setup',
    canActivate: [setupPendingGuard],
    loadComponent: () => import('./features/setup/setup.page').then((m) => m.SetupPage),
    loadChildren: () => import('./features/setup/setup.routes').then((m) => m.SETUP_ROUTES),
  },
  {
    // The app itself: only after the setup, and only with a session.
    path: '',
    canActivateChild: [setupCompletedGuard, signedInGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
