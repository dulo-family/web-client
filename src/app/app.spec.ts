import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '../testing/i18n';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideI18nTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('shows the language and theme controls above the page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('header dulo-language-menu')).not.toBeNull();
    expect(element.querySelector('header dulo-theme-toggle')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });
});
