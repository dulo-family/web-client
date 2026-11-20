import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { API_BASE_URL, Me, Tree, apiUrl } from '../../core/api/api';
import { ProblemMessages } from '../../core/api/problem-messages';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Button } from '../../ui/button/button';
import { Wordmark } from '../../ui/wordmark/wordmark';

/** Placeholder home: the tree and who is signed in, with sign-out. The real views come later. */
@Component({
  selector: 'dulo-home-page',
  imports: [Button, TranslocoPipe, Wordmark],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly base = inject(API_BASE_URL);
  private readonly problems = inject(ProblemMessages);
  private readonly locale = inject(LocaleService);
  protected readonly auth = inject(AuthService);

  protected readonly tree = httpResource<Tree>(() => apiUrl(this.base, '/tree'));
  protected readonly me = httpResource<Me>(() => apiUrl(this.base, '/me'));

  protected readonly treeValue = computed(() => (this.tree.hasValue() ? this.tree.value() : null));
  protected readonly treeError = computed(() => {
    this.locale.active();
    const error = this.tree.error();
    return error ? this.problems.message(error) : null;
  });
  protected readonly name = computed(() => {
    const me = this.me.hasValue() ? this.me.value() : null;
    return me ? (me.displayName ?? me.email ?? me.id) : null;
  });

  protected reload(): void {
    this.tree.reload();
    this.me.reload();
  }
}
