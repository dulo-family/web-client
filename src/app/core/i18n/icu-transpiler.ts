import {
  EnvironmentProviders,
  Injectable,
  isDevMode,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  DefaultTranspiler,
  TRANSLOCO_TRANSPILER,
  TranspileParams,
  getValue,
  setValue,
} from '@jsverse/transloco';
import { IntlMessageFormat, PrimitiveType } from 'intl-messageformat';
import { DEFAULT_LANGUAGE } from './languages';

/** Message parameters; translations only use plain values. */
type Params = Record<string, PrimitiveType>;

/**
 * Formats translations as ICU MessageFormat with FormatJS. It interprets each message instead of
 * compiling it to code, so the Content Security Policy needs no `'unsafe-eval'`.
 */
@Injectable()
export class IcuTranspiler extends DefaultTranspiler {
  private locale: string = DEFAULT_LANGUAGE;
  private readonly formatters = new Map<string, IntlMessageFormat>();

  override transpile({ value, params = {}, translation, key }: TranspileParams): unknown {
    if (!value) {
      return value;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      // A whole subtree, e.g. translateObject('setup.steps'): format the entries params name.
      const tree = value as Record<string, unknown>;
      let result = tree;
      for (const path of Object.keys(params)) {
        const message: unknown = getValue(tree, path);
        if (typeof message === 'string') {
          result = setValue(result, path, this.format(message, params[path] as Params)) as Record<
            string,
            unknown
          >;
        }
      }
      return result;
    }
    if (typeof value !== 'string') {
      return value;
    }
    // Transloco's own {{ }} syntax isn't used, but the base class also resolves key references.
    const message = super.transpile({ value, params, translation, key }) as string;
    return this.format(message, params as Params);
  }

  onLangChanged(lang: string): void {
    this.locale = lang;
  }

  private format(message: string, params: Params = {}): string {
    const id = `${this.locale}\u0000${message}`;
    let formatter = this.formatters.get(id);
    try {
      if (!formatter) {
        // Tags such as <b> are plain text, as in the translation files.
        formatter = new IntlMessageFormat(message, this.locale, undefined, { ignoreTag: true });
        this.formatters.set(id, formatter);
      }
      const formatted = formatter.format<string>(params);
      return Array.isArray(formatted) ? formatted.join('') : formatted;
    } catch (error) {
      // A missing parameter or a broken message: show the message rather than break the page.
      if (isDevMode()) {
        console.error(`Can’t format the message "${message}"`, error);
      }
      return message;
    }
  }
}

/** Transloco formats messages with {@link IcuTranspiler}. */
export function provideIcuTranspiler(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: TRANSLOCO_TRANSPILER, useClass: IcuTranspiler }]);
}
