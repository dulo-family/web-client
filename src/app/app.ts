import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageMenu } from './ui/language-menu/language-menu';
import { ThemeToggle } from './ui/theme-toggle/theme-toggle';

@Component({
  selector: 'dulo-root',
  imports: [RouterOutlet, LanguageMenu, ThemeToggle],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
