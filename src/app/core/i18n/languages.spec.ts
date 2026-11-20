import { resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('prefers the stored choice', () => {
    expect(resolveLanguage('bg', ['en-US'])).toBe('bg');
  });

  it('ignores an unknown stored value', () => {
    expect(resolveLanguage('xx', ['bg'])).toBe('bg');
  });

  it('takes the first browser language we have, matched by primary subtag', () => {
    expect(resolveLanguage(null, ['de-DE', 'BG-bg', 'en'])).toBe('bg');
  });

  it('falls back to English', () => {
    expect(resolveLanguage(null, ['de', 'fr'])).toBe('en');
    expect(resolveLanguage(undefined, [])).toBe('en');
  });
});
