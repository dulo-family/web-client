import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('checks the current preference and changes it on select', async () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const radio = (value: string) =>
      element.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;

    expect(radio('system').checked).toBe(true);

    radio('dark').click();
    await fixture.whenStable();

    expect(TestBed.inject(ThemeService).preference()).toBe('dark');
    expect(radio('dark').checked).toBe(true);
    expect(radio('dark').closest('label')!.classList).toContain('selected');
  });
});
