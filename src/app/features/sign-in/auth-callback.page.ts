import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService, SIGN_IN_PATH } from '../../core/auth/auth.service';

/** The redirect target of the sign-in: exchanges the code, then returns where the user started. */
@Component({
  selector: 'dulo-auth-callback-page',
  imports: [TranslocoPipe],
  template: `<p class="status" role="status">{{ 'auth.signingIn' | transloco }}</p>`,
  styles: `
    .status {
      padding: var(--space-8) var(--space-4);
      color: var(--color-text-muted);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  constructor() {
    void this.complete();
  }

  private async complete(): Promise<void> {
    let target: string;
    try {
      target = await this.auth.completeSignIn({
        code: this.query.get('code'),
        state: this.query.get('state'),
        error: this.query.get('error'),
      });
    } catch {
      target = `${SIGN_IN_PATH}?error=sign-in-failed`;
    }
    await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
