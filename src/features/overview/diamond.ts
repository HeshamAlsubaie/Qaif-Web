/*
 * Diamond Model mapping — pure and tier-preserving. Given today's case data it maps what EXISTS
 * into the four classic vertices. This is an interim view (the dedicated Diamond backend module
 * comes later); it never fabricates a vertex, and every item keeps the tier of its source, so an
 * adversary attribution renders probabilistic (amber), never confirmed.
 */
import {
  type CorrelationsResponse,
  type FindingsResponse,
  type GraphResponse,
  type Tier,
} from '@/types/api';

export type VertexKey = 'adversary' | 'capability' | 'infrastructure' | 'victim';

export interface DiamondItem {
  label: string;
  type: string;
  tier: Tier;
}

export interface DiamondVertex {
  items: DiamondItem[];
  total: number;
}

export type Diamond = Record<VertexKey, DiamondVertex>;

const INFRA_TYPES = new Set([
  'IP',
  'Domain',
  'URL',
  'WebResource',
  'OnionAddress',
  'CloudResource',
]);
const VICTIM_TYPES = new Set(['VictimOrg']);
const ADVERSARY_TYPES = new Set(['ThreatActor', 'Campaign', 'Alias', 'Identity']);
const CAPABILITY_TYPES = new Set([
  'MalwareFamily',
  'MitreTechnique',
  'Mutex',
  'Process',
  'FileHash',
]);

// A finding that characterises tooling/malware (capability), matched on its module or title.
// Deliberately conservative so infrastructure/IOC findings (e.g. a C2 domain contact) do NOT leak
// into the capability vertex.
const CAPABILITY_FINDING_RE =
  /malware|ransom|conti|family|sample|payload|implant|trojan|loader|classif|backdoor/i;

const MAX_ITEMS = 6;

function take(items: DiamondItem[]): DiamondVertex {
  return { items: items.slice(0, MAX_ITEMS), total: items.length };
}

export function buildDiamond(
  graph: GraphResponse | undefined,
  findings: FindingsResponse | undefined,
  correlations: CorrelationsResponse | undefined,
): Diamond {
  const nodes = graph?.nodes ?? [];

  const infrastructure = nodes
    .filter((n) => INFRA_TYPES.has(n.entity_type))
    .map<DiamondItem>((n) => ({ label: n.value, type: n.entity_type, tier: n.tier }));

  const victim = nodes
    .filter((n) => VICTIM_TYPES.has(n.entity_type))
    .map<DiamondItem>((n) => ({ label: n.value, type: n.entity_type, tier: n.tier }));

  // Adversary: attribution. Prefer explicit actor/campaign entities; if none but the attribution
  // engine produced probable links, surface those (always probabilistic).
  const adversaryEntities = nodes
    .filter((n) => ADVERSARY_TYPES.has(n.entity_type))
    .map<DiamondItem>((n) => ({ label: n.value, type: n.entity_type, tier: n.tier }));
  const adversaryLinks: DiamondItem[] =
    adversaryEntities.length === 0
      ? (correlations?.correlations ?? []).map((c) => ({
          label: `${c.source_entity} ↔ ${c.target_entity}`,
          type: 'attribution link',
          tier: 'probabilistic' as const,
        }))
      : [];
  const adversary = [...adversaryEntities, ...adversaryLinks];

  // Capability: malware/tooling entities + malware-characterising findings (each keeps its own
  // tier — confirmed findings are cyan, probabilistic amber).
  const capabilityEntities = nodes
    .filter((n) => CAPABILITY_TYPES.has(n.entity_type))
    .map<DiamondItem>((n) => ({ label: n.value, type: n.entity_type, tier: n.tier }));
  const confirmedCap = (findings?.confirmed ?? [])
    .filter((f) => CAPABILITY_FINDING_RE.test(`${f.module_id} ${f.title}`))
    .map<DiamondItem>((f) => ({ label: f.title, type: f.module_id, tier: 'confirmed' }));
  const probabilisticCap = (findings?.probabilistic ?? [])
    .filter((f) => CAPABILITY_FINDING_RE.test(`${f.module_id} ${f.title}`))
    .map<DiamondItem>((f) => ({ label: f.title, type: f.module_id, tier: 'probabilistic' }));
  const capability = [...capabilityEntities, ...confirmedCap, ...probabilisticCap];

  return {
    adversary: take(adversary),
    capability: take(capability),
    infrastructure: take(infrastructure),
    victim: take(victim),
  };
}
