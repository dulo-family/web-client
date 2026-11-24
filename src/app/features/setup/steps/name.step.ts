import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { TextField } from '../../../ui/text-field/text-field';
import { action } from '../../../ui/action/action';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { NAME_MAX_LENGTH, SetupStore } from '../setup.store';

@Component({
  selector: 'dulo-name-step',
  imports: [SetupStep, TextField, TranslocoPipe],
  template: `
    <dulo-setup-step step="name" [title]="'setup.name.title' | transloco" [action]="next">
      <dulo-text-field
        [(value)]="name"
        [label]="'setup.name.label' | transloco"
        [hint]="'setup.name.hint' | transloco"
        [error]="error()"
        [maxLength]="maxLength"
        autocomplete="off"
      />
    </dulo-setup-step>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameStep {
  private readonly store = inject(SetupStore);
  private readonly navigator = inject(SetupNavigator);
  private readonly required = translateSignal('setup.name.required');
  private readonly attempted = signal(false);

  protected readonly name = this.store.name;
  protected readonly maxLength = NAME_MAX_LENGTH;
  protected readonly error = computed(() =>
    this.attempted() && !this.store.validity().name ? this.required() : null,
  );

  protected readonly next = action(async () => {
    this.attempted.set(true);
    if (this.store.validity().name) {
      await this.navigator.next('name');
    }
  });
}
