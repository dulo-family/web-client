import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../../ui/button/button';
import { SetupStepId, SetupStore } from './setup.store';

/**
 * The frame of every setup step: heading, content, Back and Continue. The content sits in a form,
 * so Enter continues. When the step opens, focus moves to its `[data-autofocus]` field, else to
 * the heading.
 */
@Component({
  selector: 'dulo-setup-step',
  imports: [Button, RouterLink, TranslocoPipe],
  templateUrl: './setup-step.html',
  styleUrl: './setup-step.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupStep {
  private readonly store = inject(SetupStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  readonly step = input.required<SetupStepId>();
  readonly title = input.required<string>();
  readonly continueLabel = input<string | null>(null);
  readonly showContinue = input(true);
  readonly busy = input(false);
  readonly next = output<void>();

  protected readonly back = computed(() => this.store.previous(this.step()));
  protected readonly error = computed(() => {
    const error = this.store.stepError();
    return error?.step === this.step() ? error.message : null;
  });

  constructor() {
    afterNextRender(() => {
      const field = this.host.nativeElement.querySelector<HTMLElement>('[data-autofocus]');
      (field ?? this.heading().nativeElement).focus();
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.next.emit();
    }
  }
}
