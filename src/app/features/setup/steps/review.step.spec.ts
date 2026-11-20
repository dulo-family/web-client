import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { settle } from '../../../../testing/http';
import { provideI18nTesting } from '../../../../testing/i18n';
import { API_BASE_URL } from '../../../core/api/api';
import { AuthService } from '../../../core/auth/auth.service';
import { SetupStatus } from '../../../core/setup/setup-status';
import { DEFAULTS } from '../../../../testing/setup';
import { SetupStore } from '../setup.store';
import { ReviewStep } from './review.step';

const API = 'http://api.test/api/v1';

describe('ReviewStep', () => {
  let store: SetupStore;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18nTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: AuthService, useValue: { signedIn: signal(true) } },
      ],
    });
    store = TestBed.inject(SetupStore);
    store.acceptToken('secret', DEFAULTS);
    store.name.set(' The Smiths ');
    store.description.set('  ');
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  const SERVER_CONFIGURATION =
    'dulo:\n  registration:\n    mode: auto  # file dulo.yaml\n  setup:\n    token: ****  # file dulo.yaml\n';

  async function open(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(ReviewStep);
    TestBed.tick();
    http.expectOne(`${API}/me`).flush({ id: 'u1', displayName: 'Ada', email: 'ada@example.org' });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function button(element: HTMLElement, text: string): HTMLButtonElement {
    return [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  }

  async function finish(): Promise<HTMLElement> {
    const element = await open();
    expect(element.textContent).toContain('Ada');
    expect(element.textContent).toContain('The Smiths');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    return element;
  }

  it('sends the setup with both tokens and shows the done page', async () => {
    await finish();

    const request = http.expectOne(`${API}/setup`);
    expect(request.request.headers.get('X-Dulo-Setup-Token')).toBe('secret');
    expect(request.request.body).toEqual({
      name: 'The Smiths',
      description: null,
      enabledFeatures: ['people', 'audit-log'],
    });
    request.flush({ id: 't1', name: 'The Smiths', features: [], version: 0 });
    await settle();

    expect(store.finishedTreeName()).toBe('The Smiths');
    expect(TestBed.inject(SetupStatus).pending()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/setup/done');
  });

  it('goes back to the sign-in step when the sign-in has expired', async () => {
    await finish();

    http
      .expectOne(`${API}/setup`)
      .flush(
        { type: 'urn:dulo:problem:unauthorized', status: 401 },
        { status: 401, statusText: 'Unauthorized' },
      );
    await settle();

    expect(store.stepError()).toMatchObject({ step: 'sign-in' });
    expect(router.navigate).toHaveBeenCalledWith(['/setup', 'sign-in']);
  });

  it('goes back to the token step when the token is no longer accepted', async () => {
    await finish();

    http
      .expectOne(`${API}/setup`)
      .flush(
        { type: 'urn:dulo:problem:invalid-setup-token', status: 403 },
        { status: 403, statusText: 'Forbidden' },
      );
    await settle();

    expect(store.defaults()).toBeNull();
    expect(store.stepError()).toEqual({ step: 'token', message: 'The setup token is wrong.' });
    expect(router.navigate).toHaveBeenCalledWith(['/setup', 'token']);
  });

  it('offers the way home when someone else finished the setup', async () => {
    const element = await finish();

    http
      .expectOne(`${API}/setup`)
      .flush(
        { type: 'urn:dulo:problem:setup-completed', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    TestBed.tick();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('already complete');
    expect(element.querySelector('a[href="/"]')).not.toBeNull();
    expect(store.token()).toBe('');
    expect(TestBed.inject(SetupStatus).pending()).toBe(false);
  });

  it('shows the merged configuration only on request, with each value’s sources', async () => {
    const element = await open();
    http.expectNone(`${API}/setup/config`);
    expect(element.querySelector('pre')).toBeNull();

    const toggle = button(element, 'Show the full configuration');
    toggle.click();
    TestBed.tick();
    const configuration = http.expectOne(`${API}/setup/config`);
    expect(configuration.request.headers.get('X-Dulo-Setup-Token')).toBe('secret');
    configuration.flush({ configuration: SERVER_CONFIGURATION });
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();

    const pre = element.querySelector('pre')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(pre.textContent).toContain('mode: auto # file dulo.yaml');
    expect(pre.textContent).toContain('token: "****" # file dulo.yaml');
    expect(pre.textContent).toContain('name: The Smiths');
    expect(pre.textContent).toContain('people: true # default (overridden) → this setup');
    const people = [...pre.querySelectorAll('.sources')].find((sources) =>
      sources.textContent?.includes('this setup'),
    )!;
    expect(people.querySelector('s')?.textContent).toBe('default (overridden)');
    expect(people.querySelector('.source')?.textContent).toBe('this setup');

    toggle.click();
    TestBed.tick();
    expect(element.querySelector('pre')).toBeNull();
    toggle.click();
    TestBed.tick();
    http.expectNone(`${API}/setup/config`);
    expect(element.querySelector('pre')).not.toBeNull();
  });

  it('offers a retry when the configuration cannot be loaded', async () => {
    const element = await open();
    button(element, 'Show the full configuration').click();
    TestBed.tick();
    http.expectOne(`${API}/setup/config`).error(new ProgressEvent('error'));
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();

    expect(element.querySelector('.result [role="alert"]')?.textContent).toContain('Can’t reach');
    button(element, 'Try again').click();
    TestBed.tick();
    http.expectOne(`${API}/setup/config`).flush({ configuration: SERVER_CONFIGURATION });
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();

    expect(element.querySelector('pre')?.textContent).toContain('this setup');
  });
});
