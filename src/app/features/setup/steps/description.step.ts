import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TextField } from '../../../ui/text-field/text-field';
import { action } from '../../../ui/action/action';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { DESCRIPTION_MAX_LENGTH, SetupStore } from '../setup.store';

@Component({
  selector: 'dulo-description-step',
  imports: [SetupStep, TextField, TranslocoPipe],
  template: `
    <dulo-setup-step
      step="description"
      [title]="'setup.description.title' | transloco"
      [action]="next"
    >
      <dulo-text-field
        [(value)]="description"
        [label]="'setup.description.label' | transloco"
        [hint]="'setup.description.hint' | transloco"
        [multiline]="true"
        [maxLength]="maxLength"
        [counter]="true"
      />
    </dulo-setup-step>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DescriptionStep {
  private readonly navigator = inject(SetupNavigator);

  protected readonly next = action(() => this.navigator.next('description'));
  protected readonly description = inject(SetupStore).description;
  protected readonly maxLength = DESCRIPTION_MAX_LENGTH;
}
