import { TestBed } from '@angular/core/testing';
import {
  SPLASH_ELEMENT_ID,
  SPLASH_FADE_MS,
  SPLASH_MIN_VISIBLE_MS,
  SplashService,
} from './splash.service';

describe('SplashService', () => {
  let splash: HTMLElement;

  function reducedMotion(matches: boolean): void {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    splash = document.createElement('div');
    splash.id = SPLASH_ELEMENT_ID;
    document.body.append(splash);
    // jsdom has no matchMedia; give it one that tests can stub.
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    splash.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stays until the minimum time has passed since the page started loading', () => {
    vi.spyOn(performance, 'now').mockReturnValue(200);
    reducedMotion(false);

    TestBed.inject(SplashService).hide();

    vi.advanceTimersByTime(SPLASH_MIN_VISIBLE_MS - 200 - 1);
    expect(splash.classList).not.toContain('splash--hidden');
    vi.advanceTimersByTime(1);
    expect(splash.classList).toContain('splash--hidden');
  });

  it('fades out at once when the minimum time is over, then is removed', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000);
    reducedMotion(false);

    TestBed.inject(SplashService).hide();
    vi.advanceTimersByTime(0);

    expect(splash.classList).toContain('splash--hidden');
    expect(splash.isConnected).toBe(true);
    splash.dispatchEvent(new Event('transitionend'));
    expect(splash.isConnected).toBe(false);
  });

  it('is removed even if transitionend never fires', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000);
    reducedMotion(false);

    TestBed.inject(SplashService).hide();
    vi.advanceTimersByTime(SPLASH_FADE_MS + 100);

    expect(splash.isConnected).toBe(false);
  });

  it('is removed without a fade when the user prefers reduced motion', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000);
    reducedMotion(true);

    TestBed.inject(SplashService).hide();
    vi.advanceTimersByTime(0);

    expect(splash.isConnected).toBe(false);
    expect(splash.classList).not.toContain('splash--hidden');
  });

  it('does nothing without a splash', () => {
    splash.remove();

    expect(() => TestBed.inject(SplashService).hide()).not.toThrow();
  });
});
