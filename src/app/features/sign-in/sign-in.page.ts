import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { API_BASE_URL, IdentityProvider, apiUrl } from '../../core/api/api';
import { ProblemMessages } from '../../core/api/problem-messages';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Button } from '../../ui/button/button';
import { Wordmark } from '../../ui/wordmark/wordmark';

/** One button per identity provider; each starts the sign-in with that provider. */
@Component({
  selector: 'dulo-sign-in-page',
  imports: [Button, TranslocoPipe, Wordmark],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly auth = inject(AuthService);
  private readonly problems = inject(ProblemMessages);
  private readonly locale = inject(LocaleService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly base = inject(API_BASE_URL);

  protected readonly failed = this.query.get('error') === 'sign-in-failed';
  protected readonly providers = httpResource<IdentityProvider[]>(() =>
    apiUrl(this.base, '/identity-providers'),
  );
  protected readonly loadError = computed(() => {
    this.locale.active();
    const error = this.providers.error();
    return error ? this.problems.message(error) : null;
  });
  protected readonly starting = signal<string | null>(null);

  protected async signIn(provider: IdentityProvider): Promise<void> {
    this.starting.set(provider.id);
    await this.auth.signIn(provider.id, this.query.get('returnTo') ?? '/');
  }
}
