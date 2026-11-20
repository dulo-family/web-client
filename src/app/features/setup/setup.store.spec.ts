import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { DEFAULTS } from '../../../testing/setup';
import { SETUP_STORAGE_KEY, SetupStore } from './setup.store';

describe('SetupStore', () => {
  const signedIn = signal(false);

  function create(): SetupStore {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { signedIn } }],
    });
    return TestBed.inject(SetupStore);
  }

  beforeEach(() => {
    sessionStorage.clear();
    signedIn.set(false);
  });

  it('opens a step only when every step before it is valid', () => {
    const store = create();

    expect(store.firstInvalidBefore('welcome')).toBeNull();
    expect(store.firstInvalidBefore('token')).toBeNull();
    expect(store.firstInvalidBefore('review')).toBe('token');

    store.acceptToken('secret', DEFAULTS);
    expect(store.firstInvalidBefore('review')).toBe('sign-in');

    signedIn.set(true);
    expect(store.firstInvalidBefore('review')).toBe('name');

    store.name.set('   ');
    expect(store.firstInvalidBefore('review')).toBe('name');
    store.name.set(' The Smiths ');
    expect(store.firstInvalidBefore('review')).toBeNull();

    store.description.set('x'.repeat(2001));
    expect(store.firstInvalidBefore('review')).toBe('description');
  });

  it('starts the features from the defaults and keeps changes for the same token', () => {
    const store = create();

    store.acceptToken('secret', DEFAULTS);
    expect(store.enabledFeatures()).toEqual(['people', 'audit-log']);

    store.setFeature('map-view', true);
    store.acceptToken('secret', DEFAULTS);
    expect(store.enabledFeatures()).toEqual(['people', 'map-view', 'audit-log']);

    store.acceptToken('other', DEFAULTS);
    expect(store.enabledFeatures()).toEqual(['people', 'audit-log']);
  });

  it('resumes at the furthest step reached, or the first one that needs input', () => {
    const store = create();
    expect(store.resumeStep()).toBe('welcome');

    store.acceptToken('secret', DEFAULTS);
    store.reach('sign-in');
    expect(store.resumeStep()).toBe('sign-in');

    signedIn.set(true);
    store.reach('description');
    expect(store.resumeStep()).toBe('name');
  });

  it('survives a full-page load through sessionStorage', () => {
    const first = create();
    first.acceptToken('secret', DEFAULTS);
    first.name.set('The Smiths');
    first.reach('sign-in');
    TestBed.tick();

    TestBed.resetTestingModule();
    const second = create();

    expect(second.token()).toBe('secret');
    expect(second.defaults()).toEqual(DEFAULTS);
    expect(second.name()).toBe('The Smiths');
    expect(second.furthest()).toBe(2);
  });

  it('forgets everything but the tree name when finished', () => {
    const store = create();
    store.acceptToken('secret', DEFAULTS);
    store.name.set('The Smiths');
    TestBed.tick();

    store.finish('The Smiths');
    TestBed.tick();

    expect(store.token()).toBe('');
    expect(store.finishedTreeName()).toBe('The Smiths');
    expect(sessionStorage.getItem(SETUP_STORAGE_KEY)).toBeNull();
  });

  it('ignores stored state it cannot read', () => {
    sessionStorage.setItem(SETUP_STORAGE_KEY, '{not json');

    expect(create().token()).toBe('');
  });
});
