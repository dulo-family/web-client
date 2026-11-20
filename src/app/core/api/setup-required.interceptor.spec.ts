import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { setupRequiredInterceptor } from './setup-required.interceptor';

describe('setupRequiredInterceptor', () => {
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([setupRequiredInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  function respond(status: number, body: string | object): Promise<unknown> {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/v1/tree'));
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/tree')
      .flush(body, { status, statusText: 'Status' });
    return response;
  }

  it('goes to the setup on 503 setup-required and still fails the call', async () => {
    await expect(
      respond(503, { type: 'urn:dulo:problem:setup-required', status: 503 }),
    ).rejects.toMatchObject({ status: 503 });
    expect(navigate).toHaveBeenCalledWith('/setup');
  });

  it('ignores other errors', async () => {
    await expect(respond(503, 'Service Unavailable')).rejects.toMatchObject({ status: 503 });
    expect(navigate).not.toHaveBeenCalled();
  });
});
