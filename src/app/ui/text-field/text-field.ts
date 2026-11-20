import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  numberAttribute,
} from '@angular/core';

let nextId = 0;

/**
 * A large labeled text input or textarea with an optional hint, error and character counter. The
 * field carries `data-autofocus`, so a setup step focuses it when the step opens.
 */
@Component({
  selector: 'dulo-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly multiline = input(false);
  readonly maxLength = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value == null ? undefined : numberAttribute(value)),
  });
  /** Shows "length / maxLength" under the field. */
  readonly counter = input(false);
  readonly monospace = input(false);
  readonly autocomplete = input('off');
  readonly spellcheck = input(true);

  protected readonly id = `dulo-text-field-${nextId++}`;
  protected readonly describedBy = computed(
    () =>
      [
        this.hint() ? `${this.id}-hint` : null,
        this.error() ? `${this.id}-error` : null,
        this.counter() ? `${this.id}-counter` : null,
      ]
        .filter(Boolean)
        .join(' ') || null,
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }
}
