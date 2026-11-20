import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/** The browser's location, as a token so tests can replace full-page navigation. */
export const BROWSER_LOCATION = new InjectionToken<Pick<Location, 'origin' | 'assign'>>(
  'BROWSER_LOCATION',
  {
    providedIn: 'root',
    factory: () => {
      const location = inject(DOCUMENT).defaultView?.location;
      if (!location) {
        throw new Error('No browser location');
      }
      return location;
    },
  },
);
