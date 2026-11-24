import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL, Me, apiUrl } from '../../../core/api/api';
import { problemCode, toProblem } from '../../../core/api/problem';
import { ProblemMessages } from '../../../core/api/problem-messages';
import { SetupStatus } from '../../../core/setup/setup-status';
import { Button } from '../../../ui/button/button';
import { Segment, mergeConfiguration } from '../merged-configuration';
import { SetupApi } from '../setup-api';
import { action } from '../../../ui/action/action';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { SetupStore } from '../setup.store';

/**
 * Every value with a link back to its step, the merged result (the server's configuration plus
 * this setup's values), and Finish.
 */
@Component({
  selector: 'dulo-review-step',
  imports: [Button, RouterLink, SetupStep, TranslocoPipe],
  templateUrl: './review.step.html',
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStep {
  private readonly api = inject(SetupApi);
  private readonly base = inject(API_BASE_URL);
  private readonly router = inject(Router);
  private readonly navigator = inject(SetupNavigator);
  private readonly problems = inject(ProblemMessages);
  private readonly transloco = inject(TranslocoService);
  private readonly status = inject(SetupStatus);
  protected readonly store = inject(SetupStore);

  protected readonly me = httpResource<Me>(() => apiUrl(this.base, '/me'));
  protected readonly account = computed(() => {
    const me = this.me.hasValue() ? this.me.value() : null;
    return me ? (me.displayName ?? me.email ?? me.id) : null;
  });
  protected readonly enabledFeatures = computed(() => this.store.enabledFeatures());
  protected readonly registrationMode = computed(() => this.store.defaults()?.registrationMode);

  protected readonly resultOpen = signal(false);
  /** Stays true once opened, so closing and opening again doesn't reload. */
  private readonly resultRequested = signal(false);
  /** The server's configuration and the YAML library, loaded together the first time it opens. */
  private readonly server = resource({
    params: () => (this.resultRequested() ? { token: this.store.token() } : undefined),
    loader: async ({ params }) => {
      const [configuration, yaml] = await Promise.all([
        this.api.configuration(params.token),
        import('yaml'),
      ]);
      return { configuration, yaml };
    },
  });
  protected readonly result = computed<Segment[] | null>(() => {
    if (!this.server.hasValue()) {
      return null;
    }
    const { configuration, yaml } = this.server.value();
    const defaults = this.store.defaults();
    try {
      return mergeConfiguration(yaml, configuration, {
        treeName: this.store.name().trim(),
        description: this.store.description().trim() || null,
        account: this.me.hasValue() ? this.me.value() : null,
        features: defaults?.features ?? [],
        enabled: this.store.features(),
        roles: defaults?.roles ?? [],
      });
    } catch {
      // Show the server's part as it came rather than nothing.
      return [{ kind: 'text', text: configuration }];
    }
  });
  protected readonly resultError = computed(() => {
    const error = this.server.error();
    return error ? this.problems.message(error) : null;
  });
  protected toggleResult(): void {
    this.resultOpen.update((open) => !open);
    this.resultRequested.set(true);
  }

  protected reloadResult(): void {
    this.server.reload();
  }
  protected readonly error = signal<string | null>(null);
  protected readonly alreadyDone = signal(false);

  protected readonly finish = action(async () => {
    this.error.set(null);
    try {
      const tree = await this.api.complete(this.store.token(), {
        name: this.store.name().trim(),
        description: this.store.description().trim() || null,
        enabledFeatures: this.store.enabledFeatures(),
      });
      this.store.finish(tree.name);
      this.status.markCompleted();
      await this.router.navigateByUrl('/setup/done');
    } catch (error) {
      await this.handle(error);
    }
  });

  private async handle(error: unknown): Promise<void> {
    const problem = toProblem(error);
    const message = this.problems.message(problem);
    switch (problemCode(problem) ?? problem.status) {
      case 'unauthorized':
      case 401:
        await this.navigator.fail('sign-in', this.transloco.translate('setup.review.signInAgain'));
        return;
      case 'invalid-setup-token':
        this.store.rejectToken();
        await this.navigator.fail('token', message);
        return;
      case 'setup-completed':
        this.store.clear();
        this.status.markCompleted();
        this.alreadyDone.set(true);
        this.error.set(message);
        return;
      default:
        this.error.set(problem.detail ? `${message} ${problem.detail}` : message);
    }
  }
}
