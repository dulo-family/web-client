import { TestBed } from '@angular/core/testing';
import { Toggle } from './toggle';

describe('Toggle', () => {
  it('is a labeled switch that flips on click unless disabled', async () => {
    const fixture = TestBed.createComponent(Toggle);
    fixture.componentRef.setInput('label', 'People');
    fixture.componentRef.setInput('description', 'The people in the tree');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('[role="switch"]')!;

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(element.querySelector(`#${button.getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'People',
    );

    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');

    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
  });
});
