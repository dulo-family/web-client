import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Placeholder until the setup wizard arrives. */
@Component({
  selector: 'dulo-setup-page',
  imports: [TranslocoPipe],
  template: `
    <main class="setup">
      <h1>{{ 'setup.pending.title' | transloco }}</h1>
      <p>{{ 'setup.pending.text' | transloco }}</p>
    </main>
  `,
  styles: `
    .setup {
      display: grid;
      justify-items: center;
      gap: var(--space-4);
      padding: var(--space-8) var(--space-4);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPage {}
