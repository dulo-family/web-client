import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideI18nTesting } from '../../../testing/i18n';
import { API_BASE_URL } from '../../core/api/api';
import { AuthService } from '../../core/auth/auth.service';
import { SignInPage } from './sign-in.page';

const PROVIDERS_URL = 'http://api.test/api/v1/identity-providers';

describe('SignInPage', () => {
  let signIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signIn = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18nTesting(),
        provideRouter([{ path: 'sign-in', component: SignInPage }]),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: AuthService, useValue: { signIn, takeReturnAfterSignOut: () => null } },
      ],
    });
  });

  async function open(
    url: string,
  ): Promise<{ harness: RouterTestingHarness; element: HTMLElement }> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, SignInPage);
    return { harness, element: harness.routeNativeElement! };
  }

  it('shows one button per provider, which starts the sign-in with it', async () => {
    const { harness, element } = await open('/sign-in?returnTo=%2Fpeople');
    TestBed.inject(HttpTestingController)
      .expectOne(PROVIDERS_URL)
      .flush([
        { id: 'google', displayName: 'Google', type: 'google', signInPath: '/x' },
        { id: 'mock', displayName: 'Mock provider', type: 'oidc', signInPath: '/y' },
      ]);
    await harness.fixture.whenStable();

    const buttons = [...element.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Continue with Google',
      'Continue with Mock provider',
    ]);

    buttons[1].click();
    await harness.fixture.whenStable();

    expect(signIn).toHaveBeenCalledWith('mock', '/people');
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('says that the sign-in failed', async () => {
    const { harness, element } = await open('/sign-in?error=sign-in-failed');
    TestBed.inject(HttpTestingController).expectOne(PROVIDERS_URL).flush([]);
    await harness.fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('didn’t work');
    expect(element.textContent).toContain('no sign-in options');
  });

  it('shows a translated error when the providers cannot be loaded', async () => {
    const { harness, element } = await open('/sign-in');
    TestBed.inject(HttpTestingController)
      .expectOne(PROVIDERS_URL)
      .error(new ProgressEvent('error'));
    await harness.fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Can’t reach');
    expect(element.querySelector('button')?.textContent).toContain('Try again');
  });
});
