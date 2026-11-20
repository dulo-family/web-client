import { HttpErrorResponse } from '@angular/common/http';

/** An RFC 9457 problem as the server sends it, or one made up for errors that aren't problems. */
export interface Problem {
  readonly type: string;
  readonly status: number;
  readonly title?: string;
  readonly detail?: string;
  /** Extension members, e.g. `users` of `role-in-use`. */
  readonly [extension: string]: unknown;
}

export const PROBLEM_TYPE_PREFIX = 'urn:dulo:problem:';
/** The request never got an answer: offline, server down or blocked by CORS. */
export const NETWORK_PROBLEM = `${PROBLEM_TYPE_PREFIX}network`;
/** An answer that isn't a problem document. */
export const UNKNOWN_PROBLEM = 'about:blank';

/** Turns any error from HttpClient into a problem. */
export function toProblem(error: unknown): Problem {
  if (!(error instanceof HttpErrorResponse)) {
    return { type: UNKNOWN_PROBLEM, status: 0 };
  }
  if (error.status === 0) {
    return { type: NETWORK_PROBLEM, status: 0 };
  }
  const body: unknown = error.error;
  if (isProblemBody(body)) {
    return { ...body, status: body.status ?? error.status };
  }
  return { type: UNKNOWN_PROBLEM, status: error.status, title: error.statusText || undefined };
}

/** The short name of a Dulo problem type (`setup-required`), or null for other types. */
export function problemCode(problem: Problem): string | null {
  return problem.type.startsWith(PROBLEM_TYPE_PREFIX)
    ? problem.type.slice(PROBLEM_TYPE_PREFIX.length)
    : null;
}

export function isProblem(error: unknown, code: string): boolean {
  return problemCode(toProblem(error)) === code;
}

function isProblemBody(body: unknown): body is Problem & { status?: number } {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { type?: unknown }).type === 'string'
  );
}
