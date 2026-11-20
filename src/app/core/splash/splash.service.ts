import { DOCUMENT, Injectable, inject } from '@angular/core';

/** The splash stays at least this long after the page started loading, so it doesn't flicker. */
export const SPLASH_MIN_VISIBLE_MS = 700;
/** Matches --duration-slow, the fade in splash.css; also the fallback if transitionend never fires. */
export const SPLASH_FADE_MS = 400;
export const SPLASH_ELEMENT_ID = 'dulo-splash';

/** Fades out and removes the splash from index.html. */
@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly document = inject(DOCUMENT);
  private hiding = false;

  hide(): void {
    const splash = this.document.getElementById(SPLASH_ELEMENT_ID);
    if (!splash || this.hiding) {
      return;
    }
    this.hiding = true;
    const wait = Math.max(0, SPLASH_MIN_VISIBLE_MS - performance.now());
    setTimeout(() => this.fadeOut(splash), wait);
  }

  private fadeOut(splash: HTMLElement): void {
    if (this.prefersReducedMotion()) {
      splash.remove();
      return;
    }
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), SPLASH_FADE_MS + 100);
    splash.classList.add('splash--hidden');
  }

  private prefersReducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    );
  }
}
