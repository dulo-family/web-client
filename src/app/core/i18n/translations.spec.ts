import MessageFormat from '@messageformat/core';
import bg from '../../../../public/i18n/bg.json';
import en from '../../../../public/i18n/en.json';
import { LANGUAGE_IDS, LanguageId } from './languages';

const translations: Record<LanguageId, object> = { en, bg };

/** Flattens nested translations to `{ 'a.b.c': message }`. */
function flatten(tree: object, prefix = ''): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path).forEach((leaf, leafPath) => entries.set(leafPath, leaf));
    } else {
      entries.set(path, value);
    }
  }
  return entries;
}

describe('translations', () => {
  it('has a file for every language', () => {
    expect(Object.keys(translations).sort()).toEqual([...LANGUAGE_IDS].sort());
  });

  for (const language of LANGUAGE_IDS) {
    describe(language, () => {
      const messages = flatten(translations[language]);

      it('has the same keys as English', () => {
        expect([...messages.keys()].sort()).toEqual([...flatten(en).keys()].sort());
      });

      it('has only non-empty string messages that parse as ICU MessageFormat', () => {
        const messageFormat = new MessageFormat(language);
        for (const [key, message] of messages) {
          expect(typeof message, key).toBe('string');
          expect((message as string).trim(), key).not.toBe('');
          expect(() => messageFormat.compile(message as string), key).not.toThrow();
        }
      });
    });
  }
});
