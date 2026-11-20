import { TestBed } from '@angular/core/testing';
import { TextField } from './text-field';

describe('TextField', () => {
  it('labels the field, links hint, error and counter, and updates the value', async () => {
    const fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Tree name');
    fixture.componentRef.setInput('hint', 'A hint');
    fixture.componentRef.setInput('maxLength', 10);
    fixture.componentRef.setInput('counter', true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;

    expect(element.querySelector(`label[for="${input.id}"]`)?.textContent).toBe('Tree name');
    expect(input.getAttribute('maxlength')).toBe('10');

    input.value = 'Smiths';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('Smiths');
    expect(element.textContent).toContain('6 / 10');

    fixture.componentRef.setInput('error', 'Too short');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby')!.split(' ');
    expect(describedBy.map((id) => element.querySelector(`#${id}`)?.textContent)).toEqual([
      'A hint',
      'Too short',
      '6 / 10',
    ]);
  });

  it('can be a textarea', async () => {
    const fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Description');
    fixture.componentRef.setInput('multiline', true);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('textarea')).not.toBeNull();
  });
});
