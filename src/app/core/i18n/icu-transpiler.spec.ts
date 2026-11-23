import { TestBed } from '@angular/core/testing';
import { IcuTranspiler } from './icu-transpiler';

describe('IcuTranspiler', () => {
  let transpiler: IcuTranspiler;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [IcuTranspiler] });
    transpiler = TestBed.inject(IcuTranspiler);
  });

  function transpile(value: unknown, params?: Record<string, unknown>): unknown {
    return transpiler.transpile({ value, params, translation: {}, key: 'test' });
  }

  it('fills in placeholders, plurals and selects', () => {
    expect(transpile('Signed in as {name}', { name: 'Ada' })).toBe('Signed in as Ada');
    const files = '{count, plural, one {# file} other {# files}}';
    expect(transpile(files, { count: 1 })).toBe('1 file');
    expect(transpile(files, { count: 3 })).toBe('3 files');
    expect(transpile('{role, select, admin {Admin} other {Member}}', { role: 'admin' })).toBe(
      'Admin',
    );
  });

  it('formats numbers for the active language', () => {
    const message = '{count, plural, other {# people}}';
    expect(transpile(message, { count: 1500 })).toBe(
      `${new Intl.NumberFormat('en').format(1500)} people`,
    );

    transpiler.onLangChanged('bg');

    expect(transpile(message, { count: 1500 })).toBe(
      `${new Intl.NumberFormat('bg').format(1500)} people`,
    );
  });

  it('keeps tags as text', () => {
    expect(transpile('Press <b>Finish</b>')).toBe('Press <b>Finish</b>');
  });

  it('shows the message as it is when a parameter is missing, and reports it in development', () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(transpile('Signed in as {name}')).toBe('Signed in as {name}');
    expect(report).toHaveBeenCalledWith(
      'Can’t format the message "Signed in as {name}"',
      expect.anything(),
    );
  });

  it('formats the entries of a subtree that parameters name', () => {
    expect(
      transpile({ title: '{name} is ready', text: 'Done' }, { title: { name: 'The Smiths' } }),
    ).toEqual({ title: 'The Smiths is ready', text: 'Done' });
  });

  it('leaves empty values, arrays and other types alone', () => {
    expect(transpile('')).toBe('');
    expect(transpile(['a', 'b'])).toEqual(['a', 'b']);
    expect(transpile(42)).toBe(42);
  });

  it('formats without evaluating code, so the CSP needs no unsafe-eval', () => {
    const original = globalThis.Function;
    globalThis.Function = function () {
      throw new EvalError('Evaluating a string as JavaScript is blocked');
    } as unknown as FunctionConstructor;
    try {
      expect(
        transpile('{count, plural, one {# new person} other {# new people}}', { count: 2 }),
      ).toBe('2 new people');
    } finally {
      globalThis.Function = original;
    }
  });
});
