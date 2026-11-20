import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18nTesting } from '../../../testing/i18n';
import { NETWORK_PROBLEM, UNKNOWN_PROBLEM, isProblem, problemCode, toProblem } from './problem';
import { ProblemMessages } from './problem-messages';

function problemResponse(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, statusText: 'Status text' });
}

describe('toProblem', () => {
  it('reads a problem document, extensions included', () => {
    const problem = toProblem(
      problemResponse(409, {
        type: 'urn:dulo:problem:role-in-use',
        title: 'Role in use',
        status: 409,
        users: ['u1'],
      }),
    );

    expect(problem).toMatchObject({ type: 'urn:dulo:problem:role-in-use', status: 409 });
    expect(problem['users']).toEqual(['u1']);
    expect(problemCode(problem)).toBe('role-in-use');
  });

  it('makes a network problem when there was no answer', () => {
    expect(toProblem(new HttpErrorResponse({ status: 0 })).type).toBe(NETWORK_PROBLEM);
  });

  it('keeps the status of answers that are not problems', () => {
    const problem = toProblem(problemResponse(502, '<html>Bad gateway</html>'));

    expect(problem).toMatchObject({ type: UNKNOWN_PROBLEM, status: 502, title: 'Status text' });
    expect(problemCode(problem)).toBeNull();
  });

  it('matches errors by problem code', () => {
    const error = problemResponse(503, { type: 'urn:dulo:problem:setup-required', status: 503 });

    expect(isProblem(error, 'setup-required')).toBe(true);
    expect(isProblem(error, 'forbidden')).toBe(false);
    expect(isProblem(new Error('boom'), 'setup-required')).toBe(false);
  });
});

describe('ProblemMessages', () => {
  let messages: ProblemMessages;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideI18nTesting()] });
    messages = TestBed.inject(ProblemMessages);
  });

  it('translates Dulo problems by type, not by their English title', () => {
    const error = problemResponse(403, {
      type: 'urn:dulo:problem:invalid-setup-token',
      title: 'Invalid setup token',
      status: 403,
    });

    expect(messages.message(error)).toBe('The setup token is wrong.');
    TestBed.inject(TranslocoService).setActiveLang('bg');
    expect(messages.message(error)).toBe('Кодът за настройка е грешен.');
  });

  it('falls back to the server title for types without a translation', () => {
    const error = problemResponse(418, {
      type: 'urn:dulo:problem:something-new',
      title: 'Something new',
      status: 418,
    });

    expect(messages.message(error)).toBe('Something new');
  });

  it('has messages for network and unknown errors', () => {
    expect(messages.message(new HttpErrorResponse({ status: 0 }))).toContain('Can’t reach');
    expect(messages.message(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
