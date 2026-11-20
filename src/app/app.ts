import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeToggle } from './ui/theme-toggle/theme-toggle';
import { Wordmark } from './ui/wordmark/wordmark';

@Component({
  selector: 'dulo-root',
  imports: [RouterOutlet, ThemeToggle, Wordmark],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
