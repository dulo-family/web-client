import { EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { SplashService } from './splash.service';

/**
 * Hides the splash once the first navigation settles. Route guards run before that, so the
 * splash stays until the app knows where to go.
 */
export function provideSplash(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const splash = inject(SplashService);
    inject(Router)
      .events.pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        take(1),
      )
      .subscribe(() => splash.hide());
  });
}
