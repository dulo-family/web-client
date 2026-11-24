import { DOCUMENT, DestroyRef, Signal, inject, signal } from '@angular/core';

/** What a button or form does, run once at a time. Call it to run it. */
export interface Action<A extends unknown[] = []> {
  (...args: A): Promise<void>;
  /** True while it runs: disable its button with it. */
  readonly busy: Signal<boolean>;
}

export interface ActionOptions {
  /**
   * The action leaves the page (a redirect to the identity provider, say), so it stays busy once
   * it has run, until the browser shows the page again from its back/forward cache.
   */
  readonly leavesPage?: boolean;
}

/**
 * Wraps what a button or form does, so a double click or a second Enter doesn't do it twice: while
 * it runs (including the navigation it ends with), `busy` is true and further calls are ignored.
 * When it fails, it can be tried again. Create it in an injection context, e.g. a field.
 */
export function action<A extends unknown[] = []>(
  run: (...args: A) => unknown,
  options: ActionOptions = {},
): Action<A> {
  const busy = signal(false);

  if (options.leavesPage) {
    const window = inject(DOCUMENT).defaultView;
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        busy.set(false);
      }
    };
    window?.addEventListener('pageshow', restore);
    inject(DestroyRef).onDestroy(() => window?.removeEventListener('pageshow', restore));
  }

  const call = async (...args: A): Promise<void> => {
    if (busy()) {
      return;
    }
    busy.set(true);
    let leaving = false;
    try {
      await run(...args);
      leaving = options.leavesPage === true;
    } finally {
      if (!leaving) {
        busy.set(false);
      }
    }
  };
  return Object.assign(call, { busy: busy.asReadonly() });
}
