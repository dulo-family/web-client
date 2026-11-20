import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { API_BASE_URL, Me, apiUrl } from '../../core/api/api';
import { AuthService } from '../../core/auth/auth.service';
import { Button } from '../../ui/button/button';
import { Wordmark } from '../../ui/wordmark/wordmark';

/** Placeholder home: who is signed in, with sign-in and sign-out. The real views come later. */
@Component({
  selector: 'dulo-home-page',
  imports: [Button, RouterLink, TranslocoPipe, Wordmark],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly base = inject(API_BASE_URL);
  protected readonly auth = inject(AuthService);

  protected readonly me = httpResource<Me>(() =>
    this.auth.signedIn() ? apiUrl(this.base, '/me') : undefined,
  );
  protected readonly name = computed(() => {
    const me = this.me.hasValue() ? this.me.value() : null;
    return me ? (me.displayName ?? me.email ?? me.id) : null;
  });
}
