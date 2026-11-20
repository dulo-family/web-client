import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18nTesting } from '../../../testing/i18n';
import { LANGUAGE_STORAGE_KEY, LocaleService } from './locale.service';

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideI18nTesting()] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with the browser language and sets <html lang>', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['bg-BG', 'en']);
    const locale = TestBed.inject(LocaleService);

    await locale.init();

    expect(locale.active()).toBe('bg');
    expect(document.documentElement.lang).toBe('bg');
    expect(TestBed.inject(TranslocoService).translate('theme.dark')).toBe('Тъмна');
  });

  it('starts with the stored language over the browser one', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['bg']);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const locale = TestBed.inject(LocaleService);

    await locale.init();

    expect(locale.active()).toBe('en');
  });

  it('switches, stores the choice and updates <html lang>', () => {
    const locale = TestBed.inject(LocaleService);

    locale.set('bg');

    expect(locale.active()).toBe('bg');
    expect(document.documentElement.lang).toBe('bg');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('bg');
  });

  it('still switches when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const locale = TestBed.inject(LocaleService);

    locale.set('bg');

    expect(locale.active()).toBe('bg');
  });
});
