import * as yaml from 'yaml';
import { DEFAULTS } from '../../../testing/setup';
import { Segment, SetupValues, mergeConfiguration, toChain } from './merged-configuration';

const SERVER = `# Dulo configuration (secrets masked)
# Database: SQLITE
dulo:
  public-url: http://localhost:8080  # default → file dulo.yaml -> environment variable DULO_PUBLIC_URL
  identity:
    providers:
      mock:
        scopes: [openid, profile, email]  # default
        client-secret: ****  # file deploy/dev/dulo.dev.yaml
  registration:
    mode: auto  # file deploy/dev/dulo.dev.yaml
  features:
    audit-log: true  # file deploy/dev/dulo.dev.yaml
  print-config: true  # file deploy/dev/dulo.dev.yaml
`;

/** The segments as text, with overridden sources as ~~label~~. */
function render(segments: readonly Segment[]): string {
  return segments
    .map((segment) =>
      segment.kind === 'text'
        ? segment.text
        : '# ' +
          segment.sources
            .map((source) => (source.overridden ? `~~${source.label}~~` : source.label))
            .join(' → '),
    )
    .join('');
}

describe('mergeConfiguration', () => {
  const values: SetupValues = {
    treeName: 'The "Smiths": a test',
    description: 'Line one\nLine two',
    account: {
      id: 'u1',
      displayName: 'Ada',
      email: 'ada@example.org',
      status: 'active',
      root: false,
      roles: [],
      permissions: [],
    },
    features: DEFAULTS.features,
    enabled: { people: true, 'map-view': true, 'audit-log': true },
    roles: DEFAULTS.roles,
  };

  it('keeps the server values, each with its chain of sources', () => {
    const merged = render(mergeConfiguration(yaml, SERVER, values));

    expect(merged).toContain('# Dulo configuration (secrets masked)');
    expect(merged).toContain(
      'public-url: http://localhost:8080 # ~~default~~ → ~~file dulo.yaml~~ → environment variable DULO_PUBLIC_URL',
    );
    expect(merged).toContain('client-secret: "****" # file deploy/dev/dulo.dev.yaml');
    expect(merged).toContain('scopes: [openid, profile, email] # default');
  });

  it('ends the chain of the features this setup sets with "this setup"', () => {
    const merged = render(mergeConfiguration(yaml, SERVER, values));

    expect(merged).toContain('people: true # ~~default~~ → this setup');
    expect(merged).toContain('map-view: true # ~~default~~ → this setup');
    expect(merged).toContain('audit-log: true # file deploy/dev/dulo.dev.yaml');
    expect(merged.indexOf('people:')).toBeLessThan(merged.indexOf('audit-log:'));
  });

  it('adds what the setup stores in the database, as valid YAML', () => {
    const merged = render(mergeConfiguration(yaml, SERVER, values));
    const parsed = yaml.parse(merged);

    expect(parsed.dulo.features).toEqual({ people: true, 'map-view': true, 'audit-log': true });
    expect(parsed.setup.tree).toEqual({
      name: 'The "Smiths": a test',
      description: 'Line one\nLine two',
    });
    expect(parsed.setup['root-user']).toEqual({ name: 'Ada', email: 'ada@example.org' });
    expect(parsed.setup.roles.viewer).toEqual({ name: 'Viewer', people: ['view'] });
    expect(merged).toContain('# Set by this setup and stored in the database');
    expect(merged).toContain('people: [view, create, edit, delete]');
  });

  it('adds the features section when the configuration has none', () => {
    const merged = render(
      mergeConfiguration(yaml, 'dulo:\n  public-url: x  # default\n', {
        ...values,
        description: null,
        account: null,
      }),
    );

    expect(merged).toContain('people: true # ~~default~~ → this setup');
    expect(yaml.parse(merged).setup.tree).toEqual({ name: 'The "Smiths": a test' });
  });
});

describe('toChain', () => {
  it('reads a chain, lowest priority first, with all but the last overridden', () => {
    expect(toChain(' default -> file x → environment variable Y')).toEqual([
      { label: 'default', overridden: true },
      { label: 'file x', overridden: true },
      { label: 'environment variable Y', overridden: false },
    ]);
    expect(toChain(' default')).toEqual([{ label: 'default', overridden: false }]);
  });
});
