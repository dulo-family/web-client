import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '../../core/i18n/locale.service';

/** A button with the current language that opens a menu of all languages. */
@Component({
  selector: 'dulo-language-menu',
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItemRadio, TranslocoPipe],
  templateUrl: './language-menu.html',
  styleUrl: './language-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageMenu {
  protected readonly locale = inject(LocaleService);
  protected readonly current = computed(
    () =>
      this.locale.languages.find((language) => language.id === this.locale.active()) ??
      this.locale.languages[0],
  );
}
