import { Routes } from '@angular/router';

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
    path: 'setup',
    loadComponent: () => import('./features/setup/setup.page').then((m) => m.SetupPage),
  },
  { path: '**', redirectTo: '' },
];
