import { EnvironmentProviders, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { DEFAULT_LANGUAGE, LANGUAGE_IDS } from './languages';
import { LocaleService } from './locale.service';
import { TranslocoHttpLoader } from './transloco-loader';

/** Transloco with ICU MessageFormat, translations from `public/i18n`, start language loaded at boot. */
export function provideI18n(): EnvironmentProviders[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...LANGUAGE_IDS],
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoMessageformat(),
    provideAppInitializer(() => inject(LocaleService).init()),
  ];
}
