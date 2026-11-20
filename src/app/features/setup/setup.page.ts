import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService, translateObjectSignal } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { RailStep, StepRail } from '../../ui/step-rail/step-rail';
import { Wordmark } from '../../ui/wordmark/wordmark';
import { isSetupStep } from './setup.guards';
import { SETUP_STEPS, SetupStepId, SetupStore } from './setup.store';
import { SetupNavigator } from './setup-navigator';

/** The wizard's shell: the step list (a progress bar on small screens) and the current step. */
@Component({
  selector: 'dulo-setup-page',
  imports: [RouterOutlet, StepRail, TranslocoPipe, Wordmark],
  templateUrl: './setup.page.html',
  styleUrl: './setup.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPage {
  private readonly router = inject(Router);
  private readonly store = inject(SetupStore);
  private readonly navigator = inject(SetupNavigator);
  private readonly transloco = inject(TranslocoService);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly labels = translateObjectSignal('setup.steps');

  protected readonly total = SETUP_STEPS.length;
  protected readonly railOpen = signal(false);
  protected readonly current = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.stepOf(this.router.url)),
      startWith(this.stepOf(this.router.url)),
    ),
    { initialValue: null },
  );
  protected readonly currentIndex = computed(() => {
    const current = this.current();
    return current ? SETUP_STEPS.indexOf(current) : 0;
  });
  protected readonly currentLabel = computed(() => this.label(SETUP_STEPS[this.currentIndex()]));
  protected readonly steps = computed<RailStep[]>(() => {
    const current = this.currentIndex();
    const furthest = this.store.furthest();
    const validity = this.store.validity();
    return SETUP_STEPS.map((id, index) => ({
      id,
      label: this.label(id),
      state: index === current ? 'current' : index < furthest && validity[id] ? 'done' : 'upcoming',
      reachable: index <= furthest && this.store.firstInvalidBefore(id) === null,
    }));
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.railOpen.set(false);
        const step = this.stepOf(this.router.url);
        if (step) {
          void this.announcer.announce(
            this.transloco.translate('setup.progress', {
              current: SETUP_STEPS.indexOf(step) + 1,
              total: this.total,
              name: this.label(step),
            }),
          );
        }
      });
  }

  protected open(step: string): void {
    if (isSetupStep(step)) {
      void this.navigator.goTo(step);
    }
  }

  private label(step: SetupStepId): string {
    return (this.labels() as Record<string, string> | undefined)?.[step] ?? step;
  }

  private stepOf(url: string): SetupStepId | null {
    const step = url.split(/[?#]/)[0].split('/')[2];
    return isSetupStep(step) ? step : null;
  }
}
