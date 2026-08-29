import {
  BellRing,
  Bot,
  Bug,
  Clock,
  Coins,
  FileText,
  HardDriveDownload,
  LayoutGrid,
  Network,
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
}

/**
 * The left-nav map. Overview is fully built now; the rest are honest Stage C placeholders so the
 * whole console is navigable without fabricating content.
 */
export const NAV_SECTIONS: NavSection[] = [
  // A primary capability, not a case section: IOC lookup is case-INDEPENDENT (the second way to
  // use QAIF), so it leads the nav in its own group and needs no selected case.
  { path: '/search', label: 'Search', icon: Search, group: 'Search', stageC: false },

  { path: '/', label: 'Overview', icon: LayoutGrid, group: 'Case', stageC: false },

  { path: '/threats', label: 'Threats', icon: ShieldAlert, group: 'Findings', stageC: false },
  { path: '/ips', label: 'IPs / Network', icon: Network, stageC: false },
  { path: '/cves', label: 'CVEs', icon: Bug, stageC: true },
  { path: '/crypto', label: 'Crypto', icon: Coins, stageC: true },

  { path: '/graph', label: 'Graph', icon: Waypoints, group: 'Correlation', stageC: false },
  { path: '/timeline', label: 'Timeline', icon: Clock, stageC: false },

  {
    path: '/evidence',
    label: 'Evidence',
    icon: HardDriveDownload,
    group: 'Custody',
    stageC: false,
  },
  { path: '/suggestions', label: 'AI Suggestions', icon: Bot, stageC: false },
  { path: '/alerts', label: 'Alerts (Wazuh)', icon: BellRing, stageC: true },
  { path: '/report', label: 'Report', icon: FileText, stageC: false },
];
