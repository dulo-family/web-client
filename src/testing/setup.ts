import { SetupDefaults } from '../app/features/setup/setup-api';

/** Setup defaults like the server's, smaller. */
export const DEFAULTS: SetupDefaults = {
  features: [
    { key: 'people', enabled: true, locked: false },
    { key: 'map-view', enabled: false, locked: false },
    { key: 'audit-log', enabled: true, locked: true },
  ],
  identityProviders: [
    {
      id: 'mock',
      displayName: 'Mock provider',
      type: 'oidc',
      roleMappings: { 'dulo-admins': 'admin' },
      defaultRole: 'viewer',
    },
  ],
  registrationMode: 'auto',
  roles: [
    {
      key: 'admin',
      name: 'Administrator',
      builtIn: true,
      version: 0,
      permissions: [{ feature: 'people', access: ['view', 'create', 'edit', 'delete'] }],
    },
    {
      key: 'viewer',
      name: 'Viewer',
      builtIn: true,
      version: 0,
      permissions: [{ feature: 'people', access: ['view'] }],
    },
  ],
};
