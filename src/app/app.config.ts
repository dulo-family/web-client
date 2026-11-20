import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { setupRequiredInterceptor } from './core/api/setup-required.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { provideI18n } from './core/i18n/provide-i18n';
import { provideSplash } from './core/splash/provide-splash';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, setupRequiredInterceptor])),
    provideRouter(routes),
    provideI18n(),
    provideAppInitializer(() => inject(AuthService).restore()),
    provideSplash(),
  ],
};
