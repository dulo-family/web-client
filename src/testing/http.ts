/** Lets pending promises and timers of zero delay run, e.g. an async interceptor step. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
