import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../testing/i18n';
import { API_BASE_URL } from '../../core/api/api';
import { AuthService } from '../../core/auth/auth.service';
import { HomePage } from './home.page';

const API = 'http://api.test/api/v1';
const ME = {
  id: 'u1',
  displayName: 'Ada',
  status: 'active',
  root: true,
  roles: [],
  permissions: [],
};

describe('HomePage', () => {
  const signOut = vi.fn();
  let http: HttpTestingController;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(() => {
    signOut.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18nTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: AuthService, useValue: { signOut } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomePage);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  async function element(): Promise<HTMLElement> {
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the tree, who is signed in, and signs out', async () => {
    http.expectOne(`${API}/tree`).flush({
      id: 't1',
      name: 'The Smiths',
      description: 'Since 1820',
      features: [],
      version: 0,
    });
    http.expectOne(`${API}/me`).flush(ME);
    const page = await element();

    expect(page.querySelector('h1')?.textContent).toContain('The Smiths');
    expect(page.textContent).toContain('Since 1820');
    expect(page.textContent).toContain('Signed in as Ada');
    page.querySelector('button')!.click();
    expect(signOut).toHaveBeenCalled();
  });

  it('says why the tree can’t be shown and tries again', async () => {
    http
      .expectOne(`${API}/tree`)
      .flush(
        { type: 'urn:dulo:problem:account-pending', status: 403 },
        { status: 403, statusText: 'Forbidden' },
      );
    http.expectOne(`${API}/me`).flush({ ...ME, status: 'pending' });
    const page = await element();

    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'waiting for an administrator’s approval',
    );
    const retry = [...page.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Try again'),
    )!;
    retry.click();
    TestBed.tick();
    http.expectOne(`${API}/tree`).flush({ id: 't1', name: 'The Smiths', features: [], version: 1 });
    http.expectOne(`${API}/me`).flush(ME);

    expect((await element()).querySelector('h1')?.textContent).toContain('The Smiths');
  });
});
