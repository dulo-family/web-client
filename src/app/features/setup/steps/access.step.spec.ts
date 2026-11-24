import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '../../../../testing/i18n';
import { DEFAULTS } from '../../../../testing/setup';
import { AuthService } from '../../../core/auth/auth.service';
import { SetupStore } from '../setup.store';
import { AccessStep } from './access.step';

describe('AccessStep', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideI18nTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { signedIn: signal(true) } },
      ],
    });
  });

  it('shows the role each claim value gets and the default role', async () => {
    TestBed.inject(SetupStore).acceptToken('secret', {
      ...DEFAULTS,
      identityProviders: [
        {
          ...DEFAULTS.identityProviders[0],
          roleMappings: { 'dulo-admins': 'admin', 'dulo-genealogists': 'genealogist' },
        },
      ],
      roles: [
        ...DEFAULTS.roles,
        { key: 'genealogist', name: 'Genealogist', builtIn: false, version: 0, permissions: [] },
      ],
    });
    const fixture = TestBed.createComponent(AccessStep);
    await fixture.whenStable();

    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('ul.plain li')].map(
      (item) => item.textContent?.trim(),
    );
    expect(items).toEqual([
      '“dulo-admins” gets Administrator',
      '“dulo-genealogists” gets Genealogist',
      'Everyone else gets Viewer',
    ]);
  });
});
