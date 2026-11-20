import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Storage key; the inline script in index.html reads it too. */
export const THEME_STORAGE_KEY = 'dulo.theme';

/**
 * The theme setting: follow the system, or force light or dark. Stored in the browser and applied
 * as `data-theme` on `<html>` (no attribute means system); the CSS tokens follow it.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly preferenceSignal = signal<ThemePreference>(this.read());

  readonly preference = this.preferenceSignal.asReadonly();

  constructor() {
    this.apply(this.preferenceSignal());
  }

  set(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    this.apply(preference);
    this.write(preference);
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = preference;
    }
  }

  private read(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private write(preference: ThemePreference): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (preference === 'system') {
        storage?.removeItem(THEME_STORAGE_KEY);
      } else {
        storage?.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // Storage can be blocked (private mode, site data off); the choice then lasts for the visit.
    }
  }
}
