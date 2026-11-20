import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Problem, problemCode, toProblem } from './problem';

/**
 * A message for a problem in the active language: the translation `problem.<code>`, else the
 * server's (English) title, else a generic message.
 */
@Injectable({ providedIn: 'root' })
export class ProblemMessages {
  private readonly transloco = inject(TranslocoService);

  message(problemOrError: Problem | unknown): string {
    const problem = isProblem(problemOrError) ? problemOrError : toProblem(problemOrError);
    const code = problemCode(problem);
    if (code && this.has(`problem.${code}`)) {
      return this.transloco.translate(`problem.${code}`);
    }
    return problem.title ?? this.transloco.translate('problem.unknown');
  }

  private has(key: string): boolean {
    const config = this.transloco.config;
    return [this.transloco.getActiveLang(), config.fallbackLang]
      .flat()
      .some((lang) => typeof lang === 'string' && key in this.transloco.getTranslation(lang));
  }
}

function isProblem(value: unknown): value is Problem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Problem).type === 'string' &&
    typeof (value as Problem).status === 'number'
  );
}
