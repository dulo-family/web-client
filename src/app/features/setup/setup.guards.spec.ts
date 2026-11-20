import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { resumeSetup, setupStepGuard } from './setup.guards';
import { DEFAULTS } from '../../../testing/setup';
import { SetupStore } from './setup.store';

@Component({ template: '' })
class Blank {}

describe('setup guards', () => {
  const signedIn = signal(false);

  beforeEach(() => {
    sessionStorage.clear();
    signedIn.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { signedIn } },
        provideRouter([
          {
            path: 'setup',
            children: [
              { path: '', pathMatch: 'full', redirectTo: resumeSetup },
              ...['welcome', 'token', 'sign-in', 'name', 'review'].map((step) => ({
                path: step,
                data: { step },
                canActivate: [setupStepGuard],
                component: Blank,
              })),
            ],
          },
        ]),
      ],
    });
  });

  it('sends a step whose earlier steps are not done to the first one that is not', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/setup/review');

    expect(TestBed.inject(Router).url).toBe('/setup/token');
  });

  it('opens a step whose earlier steps are done and remembers it', async () => {
    const store = TestBed.inject(SetupStore);
    store.acceptToken('secret', DEFAULTS);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/setup/sign-in');

    expect(TestBed.inject(Router).url).toBe('/setup/sign-in');
    expect(store.furthest()).toBe(2);
  });

  it('continues where the wizard was left', async () => {
    const store = TestBed.inject(SetupStore);
    store.acceptToken('secret', DEFAULTS);
    store.reach('sign-in');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/setup');

    expect(TestBed.inject(Router).url).toBe('/setup/sign-in');
  });
});
