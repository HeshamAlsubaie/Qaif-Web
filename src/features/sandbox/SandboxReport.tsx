import { FileWarning, FlaskConical, Radar, ShieldAlert, Target } from 'lucide-react';

import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import type { SandboxReportResponse } from '@/types/api';

import { parseOverview, type SandboxSignature, type SandboxTarget } from './overview';
import { scoreBand } from './score';

/**
 * Renders a completed Triage `overview.json` for a PUBLIC sandbox submission. Everything here is
 * PROBABILISTIC observation (R4): the sandbox OBSERVED this behaviour in ONE automated detonation —
 * it is framed as "observed", never as confirmed fact, and it is not under chain of custody. The
 * layout is tiered like the IOC results — a header verdict, then the behavioural signatures (the
 * star), then targets and the sample's own identifiers. A trivial sample with no score shows "No
 * score" honestly rather than a fabricated number.
 */
export function SandboxReport({ data }: { data: SandboxReportResponse }) {
  // Guarded upstream (the page only renders this once status is `reported` and `report` is present),
  // but stay honest if an empty overview ever arrives rather than inventing a verdict.
  if (!data.report) {
    return (
      <Card>
        <EmptyState
          icon={FileWarning}
          title="No report content"
          message="The sandbox marked this sample reported but returned no overview to display."
        />
      </Card>
    );
  }

  const overview = parseOverview(data.report);
  const band = scoreBand(overview.score);
  const filename = overview.sample.target;

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict header — filename, the score band, run status, any family labels. */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Analysed sample
            </span>
            <span className="break-all font-mono text-body text-foreground">
              {filename ?? 'unnamed sample'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* R4 — this whole report is probabilistic observation, kept as an integrity signal. */}
            <span className="inline-flex items-center gap-1 rounded border border-dashed border-probabilistic/40 bg-probabilistic/10 px-2 py-1 text-caption leading-none text-probabilistic">
              <FlaskConical className="size-3.5" aria-hidden />
              Probabilistic
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-2 py-1 text-caption leading-none',
                band.pill,
              )}
            >
              <ShieldAlert className="size-3.5" aria-hidden />
              {overview.score === null ? band.label : `Score ${overview.score}/10 · ${band.label}`}
            </span>
            <Badge variant="muted">{data.status}</Badge>
          </div>
        </div>

        {overview.families.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-caption text-muted-foreground">Observed family:</span>
            {overview.families.map((family) => (
              <Badge key={family} variant="outline">
                {family}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <SignaturesSection signatures={overview.signatures} />
      <TargetsSection targets={overview.targets} />
      <SampleDetails sample={overview.sample} />
    </div>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Badge variant="muted">{count}</Badge>
    </div>
  );
}

function SignaturesSection({ signatures }: { signatures: SandboxSignature[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeading label="Behavioural signatures" count={signatures.length} />
      {signatures.length === 0 ? (
        <Card>
          <EmptyState
            icon={Radar}
            title="No signatures fired"
            message="The sandbox flagged no behavioural detections for this sample. Absence of a signature is not proof of safety."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {signatures.map((sig) => (
            <li
              key={sig.name}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface-1 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ShieldAlert className="size-3.5 shrink-0 text-probabilistic" aria-hidden />
                <span className="text-body font-medium text-foreground">{sig.name}</span>
                {sig.score !== null && <Badge variant="muted">score {sig.score}</Badge>}
              </div>
              {/* MITRE ATT&CK — behaviour-derived, present-only (only signatures that carry a ttp). */}
              {sig.ttp.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                    ATT&amp;CK
                  </span>
                  {sig.ttp.map((ttp) => (
                    <span
                      key={ttp}
                      className="inline-flex items-center rounded-md border border-probabilistic/40 bg-probabilistic/10 px-1.5 py-0.5 font-mono text-micro font-semibold text-probabilistic"
                    >
                      {ttp}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TargetsSection({ targets }: { targets: SandboxTarget[] }) {
  if (targets.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <SectionHeading label="Targets" count={targets.length} />
      <ul className="flex flex-col gap-1.5">
        {targets.map((target, index) => (
          <li
            key={`${target.target ?? 'target'}:${index}`}
            className="flex flex-col gap-1 rounded-md border border-border bg-surface-1 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Target className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="break-all font-mono text-caption text-foreground">
                {target.target ?? 'unnamed target'}
              </span>
              {target.score !== null && <Badge variant="muted">score {target.score}</Badge>}
            </div>
            {(target.family.length > 0 || target.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {target.family.map((family) => (
                  <Badge key={`fam:${family}`} variant="outline">
                    {family}
                  </Badge>
                ))}
                {target.tags.map((tag) => (
                  <Badge key={`tag:${tag}`} variant="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SampleDetails({ sample }: { sample: ReturnType<typeof parseOverview>['sample'] }) {
  const rows: { label: string; value: string }[] = [];
  if (sample.type) rows.push({ label: 'Type', value: sample.type });
  if (sample.size !== null) rows.push({ label: 'Size', value: formatBytes(sample.size) });
  if (sample.sha256) rows.push({ label: 'SHA-256', value: sample.sha256 });
  if (sample.md5) rows.push({ label: 'MD5', value: sample.md5 });
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <SectionHeading label="Sample" count={rows.length} />
      <Card>
        <dl className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <dt className="w-20 shrink-0 text-caption text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 break-all font-mono text-caption text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}
