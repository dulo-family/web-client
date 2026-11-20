import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { isProblem } from '../../../core/api/problem';
import { ProblemMessages } from '../../../core/api/problem-messages';
import { TextField } from '../../../ui/text-field/text-field';
import { SetupApi } from '../setup-api';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { SetupStore } from '../setup.store';

/** Checks the setup token with `GET /setup/defaults` and keeps the defaults. */
@Component({
  selector: 'dulo-token-step',
  imports: [SetupStep, TextField, TranslocoPipe],
  template: `
    <dulo-setup-step
      step="token"
      [title]="'setup.token.title' | transloco"
      [busy]="busy()"
      (next)="check()"
    >
      <dulo-text-field
        [(value)]="token"
        [label]="'setup.token.label' | transloco"
        [hint]="'setup.token.hint' | transloco"
        [error]="error()"
        [monospace]="true"
        [spellcheck]="false"
      />
    </dulo-setup-step>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenStep {
  private readonly api = inject(SetupApi);
  private readonly store = inject(SetupStore);
  private readonly navigator = inject(SetupNavigator);
  private readonly problems = inject(ProblemMessages);
  private readonly transloco = inject(TranslocoService);

  protected readonly token = signal(this.store.token());
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async check(): Promise<void> {
    const token = this.token().trim();
    if (!token) {
      this.error.set(this.transloco.translate('setup.token.required'));
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.store.acceptToken(token, await this.api.defaults(token));
      await this.navigator.next('token');
    } catch (error) {
      this.error.set(
        isProblem(error, 'invalid-setup-token')
          ? this.transloco.translate('setup.token.invalid')
          : this.problems.message(error),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
