import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL, IdentityProvider, Me, apiUrl } from '../../../core/api/api';
import { ProblemMessages } from '../../../core/api/problem-messages';
import { AuthService } from '../../../core/auth/auth.service';
import { Button } from '../../../ui/button/button';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { SetupStore } from '../setup.store';

const RETURN_TO = '/setup/sign-in';

/** Signs in the person doing the setup, who becomes root. */
@Component({
  selector: 'dulo-sign-in-step',
  imports: [Button, SetupStep, TranslocoPipe],
  templateUrl: './sign-in.step.html',
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInStep {
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SetupStore);
  private readonly navigator = inject(SetupNavigator);
  private readonly problems = inject(ProblemMessages);
  private readonly transloco = inject(TranslocoService);
  protected readonly auth = inject(AuthService);

  protected readonly providers = httpResource<IdentityProvider[]>(() =>
    this.auth.signedIn() ? undefined : apiUrl(this.base, '/identity-providers'),
  );
  protected readonly me = httpResource<Me>(() =>
    this.auth.signedIn() ? apiUrl(this.base, '/me') : undefined,
  );
  protected readonly name = computed(() => {
    const me = this.me.hasValue() ? this.me.value() : null;
    return me ? (me.displayName ?? me.email ?? me.id) : null;
  });
  protected readonly providersError = computed(() => {
    const error = this.providers.error();
    return error ? this.problems.message(error) : null;
  });
  protected readonly starting = signal(false);

  protected async signIn(provider: IdentityProvider): Promise<void> {
    this.starting.set(true);
    await this.auth.signIn(provider.id, RETURN_TO);
  }

  protected async useAnotherAccount(): Promise<void> {
    await this.auth.signOut(RETURN_TO);
  }

  protected async next(): Promise<void> {
    if (this.auth.signedIn()) {
      await this.navigator.next('sign-in');
    } else {
      this.store.stepError.set({
        step: 'sign-in',
        message: this.transloco.translate('setup.signIn.required'),
      });
    }
  }
}
