import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SetupStatus } from './setup-status';
import { setupCompletedGuard, setupPendingGuard } from './setup-status.guards';

@Component({ template: '' })
class Blank {}

describe('setup status guards', () => {
  let harness: RouterTestingHarness | undefined;
  let pending: boolean | null;

  beforeEach(() => {
    harness = undefined;
    pending = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: SetupStatus, useValue: { isPending: () => Promise.resolve(pending) } },
        provideRouter([
          { path: 'sign-in', component: Blank },
          { path: 'setup', canActivate: [setupPendingGuard], component: Blank },
          {
            path: '',
            canActivateChild: [setupCompletedGuard],
            children: [
              { path: '', pathMatch: 'full', component: Blank },
              { path: 'people', component: Blank },
            ],
          },
        ]),
      ],
    });
  });

  async function open(url: string): Promise<string> {
    harness ??= await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  describe('while the setup is pending', () => {
    beforeEach(() => (pending = true));

    it('sends the app’s pages to the setup', async () => {
      expect(await open('/')).toBe('/setup');
      expect(await open('/people')).toBe('/setup');
    });

    it('opens the setup and the sign-in page', async () => {
      expect(await open('/setup')).toBe('/setup');
      expect(await open('/sign-in')).toBe('/sign-in');
    });
  });

  describe('once the setup is done', () => {
    beforeEach(() => (pending = false));

    it('sends the setup home', async () => {
      expect(await open('/setup')).toBe('/');
    });

    it('opens the app’s pages', async () => {
      expect(await open('/people')).toBe('/people');
    });
  });

  it('lets everything through when the status is unknown', async () => {
    expect(await open('/setup')).toBe('/setup');
    expect(await open('/people')).toBe('/people');
  });
});
