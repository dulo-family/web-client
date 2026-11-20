import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../../core/theme/theme.service';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
}

/** System / light / dark as a segmented control built on native radio buttons. */
@Component({
  selector: 'dulo-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);

  // English until translations arrive.
  protected readonly options: readonly ThemeOption[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
}
