import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { settle } from '../../../../testing/http';
import { provideI18nTesting } from '../../../../testing/i18n';
import { API_BASE_URL } from '../../../core/api/api';
import { AuthService } from '../../../core/auth/auth.service';
import { DEFAULTS } from '../../../../testing/setup';
import { SetupStore } from '../setup.store';
import { TokenStep } from './token.step';

const DEFAULTS_URL = 'http://api.test/api/v1/setup/defaults';

describe('TokenStep', () => {
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18nTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: AuthService, useValue: { signedIn: signal(false) } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function submit(token: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(TokenStep);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;
    input.value = token;
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    return element;
  }

  it('checks the token, keeps the defaults and continues', async () => {
    await submit(' secret ');

    const request = TestBed.inject(HttpTestingController).expectOne(DEFAULTS_URL);
    expect(request.request.headers.get('X-Dulo-Setup-Token')).toBe('secret');
    request.flush(DEFAULTS);
    await settle();

    expect(TestBed.inject(SetupStore).defaults()).toEqual(DEFAULTS);
    expect(navigate).toHaveBeenCalledWith(['/setup', 'sign-in']);
  });

  it('says so when the token is wrong', async () => {
    const element = await submit('wrong');

    TestBed.inject(HttpTestingController)
      .expectOne(DEFAULTS_URL)
      .flush(
        { type: 'urn:dulo:problem:invalid-setup-token', status: 403 },
        { status: 403, statusText: 'Forbidden' },
      );
    await settle();
    TestBed.tick();

    expect(element.textContent).toContain('That’s not the setup token');
    expect(element.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('asks for a token before calling the server', async () => {
    const element = await submit('  ');
    TestBed.tick();

    TestBed.inject(HttpTestingController).expectNone(DEFAULTS_URL);
    expect(element.textContent).toContain('Enter the setup token.');
  });
});
