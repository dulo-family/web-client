import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RoleNamePipe } from '../role-name.pipe';
import { SetupStep } from '../setup-step';
import { SetupNavigator } from '../setup-navigator';
import { SetupStore } from '../setup.store';

/** A read-only summary of who gets access; roles are edited later in the admin screens. */
@Component({
  selector: 'dulo-access-step',
  imports: [RoleNamePipe, SetupStep, TranslocoPipe],
  templateUrl: './access.step.html',
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessStep {
  protected readonly navigator = inject(SetupNavigator);
  private readonly store = inject(SetupStore);

  protected readonly defaults = computed(() => this.store.defaults());
  protected readonly roles = computed(() => this.defaults()?.roles ?? []);
  protected readonly providers = computed(() =>
    (this.defaults()?.identityProviders ?? []).map((provider) => ({
      ...provider,
      mappings: Object.entries(provider.roleMappings),
    })),
  );
}
