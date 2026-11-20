import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '../../../testing/i18n';
import { API_BASE_URL } from '../../core/api/api';
import { AuthService } from '../../core/auth/auth.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  const signedIn = signal(false);
  const signOut = vi.fn();

  beforeEach(() => {
    signedIn.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18nTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: AuthService, useValue: { signedIn, signOut } },
      ],
    });
  });

  it('offers to sign in when signed out', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Dulo');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/sign-in');
    TestBed.inject(HttpTestingController).expectNone('http://api.test/api/v1/me');
  });

  it('shows who is signed in and signs out', async () => {
    signedIn.set(true);
    const fixture = TestBed.createComponent(HomePage);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('http://api.test/api/v1/me').flush({
      id: 'u1',
      displayName: 'Ada',
      status: 'active',
      root: true,
      roles: [],
      permissions: [],
    });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Signed in as Ada');
    element.querySelector('button')!.click();
    expect(signOut).toHaveBeenCalled();
  });
});
