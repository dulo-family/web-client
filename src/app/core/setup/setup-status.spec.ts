import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api';
import { SetupStatus } from './setup-status';

const STATUS_URL = 'http://api.test/api/v1/setup/status';

describe('SetupStatus', () => {
  let status: SetupStatus;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });
    status = TestBed.inject(SetupStatus);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the server once, also for concurrent callers', async () => {
    const first = status.isPending();
    const second = status.isPending();
    http.expectOne(STATUS_URL).flush({ pending: true });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(await status.isPending()).toBe(true);
    expect(status.pending()).toBe(true);
  });

  it('answers null when the server cannot be reached, and asks again next time', async () => {
    const first = status.isPending();
    http.expectOne(STATUS_URL).error(new ProgressEvent('error'));
    expect(await first).toBeNull();
    expect(status.pending()).toBeNull();

    const second = status.isPending();
    http.expectOne(STATUS_URL).flush({ pending: false });
    expect(await second).toBe(false);
  });

  it('takes the app’s word without asking', async () => {
    status.markPending();
    expect(await status.isPending()).toBe(true);

    status.markCompleted();
    expect(await status.isPending()).toBe(false);
  });
});
