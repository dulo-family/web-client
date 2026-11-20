import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SetupDefaults } from './setup-api';

export const SETUP_STEPS = [
  'welcome',
  'token',
  'sign-in',
  'name',
  'description',
  'features',
  'access',
  'review',
] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number];

export const SETUP_STORAGE_KEY = 'dulo.setup';
export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

interface PersistedSetup {
  readonly token: string;
  readonly defaults: SetupDefaults | null;
  readonly name: string;
  readonly description: string;
  readonly features: Record<string, boolean>;
  readonly furthest: number;
}

/** A message a later step sends back to the step it belongs to. */
export interface StepError {
  readonly step: SetupStepId;
  readonly message: string;
}

/**
 * The wizard's state. It's mirrored to sessionStorage, so it survives the full-page redirects of
 * the sign-in step, and cleared once the setup is done.
 */
@Injectable({ providedIn: 'root' })
export class SetupStore {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(DOCUMENT).defaultView?.sessionStorage;

  readonly token = signal('');
  readonly defaults = signal<SetupDefaults | null>(null);
  readonly name = signal('');
  readonly description = signal('');
  readonly features = signal<Record<string, boolean>>({});
  /** The index of the furthest step opened so far. */
  readonly furthest = signal(0);
  readonly stepError = signal<StepError | null>(null);
  /** The tree's name once the setup is done; not stored. */
  readonly finishedTreeName = signal<string | null>(null);

  readonly validity = computed<Record<SetupStepId, boolean>>(() => {
    const name = this.name().trim().length;
    return {
      welcome: true,
      token: this.defaults() !== null,
      'sign-in': this.auth.signedIn(),
      name: name >= 1 && name <= NAME_MAX_LENGTH,
      description: this.description().trim().length <= DESCRIPTION_MAX_LENGTH,
      features: true,
      access: true,
      review: true,
    };
  });

  readonly enabledFeatures = computed(() =>
    Object.entries(this.features())
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  );

  constructor() {
    this.restore();
    effect(() => this.persist());
  }

  /** The first step before `step` that isn't valid yet, or null when `step` may be opened. */
  firstInvalidBefore(step: SetupStepId): SetupStepId | null {
    const validity = this.validity();
    return SETUP_STEPS.slice(0, SETUP_STEPS.indexOf(step)).find((id) => !validity[id]) ?? null;
  }

  /** Where to continue: the furthest step opened, or the first one that still needs input. */
  resumeStep(): SetupStepId {
    const furthest = SETUP_STEPS[this.furthest()];
    return this.firstInvalidBefore(furthest) ?? furthest;
  }

  reach(step: SetupStepId): void {
    this.furthest.update((furthest) => Math.max(furthest, SETUP_STEPS.indexOf(step)));
  }

  next(step: SetupStepId): SetupStepId | null {
    return SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null;
  }

  previous(step: SetupStepId): SetupStepId | null {
    return SETUP_STEPS[SETUP_STEPS.indexOf(step) - 1] ?? null;
  }

  /** The token was accepted: keep it with the defaults, and start the features from them. */
  acceptToken(token: string, defaults: SetupDefaults): void {
    const tokenChanged = token !== this.token();
    this.token.set(token);
    this.defaults.set(defaults);
    if (tokenChanged || Object.keys(this.features()).length === 0) {
      this.features.set(
        Object.fromEntries(defaults.features.map((feature) => [feature.key, feature.enabled])),
      );
    }
  }

  /** The server no longer accepts the token. */
  rejectToken(): void {
    this.defaults.set(null);
  }

  setFeature(key: string, enabled: boolean): void {
    this.features.update((features) => ({ ...features, [key]: enabled }));
  }

  /** The setup is done: forget everything but the tree's name. */
  finish(treeName: string): void {
    this.clear();
    this.finishedTreeName.set(treeName);
  }

  clear(): void {
    this.token.set('');
    this.defaults.set(null);
    this.name.set('');
    this.description.set('');
    this.features.set({});
    this.furthest.set(0);
    this.stepError.set(null);
    try {
      this.storage?.removeItem(SETUP_STORAGE_KEY);
    } catch {
      // Nothing stored then.
    }
  }

  private persist(): void {
    const state: PersistedSetup = {
      token: this.token(),
      defaults: this.defaults(),
      name: this.name(),
      description: this.description(),
      features: this.features(),
      furthest: this.furthest(),
    };
    if (!state.token && state.furthest === 0) {
      return;
    }
    try {
      this.storage?.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Blocked storage: the progress lasts until the next full-page load.
    }
  }

  private restore(): void {
    let state: Partial<PersistedSetup> | null;
    try {
      const stored = this.storage?.getItem(SETUP_STORAGE_KEY);
      state = stored ? (JSON.parse(stored) as Partial<PersistedSetup>) : null;
    } catch {
      return;
    }
    if (!state) {
      return;
    }
    this.token.set(state.token ?? '');
    this.defaults.set(state.defaults ?? null);
    this.name.set(state.name ?? '');
    this.description.set(state.description ?? '');
    this.features.set(state.features ?? {});
    this.furthest.set(Math.min(Math.max(state.furthest ?? 0, 0), SETUP_STEPS.length - 1));
  }
}
