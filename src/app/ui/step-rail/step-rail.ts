import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type StepState = 'done' | 'current' | 'upcoming';

export interface RailStep {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  /** Whether the step can be opened from the rail. */
  readonly reachable: boolean;
}

/** A vertical list of steps marked done, current or upcoming; reachable steps can be opened. */
@Component({
  selector: 'dulo-step-rail',
  templateUrl: './step-rail.html',
  styleUrl: './step-rail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepRail {
  readonly steps = input.required<readonly RailStep[]>();
  /** Screen reader text for done steps, e.g. "done". */
  readonly doneLabel = input.required<string>();
  readonly selected = output<string>();
}
