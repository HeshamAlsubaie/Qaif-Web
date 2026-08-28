import { FileDigit, Fingerprint, Lock } from 'lucide-react';
import { type ReactNode } from 'react';

import { AiBadge } from '@/components/forensic/AiBadge';
import { AmbiguityBadge } from '@/components/forensic/AmbiguityBadge';
import { IntegrityBadge } from '@/components/forensic/IntegrityBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AmbiguityKind } from '@/types/api';

const AMBIGUITY_KINDS: AmbiguityKind[] = ['assumed_tz', 'precision_overlap', 'clock_skew', 'tie'];

const SAMPLE_HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="type-h3">{title}</h2>
        {description && <p className="type-caption max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, className, note }: { name: string; className: string; note?: string }) {
  return (
    <div className="space-y-1.5">
      <div className={`h-14 rounded-md border border-border/60 ${className}`} />
      <div className="type-label normal-case tracking-normal">{name}</div>
      {note && <div className="text-[0.65rem] text-muted-foreground/70">{note}</div>}
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <div className="type-label">Design System · Stage A</div>
        <h1 className="type-h1">Forensic visual language</h1>
        <p className="type-body max-w-2xl text-muted-foreground">
          A dark, sober security-console vocabulary. The point of these tokens is that R4 (confirmed
          vs probabilistic) and R6 (AI quarantine) are impossible to violate: the separation is
          encoded in color, border, and iconography, not left to a text label.
        </p>
      </header>

      {/* -- The headline proof: tier separation ---------------------------- */}
      <Section
        title="Tier separation (R4)"
        description="Confirmed and probabilistic are distinguishable before you read a word — cyan + solid border + filled check vs amber + dashed border + dashed-circle icon."
      >
        <div className="flex flex-wrap items-center gap-4">
          <TierBadge tier="confirmed" />
          <TierBadge tier="probabilistic" confidence={0.62} />
          <span className="type-caption">← same size, unmistakably different weight</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-l-2 border-l-confirmed">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <TierBadge tier="confirmed" />
                <span className="type-label">analysis.ioc</span>
              </div>
              <CardTitle className="pt-1">Known-bad C2 domain contacted</CardTitle>
              <CardDescription>
                Host resolved <span className="font-mono">evil.example</span> and beaconed. A
                grounded fact, cited to evidence.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <span className="type-caption">cites evidence #1</span>
              <IntegrityBadge verified hash={SAMPLE_HASH} />
            </CardFooter>
          </Card>

          <Card className="border-l-2 border-l-probabilistic [border-left-style:dashed]">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <TierBadge tier="probabilistic" confidence={0.82} />
                <span className="type-label">analysis.classifier</span>
              </div>
              <CardTitle className="pt-1 text-probabilistic-foreground">
                Likely Conti-family sample
              </CardTitle>
              <CardDescription>
                Classifier matched family strings — a provisional inference, shown with its
                confidence and never asserted as fact.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <span className="type-caption">method: string + import hashing</span>
              <IntegrityBadge verified hash={SAMPLE_HASH} />
            </CardFooter>
          </Card>
        </div>
      </Section>

      {/* -- AI quarantine -------------------------------------------------- */}
      <Section
        title="AI suggestion quarantine (R6)"
        description="Machine-generated leads get their own violet, dashed, unmistakably-not-a-finding treatment. They announce themselves as unverified and are never mixed into findings."
      >
        <div className="flex flex-wrap items-center gap-4">
          <AiBadge />
          <AiBadge reviewed />
        </div>
        <Card className="border border-dashed border-ai/50 bg-ai/[0.04]">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <AiBadge />
              <span className="type-label text-ai/80">agent.shadow</span>
            </div>
            <CardTitle className="pt-1 text-ai-foreground">
              Pivot on the shared infrastructure
            </CardTitle>
            <CardDescription>
              Two sources converge on the same hosting range. An investigative lead for a human to
              approve or reject — <span className="font-semibold text-ai">NOT EVIDENCE</span>.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="type-caption">status: pending · awaiting human review</span>
          </CardFooter>
        </Card>
      </Section>

      {/* -- Evidence integrity --------------------------------------------- */}
      <Section
        title="Evidence integrity (R2 / R3)"
        description="A solid, secure shield grammar for verified hashes and intact custody; a loud red break when a hash mismatches or a custody gap appears."
      >
        <div className="flex flex-wrap items-center gap-4">
          <IntegrityBadge verified hash={SAMPLE_HASH} />
          <IntegrityBadge verified={false} label="Custody break" />
        </div>
        <Card>
          <CardContent className="space-y-3">
            <div className="type-caption flex items-center gap-2">
              <FileDigit className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-mono text-foreground/90">capture.pcap</span>
              <span className="text-muted-foreground">· pcap · 2,048 bytes</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-integrity-verified" aria-hidden />
              <span className="type-label normal-case tracking-normal">SHA-256</span>
              <code className="rounded bg-surface-2 px-2 py-1 text-[0.7rem] text-foreground/85">
                {SAMPLE_HASH}
              </code>
              <IntegrityBadge verified />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* -- Timeline ambiguity states -------------------------------------- */}
      <Section
        title="Timeline ambiguity states"
        description="Consistent markers for the four kinds of timing ambiguity the backend surfaces — always dashed, always provisional, never presented as resolved order."
      >
        <div className="flex flex-wrap items-center gap-3">
          {AMBIGUITY_KINDS.map((kind) => (
            <AmbiguityBadge key={kind} kind={kind} />
          ))}
        </div>
      </Section>

      {/* -- Palette -------------------------------------------------------- */}
      <Section
        title="Palette & elevation"
        description="Deep neutral surfaces (deepest → highest) and the four forensic hues that carry meaning."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="surface-0" className="bg-surface-0" note="app shell" />
          <Swatch name="surface-1" className="bg-surface-1" note="cards" />
          <Swatch name="surface-2" className="bg-surface-2" note="elevated" />
          <Swatch name="surface-3" className="bg-surface-3" note="hover / popover" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="confirmed" className="bg-confirmed" note="fact · cyan" />
          <Swatch name="probabilistic" className="bg-probabilistic" note="inference · amber" />
          <Swatch name="ai" className="bg-ai" note="quarantine · violet" />
          <Swatch
            name="integrity-verified"
            className="bg-integrity-verified"
            note="secure · emerald"
          />
        </div>
      </Section>

      {/* -- Typographic scale ---------------------------------------------- */}
      <Section
        title="Typographic scale"
        description="A restrained scale tuned for dense console UIs; hashes and IDs always in monospace."
      >
        <Card>
          <CardContent className="space-y-3">
            <div className="type-display">Display</div>
            <div className="type-h1">Heading 1</div>
            <div className="type-h2">Heading 2</div>
            <div className="type-h3">Heading 3</div>
            <div className="type-h4">Heading 4</div>
            <div className="type-body">Body — the default reading size for case content.</div>
            <div className="type-caption">Caption — secondary, muted context.</div>
            <div className="type-label">Label · uppercase micro</div>
            <div className="flex items-center gap-2 font-mono text-body">
              <Fingerprint className="size-4 text-muted-foreground" aria-hidden />
              0xa1b2…ff00 <span className="type-caption">monospace for hex / hashes / IDs</span>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
