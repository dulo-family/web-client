import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActionOptions, action } from './action';

describe('action', () => {
  function create<A extends unknown[]>(run: (...args: A) => unknown, options?: ActionOptions) {
    return runInInjectionContext(TestBed.inject(Injector), () => action(run, options));
  }

  function deferred(): { promise: Promise<void>; resolve: () => void; reject: () => void } {
    let resolve!: () => void;
    let reject!: () => void;
    const promise = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = () => no(new Error('failed'));
    });
    return { promise, resolve, reject };
  }

  it('runs once at a time and is busy while it runs', async () => {
    const pending = deferred();
    const run = vi.fn((value: string) => {
      expect(value).toBe('a');
      return pending.promise;
    });
    const save = create(run);

    const first = save('a');
    const second = save('b');
    expect(save.busy()).toBe(true);

    pending.resolve();
    await Promise.all([first, second]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(save.busy()).toBe(false);
  });

  it('can be tried again after it fails', async () => {
    const pending = deferred();
    const run = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    const save = create(run);

    const first = save();
    expect(save.busy()).toBe(true);
    pending.reject();
    await expect(first).rejects.toThrow('failed');

    expect(save.busy()).toBe(false);
    await save();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('stays busy after leaving the page, until the page is shown again from the cache', async () => {
    const leave = create(() => Promise.resolve(), { leavesPage: true });

    await leave();
    expect(leave.busy()).toBe(true);

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    expect(leave.busy()).toBe(true);

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(leave.busy()).toBe(false);
  });

  it('can leave the page again when it failed to', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined);
    const leave = create(run, { leavesPage: true });

    await expect(leave()).rejects.toThrow('failed');
    expect(leave.busy()).toBe(false);

    await leave();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
