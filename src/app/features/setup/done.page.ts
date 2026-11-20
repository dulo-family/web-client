import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../../ui/button/button';
import { Wordmark } from '../../ui/wordmark/wordmark';
import { SetupStore } from './setup.store';

/** Shown once after the setup: the tree is ready. */
@Component({
  selector: 'dulo-setup-done-page',
  imports: [Button, RouterLink, TranslocoPipe, Wordmark],
  template: `
    <main class="done">
      <dulo-wordmark class="brand" />
      <h1 #heading tabindex="-1">
        {{ 'setup.done.title' | transloco: { name: store.finishedTreeName() } }}
      </h1>
      <p>{{ 'setup.done.text' | transloco }}</p>
      <a duloButton size="large" routerLink="/">{{ 'setup.done.home' | transloco }}</a>
    </main>
  `,
  styles: `
    .done {
      display: grid;
      justify-items: center;
      gap: var(--space-5);
      max-width: 36rem;
      margin: 0 auto;
      padding: var(--space-8) var(--space-4);
      text-align: center;
      animation: step-in var(--duration-slow) var(--ease-out);
    }

    .brand {
      font-size: var(--text-2xl);
    }

    h1 {
      font-size: var(--text-2xl);
    }

    h1:focus {
      outline: none;
    }

    @keyframes step-in {
      from {
        opacity: 0;
        transform: translateY(var(--space-3));
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupDonePage {
  protected readonly store = inject(SetupStore);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }
}
