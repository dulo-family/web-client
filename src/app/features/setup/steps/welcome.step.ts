import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';

@Component({
  selector: 'dulo-welcome-step',
  imports: [SetupStep, TranslocoPipe],
  template: `
    <dulo-setup-step
      step="welcome"
      [title]="'setup.welcome.title' | transloco"
      [continueLabel]="'setup.welcome.start' | transloco"
      (next)="navigator.next('welcome')"
    >
      <p class="lead">{{ 'setup.welcome.intro' | transloco }}</p>
      <p>{{ 'setup.welcome.token' | transloco }}</p>
      <pre class="log">Initial setup pending, setup token …</pre>
    </dulo-setup-step>
  `,
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeStep {
  protected readonly navigator = inject(SetupNavigator);
}
