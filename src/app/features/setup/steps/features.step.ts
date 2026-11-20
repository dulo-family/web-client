import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Toggle } from '../../../ui/toggle/toggle';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { SetupStore } from '../setup.store';

/** Switches from the defaults; features the server configuration forces are locked. */
@Component({
  selector: 'dulo-features-step',
  imports: [SetupStep, Toggle, TranslocoPipe],
  template: `
    <dulo-setup-step
      step="features"
      [title]="'setup.features.title' | transloco"
      (next)="navigator.next('features')"
    >
      <p class="lead">{{ 'setup.features.intro' | transloco }}</p>
      <ul class="list">
        @for (feature of features(); track feature.key; let first = $first) {
          <li>
            <dulo-toggle
              [initialFocus]="first"
              [label]="'feature.' + feature.key + '.name' | transloco"
              [description]="'feature.' + feature.key + '.description' | transloco"
              [checked]="store.features()[feature.key] ?? feature.enabled"
              [disabled]="feature.locked"
              (checkedChange)="store.setFeature(feature.key, $event)"
            />
            @if (feature.locked) {
              <p class="locked">{{ 'setup.features.locked' | transloco }}</p>
            }
          </li>
        }
      </ul>
    </dulo-setup-step>
  `,
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesStep {
  protected readonly navigator = inject(SetupNavigator);
  protected readonly store = inject(SetupStore);
  protected readonly features = computed(() => this.store.defaults()?.features ?? []);
}
