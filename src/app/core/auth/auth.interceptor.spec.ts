import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { settle } from '../../../testing/http';
import { API_BASE_URL } from '../api/api';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const API = 'http://api.test';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: {
    accessToken: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    hasRefreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      accessToken: vi.fn().mockResolvedValue('access-1'),
      refresh: vi.fn().mockResolvedValue('access-2'),
      hasRefreshToken: vi.fn().mockReturnValue(true),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the access token to API calls', async () => {
    const response = firstValueFrom(http.get(`${API}/api/v1/me`));
    await settle();

    const request = backend.expectOne(`${API}/api/v1/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({ id: 'u1' });
    expect(await response).toEqual({ id: 'u1' });
  });

  it('sends API calls without a token when signed out', async () => {
    auth.accessToken.mockResolvedValue(null);

    void firstValueFrom(http.get(`${API}/api/v1/identity-providers`));
    await settle();

    const request = backend.expectOne(`${API}/api/v1/identity-providers`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('leaves other URLs alone', () => {
    void firstValueFrom(http.get('i18n/en.json'));

    const request = backend.expectOne('i18n/en.json');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(auth.accessToken).not.toHaveBeenCalled();
    request.flush({});
  });

  it('refreshes once and retries after a 401', async () => {
    const response = firstValueFrom(http.get(`${API}/api/v1/me`));
    await settle();
    backend
      .expectOne(`${API}/api/v1/me`)
      .flush(
        { type: 'urn:dulo:problem:unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await settle();

    const retry = backend.expectOne(`${API}/api/v1/me`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ id: 'u1' });
    expect(await response).toEqual({ id: 'u1' });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('gives up when the retry is rejected too', async () => {
    const response = firstValueFrom(http.get(`${API}/api/v1/me`));
    await settle();
    backend.expectOne(`${API}/api/v1/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    backend.expectOne(`${API}/api/v1/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('passes the 401 on when the refresh fails', async () => {
    auth.refresh.mockResolvedValue(null);
    const response = firstValueFrom(http.get(`${API}/api/v1/me`));
    await settle();
    backend.expectOne(`${API}/api/v1/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
  });
});
