import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The "Dulo" wordmark, styled like the splash. The logo replaces it later. */
@Component({
  selector: 'dulo-wordmark',
  template: `<span class="wordmark">Dulo</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wordmark {}
