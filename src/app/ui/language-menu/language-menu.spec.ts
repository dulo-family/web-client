import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../testing/i18n';
import { LocaleService } from '../../core/i18n/locale.service';
import { LanguageMenu } from './language-menu';

describe('LanguageMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideI18nTesting()] });
  });

  it('shows the current language and switches to the chosen one', async () => {
    const fixture = TestBed.createComponent(LanguageMenu);
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(trigger.textContent).toContain('Language:');
    expect(trigger.textContent).toContain('English');

    trigger.click();
    await fixture.whenStable();
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
    expect(items.map((item) => item.textContent?.trim())).toEqual(['English', 'Български']);
    expect(items[0].getAttribute('aria-checked')).toBe('true');

    items[1].click();
    await fixture.whenStable();

    expect(TestBed.inject(LocaleService).active()).toBe('bg');
    expect(trigger.textContent).toContain('Език:');
    expect(trigger.textContent).toContain('Български');
  });
});
