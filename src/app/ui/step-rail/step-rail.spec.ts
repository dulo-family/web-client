import { TestBed } from '@angular/core/testing';
import { RailStep, StepRail } from './step-rail';

describe('StepRail', () => {
  it('marks steps and lets reachable ones be opened', async () => {
    const steps: RailStep[] = [
      { id: 'a', label: 'First', state: 'done', reachable: true },
      { id: 'b', label: 'Second', state: 'current', reachable: true },
      { id: 'c', label: 'Third', state: 'upcoming', reachable: false },
    ];
    const fixture = TestBed.createComponent(StepRail);
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('doneLabel', 'done');
    const selected: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => selected.push(id));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const buttons = element.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain('First');
    expect(buttons[0].textContent).toContain('(done)');
    expect(element.querySelector('[aria-current="step"]')?.textContent).toContain('Second');

    buttons[0].click();
    expect(selected).toEqual(['a']);
  });
});
