import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows the system when nothing is stored', () => {
    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('system');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('applies the stored theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');

    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });

  it('stores and applies a chosen theme', () => {
    const theme = TestBed.inject(ThemeService);

    theme.set('light');

    expect(theme.preference()).toBe('light');
    expect(root.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('removes the attribute and the stored value for system', () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('dark');

    theme.set('system');

    expect(root.dataset['theme']).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const theme = TestBed.inject(ThemeService);

    theme.set('dark');

    expect(theme.preference()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
  });
});
