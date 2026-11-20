import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import bg from '../../public/i18n/bg.json';
import en from '../../public/i18n/en.json';
import { DEFAULT_LANGUAGE, LANGUAGE_IDS } from '../app/core/i18n/languages';

/** Transloco with the real translation files, preloaded, starting in English. */
export function provideI18nTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { en, bg },
        translocoConfig: {
          availableLangs: [...LANGUAGE_IDS],
          defaultLang: DEFAULT_LANGUAGE,
          fallbackLang: DEFAULT_LANGUAGE,
          reRenderOnLangChange: true,
        },
        preloadLangs: true,
      }),
    ),
    provideTranslocoMessageformat(),
  ];
}
