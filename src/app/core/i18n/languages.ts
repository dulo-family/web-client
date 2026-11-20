/** The languages the client is translated into. Labels are each language's own name. */
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bg', label: 'Български' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export const DEFAULT_LANGUAGE: LanguageId = 'en';

export const LANGUAGE_IDS: readonly LanguageId[] = LANGUAGES.map((language) => language.id);

export function isLanguageId(value: string | null | undefined): value is LanguageId {
  return LANGUAGE_IDS.includes(value as LanguageId);
}

/**
 * The language to start with: the stored choice, else the first of the browser's languages that we
 * have (matched by primary subtag, so `bg-BG` picks `bg`), else English.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  browserLanguages: readonly string[],
): LanguageId {
  if (isLanguageId(stored)) {
    return stored;
  }
  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLanguageId(primary)) {
      return primary;
    }
  }
  return DEFAULT_LANGUAGE;
}
