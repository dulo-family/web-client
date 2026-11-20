import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signedInGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Component({ template: '' })
class Blank {}

describe('signedInGuard', () => {
  let harness: RouterTestingHarness | undefined;
  const signedIn = signal(false);
  const accessToken = vi.fn<() => Promise<string | null>>();

  beforeEach(() => {
    harness = undefined;
    signedIn.set(false);
    accessToken.mockReset().mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { signedIn, accessToken } },
        provideRouter([
          { path: 'sign-in', component: Blank },
          {
            path: '',
            canActivateChild: [signedInGuard],
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

  it('opens the page with a session', async () => {
    signedIn.set(true);

    expect(await open('/people')).toBe('/people');
    expect(accessToken).not.toHaveBeenCalled();
  });

  it('opens the page when the session can be refreshed', async () => {
    accessToken.mockResolvedValue('token');

    expect(await open('/people')).toBe('/people');
  });

  it('sends the user to sign in and back afterwards', async () => {
    expect(await open('/people?view=map')).toBe('/sign-in?returnTo=%2Fpeople%3Fview%3Dmap');
  });

  it('sends the user to sign in without a return address from home', async () => {
    expect(await open('/')).toBe('/sign-in');
  });
});
