import { DOCUMENT, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LANGUAGES, LanguageId, resolveLanguage } from './languages';

export const LANGUAGE_STORAGE_KEY = 'dulo.lang';

/** The active language: picks it at boot, switches and stores it, and keeps `<html lang>` in sync. */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly languages = LANGUAGES;
  readonly active = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  constructor() {
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe((lang) => {
      this.document.documentElement.lang = lang;
    });
  }

  /** Picks the start language and loads it, so the first screen renders translated. */
  async init(): Promise<void> {
    const browserLanguages = this.document.defaultView?.navigator.languages ?? [];
    const language = resolveLanguage(this.readStored(), browserLanguages);
    this.transloco.setActiveLang(language);
    await firstValueFrom(this.transloco.load(language));
  }

  set(language: LanguageId): void {
    this.transloco.setActiveLang(language);
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be blocked; the choice then lasts for the visit.
    }
  }

  private readStored(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
