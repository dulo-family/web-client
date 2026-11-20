import type { Node, Pair, Scalar, YAMLMap } from 'yaml';
import { Me, Schemas } from '../../core/api/api';

type Yaml = typeof import('yaml');

/** What the wizard adds on top of the server's configuration. */
export interface SetupValues {
  readonly treeName: string;
  readonly description: string | null;
  readonly account: Me | null;
  /** The switchable features from the defaults, in their order. */
  readonly features: readonly Schemas['FeatureResponse'][];
  /** The wizard's choice for each feature key. */
  readonly enabled: Readonly<Record<string, boolean>>;
  /** The built-in roles, with their default permissions. */
  readonly roles: readonly Schemas['RoleResponse'][];
}

/** One place a value is set; every source but the last is overridden by a later one. */
export interface Source {
  readonly label: string;
  readonly overridden: boolean;
}

/** The merged document as text, with each value's source chain cut out to render it. */
export type Segment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'sources'; readonly sources: readonly Source[] };

export const DEFAULT_SOURCE = 'default';
export const SETUP_SOURCE = 'this setup';

/** Separators of a source chain in the server's comments, lowest priority first. */
const CHAIN_SEPARATOR = /\s*(?:→|->)\s*/;
/** Wraps a chain's index while the document is turned into text. */
const MARKER = /#\s*(\d+)/g;

/**
 * The server's merged configuration (defaults, files and environment, each value commented with
 * its sources) with the wizard's values added: the feature switches in `dulo.features`, whose
 * chain ends in "this setup", and a `setup` section with what the setup stores in the database.
 */
export function mergeConfiguration(yaml: Yaml, server: string, values: SetupValues): Segment[] {
  const document = yaml.parseDocument(quoteMaskedSecrets(server));
  if (document.errors.length > 0) {
    throw document.errors[0];
  }

  const features = document.createNode({}) as YAMLMap;
  const configured = document.getIn(['dulo', 'features']);
  for (const feature of values.features) {
    const existing = yaml.isMap(configured)
      ? configured.items.find((pair) => keyOf(yaml, pair) === feature.key)
      : undefined;
    if (feature.locked && existing) {
      features.items.push(existing);
    } else {
      const pair = document.createPair(feature.key, values.enabled[feature.key] ?? feature.enabled);
      const previous = (existing?.value as Scalar | undefined)?.comment ?? DEFAULT_SOURCE;
      (pair.value as Scalar).comment = feature.locked ? previous : `${previous} → ${SETUP_SOURCE}`;
      features.items.push(pair);
    }
  }
  document.setIn(['dulo', 'features'], features);

  const roles = document.createNode(
    Object.fromEntries(
      values.roles.map((role) => [
        role.key,
        {
          name: role.name,
          ...Object.fromEntries(
            role.permissions.map((permission) => [permission.feature, permission.access]),
          ),
        },
      ]),
    ),
  ) as YAMLMap;
  roles.commentBefore = ' Built-in roles with their default permissions';
  yaml.visit(roles, {
    Seq(_, seq) {
      seq.flow = true;
    },
  });

  const section = document.createNode({
    tree: {
      name: values.treeName,
      ...(values.description ? { description: values.description } : {}),
    },
    'root-user': rootUser(values.account),
  }) as YAMLMap;
  section.set('roles', roles);

  const setup = document.createPair('setup', section);
  (setup.key as Scalar).commentBefore =
    ' Set by this setup and stored in the database, not in the configuration.\n' +
    ' Change them later in the administration.';
  (document.contents as YAMLMap).items.push(setup);

  // Swap each value's comment for a marker, so the chain can be rendered on its own.
  const chains: Source[][] = [];
  yaml.visit(document, (_, node) => {
    const commented = node as Node & { comment?: string | null };
    if ((yaml.isScalar(node) || yaml.isCollection(node)) && commented.comment) {
      chains.push(toChain(commented.comment));
      commented.comment = ` ${chains.length - 1}`;
    }
  });

  return toSegments(document.toString({ lineWidth: 0, flowCollectionPadding: false }), chains);
}

/** "default → file x → environment variable Y": all but the last are overridden. */
export function toChain(comment: string): Source[] {
  const labels = comment
    .trim()
    .split(CHAIN_SEPARATOR)
    .filter((label) => label.length > 0);
  return labels.map((label, index) => ({ label, overridden: index < labels.length - 1 }));
}

/**
 * The server prints masked secrets as a bare `****`, which YAML reads as an alias; quote them.
 */
export function quoteMaskedSecrets(server: string): string {
  return server.replace(/^(\s*[\w.-]+:[ \t]+)(\*+)(?=[ \t]*(#|$))/gm, '$1"$2"');
}

function toSegments(text: string, chains: readonly Source[][]): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    segments.push({ kind: 'text', text: text.slice(last, match.index) });
    segments.push({ kind: 'sources', sources: chains[Number(match[1])] });
    last = match.index + match[0].length;
  }
  segments.push({ kind: 'text', text: text.slice(last) });
  return segments.filter((segment) => segment.kind !== 'text' || segment.text.length > 0);
}

function rootUser(account: Me | null): Record<string, string> {
  if (!account) {
    return {};
  }
  return {
    ...(account.displayName ? { name: account.displayName } : {}),
    ...(account.email ? { email: account.email } : {}),
    ...(!account.displayName && !account.email ? { id: account.id } : {}),
  };
}

function keyOf(yaml: Yaml, pair: Pair): unknown {
  return yaml.isScalar(pair.key) ? pair.key.value : pair.key;
}
