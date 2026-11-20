import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SetupStepId, SetupStore } from './setup.store';

/** Moves between the wizard's steps. */
@Injectable({ providedIn: 'root' })
export class SetupNavigator {
  private readonly router = inject(Router);
  private readonly store = inject(SetupStore);

  /** Leaves `step` for the next one; its returned error, if any, is dealt with. */
  async next(step: SetupStepId): Promise<void> {
    if (this.store.stepError()?.step === step) {
      this.store.stepError.set(null);
    }
    const next = this.store.next(step);
    if (next) {
      await this.goTo(next);
    }
  }

  async goTo(step: SetupStepId): Promise<void> {
    await this.router.navigate(['/setup', step]);
  }

  /** Sends the user back to `step` with a message about what went wrong there. */
  async fail(step: SetupStepId, message: string): Promise<void> {
    this.store.stepError.set({ step, message });
    await this.goTo(step);
  }
}
