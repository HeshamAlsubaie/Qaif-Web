import {
  ArrowRight,
  BellRing,
  FilePlus2,
  FolderOpen,
  Lock,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate, type To } from 'react-router-dom';

import qaifLogo from '@/assets/qaif-logo.png';
import { useSelectedCase } from '@/app/CaseContext';
import { useRole } from '@/app/RoleContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { UniversalSearch } from './UniversalSearch';

/**
 * The search-forward front door. The STAR is one universal search box (see {@link UniversalSearch});
 * everything else is a secondary TOOL arranged around it — the malware sandbox, a case-ID lookup,
 * open-a-case, and the Wazuh SIEM feed. This is deliberately NOT a dashboard and NOT the console:
 * it is bare (no sidebar), because outside a case there is no custody to navigate. The full sidebar
 * navigator appears only once a case is opened.
 */

interface ToolEntry {
  icon: LucideIcon;
  title: string;
  description: string;
  to: To;
  /** A write launcher: gated to Investigators, so a Viewer is not led to a form they can't submit. */
  requiresInvestigator?: boolean;
}

// Navigate-only tools. The case-ID lookup is a small inline form (below), not one of these.
const TOOLS: ToolEntry[] = [
  {
    icon: UploadCloud,
    title: 'Malware Sandbox',
    description: 'Submit a file for sandbox triage and detonation.',
    to: '/sandbox',
  },
  {
    icon: FilePlus2,
    title: 'Open a case',
    description: 'Start a new case — custody begins here.',
    to: '/cases/new',
    requiresInvestigator: true,
  },
  {
    icon: BellRing,
    title: 'Wazuh Alerts (SIEM)',
    description: 'Browse live SIEM alerts read from the Wazuh indexer.',
    to: '/alerts',
  },
];

const toolSurface =
  'group flex h-full flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0';

function ToolIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="bg-primary/12 flex size-9 items-center justify-center rounded-md text-primary transition-colors group-hover:bg-primary/20">
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}

function ToolCard({ tool }: { tool: ToolEntry }) {
  const navigate = useNavigate();
  const { canWrite } = useRole();
  // A write launcher (Open a case) is gated for Viewers: don't lead them to a form they can't submit.
  const gated = tool.requiresInvestigator === true && !canWrite;

  return (
    <button
      type="button"
      onClick={() => {
        if (!gated) navigate(tool.to);
      }}
      disabled={gated}
      aria-disabled={gated}
      className={cn(
        toolSurface,
        gated
          ? 'cursor-not-allowed opacity-70'
          : 'hover:border-primary/40 hover:bg-surface-2',
      )}
    >
      <ToolIcon icon={tool.icon} />
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-foreground">
          {tool.title}
          {!gated && (
            <ArrowRight
              className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden
            />
          )}
        </span>
        <span className="type-caption">{tool.description}</span>
        {gated && (
          <span className="mt-1 inline-flex items-center gap-1 text-micro font-medium text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Investigator only — switch role to open a case.
          </span>
        )}
      </span>
    </button>
  );
}

/** Enter an existing case by its id: set it as the selected case and step into the console. */
function CaseIdCard() {
  const navigate = useNavigate();
  const { setCaseId } = useSelectedCase();
  const [draft, setDraft] = React.useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(id) || id <= 0) return;
    setCaseId(id);
    navigate('/overview');
  }

  return (
    <div className={toolSurface}>
      <ToolIcon icon={FolderOpen} />
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold tracking-tight text-foreground">
          Case ID lookup
        </span>
        <span className="type-caption">Open an existing case by its id — custody continues.</span>
      </span>
      <form className="mt-auto flex gap-2 pt-1" onSubmit={onSubmit}>
        <input
          inputMode="numeric"
          placeholder="e.g. 700001"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Case id"
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-0 px-3 font-mono text-body text-foreground outline-none focus:border-primary/70"
        />
        <Button type="submit" size="sm">
          Go
        </Button>
      </form>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center overflow-y-auto bg-surface-0 px-6 py-6">
      {/*
        Landing role switcher DISABLED for now (IAM not removed): the switcher still lives in
        AppShell/ToolShell and all IAM code (RoleContext, roleHeaders, InvestigatorOnly gates,
        backend enforcement) is intact. Re-enable this and revert RoleContext's DEFAULT_ROLE to
        Viewer when IAM returns to the landing.
        <div className="flex w-full max-w-[1080px] items-center justify-end">
          <RoleSwitcher />
        </div>
      */}

      {/*
        The logo is the landing's ONLY identity element (wordmark removed from the DOM), so alt="QAIF"
        is required. It is the page CENTERPIECE: WIDTH-constrained to 360px (height auto follows the
        1024×1263 portrait → ~444px) so the thin wordmark rules stay clean hairlines; 360px downscales
        the 1024px source, so no upscaling/blur. The alpha PNG sits directly on the dark background —
        no plate/border. Stack is centered on one vertical axis (logo → search → tools). The
        `max-h-[48vh] object-contain` is a SHORT-VIEWPORT backstop only: on a ~800px-tall laptop it
        scales the logo down proportionally (no distortion) so the tool cards stay above the fold; on
        normal/tall desktops (≳925px tall) it renders at the full 360px.
      */}
      <div className="flex w-full max-w-[1080px] flex-1 flex-col items-center justify-center gap-8">
        <div className="flex w-full flex-col items-center gap-6">
          <img
            src={qaifLogo}
            alt="QAIF"
            className="h-auto w-[360px] max-w-[86vw] max-h-[48vh] select-none object-contain"
          />
          <UniversalSearch />
        </div>

        {/* Secondary tools around the search star. */}
        <div className="w-full">
          <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </span>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ToolCard tool={TOOLS[0]} />
            <CaseIdCard />
            <ToolCard tool={TOOLS[1]} />
            <ToolCard tool={TOOLS[2]} />
          </div>
        </div>
      </div>
    </div>
  );
}
