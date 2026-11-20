import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemePreference, ThemeService } from '../../core/theme/theme.service';

/** System / light / dark as a segmented control built on native radio buttons. */
@Component({
  selector: 'dulo-theme-toggle',
  imports: [TranslocoPipe],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);

  protected readonly options: readonly ThemePreference[] = ['system', 'light', 'dark'];
}
