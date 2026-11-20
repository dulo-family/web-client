import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextId = 0;

/** An on/off switch (`role="switch"`) with a label and an optional description. */
@Component({
  selector: 'dulo-toggle',
  template: `
    <button
      type="button"
      role="switch"
      class="switch"
      [id]="id"
      [attr.aria-checked]="checked()"
      [attr.data-autofocus]="initialFocus() ? '' : null"
      [attr.aria-labelledby]="id + '-label'"
      [attr.aria-describedby]="description() ? id + '-description' : null"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
    >
      <span class="thumb"></span>
    </button>
    <span class="text">
      <label class="label" [id]="id + '-label'" [for]="id">{{ label() }}</label>
      @if (description(); as description) {
        <span class="description" [id]="id + '-description'">{{ description }}</span>
      }
    </span>
  `,
  styleUrl: './toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toggle {
  readonly checked = model(false);
  readonly label = input.required<string>();
  readonly description = input<string | null>(null);
  readonly disabled = input(false);
  /** Marks the switch as the field a setup step focuses when it opens. */
  readonly initialFocus = input(false);

  protected readonly id = `dulo-toggle-${nextId++}`;
}
