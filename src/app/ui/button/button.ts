import { Directive, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'medium' | 'large';

/** Styles a `<button>` or `<a>` as a button (styles in `src/styles/button.css`). */
@Directive({
  selector: 'button[duloButton], a[duloButton]',
  host: {
    class: 'button',
    '[class.button--secondary]': 'variant() === "secondary"',
    '[class.button--large]': 'size() === "large"',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('medium');
}
