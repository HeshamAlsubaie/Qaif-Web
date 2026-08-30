import {
  Bot,
  Bug,
  Clock,
  Coins,
  FileText,
  HardDriveDownload,
  LayoutGrid,
  Network,
  PencilRuler,
  Search,
  ShieldAlert,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

export interface NavSection {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Group heading rendered above this item (only on the first item of a group). */
  group?: string;
  /** Stage C sections are routed placeholders until their detail views are built. */
  stageC: boolean;
  /**
   * A case-only section makes sense only inside an opened case — custody, evidence, report, and the
   * per-case views. It is hidden from the nav while no case is open (the search-first launcher
   * state). Case-INDEPENDENT tools (Search, CVEs, Crypto) are always available.
   */
  caseOnly: boolean;
}

/**
 * The left-nav map. Search-first: the case-independent tools are always available; everything that
 * only means something inside a case is `caseOnly` and hidden until one is opened. Overview and the
 * rest are honest Stage C placeholders where their detail view is not built yet.
 *
 * Wazuh Alerts and Drop-file Triage are NOT nav items — they are landing launchers (free search),
 * so they live on the landing page, not here. Their routes still exist for those buttons.
 */
export const NAV_SECTIONS: NavSection[] = [
  // Case-INDEPENDENT tools — the free-search way to use QAIF; always visible, no case needed.
  { path: '/search', label: 'Search', icon: Search, group: 'Search', stageC: false, caseOnly: false },
  { path: '/cves', label: 'CVEs', icon: Bug, stageC: true, caseOnly: false },
  { path: '/crypto', label: 'Crypto', icon: Coins, stageC: false, caseOnly: false },

  // Case-SCOPED — visible only once a case is open.
  { path: '/overview', label: 'Overview', icon: LayoutGrid, group: 'Case', stageC: false, caseOnly: true },

  { path: '/threats', label: 'Threats', icon: ShieldAlert, group: 'Findings', stageC: false, caseOnly: true },
  { path: '/ips', label: 'IPs / Network', icon: Network, stageC: false, caseOnly: true },

  { path: '/graph', label: 'Graph', icon: Waypoints, group: 'Correlation', stageC: false, caseOnly: true },
  { path: '/timeline', label: 'Timeline', icon: Clock, stageC: false, caseOnly: true },
  { path: '/board', label: 'Board', icon: PencilRuler, stageC: false, caseOnly: true },

  {
    path: '/evidence',
    label: 'Evidence',
    icon: HardDriveDownload,
    group: 'Custody',
    stageC: false,
    caseOnly: true,
  },
  { path: '/assistant', label: 'Shadow Assistant', icon: Bot, stageC: false, caseOnly: true },
  { path: '/report', label: 'Report', icon: FileText, stageC: false, caseOnly: true },
];
