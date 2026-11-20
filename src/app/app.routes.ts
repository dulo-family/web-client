import { Routes } from '@angular/router';
import { setupDoneGuard } from './features/setup/setup.guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
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
    canActivate: [setupDoneGuard],
    loadComponent: () => import('./features/setup/done.page').then((m) => m.SetupDonePage),
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/setup/setup.page').then((m) => m.SetupPage),
    loadChildren: () => import('./features/setup/setup.routes').then((m) => m.SETUP_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
