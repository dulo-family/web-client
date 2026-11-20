import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { settle } from '../../../testing/http';
import { provideI18nTesting } from '../../../testing/i18n';
import { AuthService, SignInError } from '../../core/auth/auth.service';
import { AuthCallbackPage } from './auth-callback.page';

@Component({ template: '' })
class Blank {}

describe('AuthCallbackPage', () => {
  let completeSignIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    completeSignIn = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideI18nTesting(),
        provideRouter([
          { path: 'auth/callback', component: AuthCallbackPage },
          { path: '**', component: Blank },
        ]),
        { provide: AuthService, useValue: { completeSignIn } },
      ],
    });
  });

  it('completes the sign-in and returns where the user started', async () => {
    completeSignIn.mockResolvedValue('/people');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/auth/callback?code=c&state=s');
    await settle();

    expect(completeSignIn).toHaveBeenCalledWith({ code: 'c', state: 's', error: null });
    expect(TestBed.inject(Router).url).toBe('/people');
  });

  it('goes to the sign-in page with an error when the sign-in failed', async () => {
    completeSignIn.mockRejectedValue(new SignInError('access_denied'));
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/auth/callback?error=access_denied&state=s');
    await settle();

    expect(TestBed.inject(Router).url).toBe('/sign-in?error=sign-in-failed');
  });
});
