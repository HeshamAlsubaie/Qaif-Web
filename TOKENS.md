# QAIF Design Tokens

The forensic visual language. Every token is a CSS variable in
[`src/styles/globals.css`](src/styles/globals.css) and is surfaced to Tailwind in
[`tailwind.config.ts`](tailwind.config.ts) as `hsl(var(--x) / <alpha-value>)`, so opacity
utilities (`bg-confirmed/10`) work everywhere.

The platform is **dark-first**: the dark palette lives on `:root` and `<html>` carries
`class="dark"`. There is no light theme in stage A.

Colors are stored as raw HSL channels (`H S% L%`), never wrapped in `hsl(...)`, so Tailwind can
inject the alpha channel.

---

## Why tokens, not classes

R4 (confirmed vs probabilistic) and R6 (AI is not a finding) are **forensic invariants**, not style
preferences. Encoding them as tokens — and building the badges on those tokens — makes the
separation _structural_: a component selects a treatment by a closed union (`tier`, `verified`),
so it cannot request a "confirmed-looking probabilistic" element. The visual distinction is
therefore impossible to violate by accident.

---

## Base palette — dark security console

| Token             | Meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `--background`    | App background base.                                 |
| `--foreground`    | Primary high-contrast text.                          |
| `--primary`       | The single restrained console accent (cyan).         |
| `--muted-*`       | De-emphasized text / fills.                          |
| `--border`        | Hairline dividers and outlines.                      |
| `--destructive`   | Hard failure / danger (generic).                     |

### Elevation surfaces (deepest → highest)

| Token         | Use                                     |
| ------------- | --------------------------------------- |
| `--surface-0` | App shell / deepest background.         |
| `--surface-1` | Cards, panels.                          |
| `--surface-2` | Elevated panels, table headers, chips.  |
| `--surface-3` | Hover, popovers, active rows.           |

Tailwind: `bg-surface-0…3`.

---

## Tier tokens — R4 made visual

The two tiers are distinguishable **before reading a word**, via three reinforcing signals:
hue **+** border style **+** icon.

| Tier            | Hue   | Border   | Icon           | Emphasis | Meaning                          |
| --------------- | ----- | -------- | -------------- | -------- | -------------------------------- |
| `confirmed`     | cyan  | solid    | filled check   | full     | A grounded, evidence-backed fact |
| `probabilistic` | amber | **dashed** | dashed circle | muted    | A provisional inference (w/ confidence) |

Tokens: `--confirmed`, `--confirmed-foreground`, `--confirmed-muted`, `--confirmed-border`
(and the `--probabilistic-*` set). Tailwind: `text-confirmed`, `bg-confirmed/15`,
`border-confirmed`, and the `probabilistic` equivalents.

Component: [`TierBadge`](src/components/forensic/TierBadge.tsx).

---

## AI-suggestion tokens — R6 made visual

AI output is **quarantined**: a distinct violet accent, a dashed border, a bot icon, and a live
"unverified" dot. It announces itself as machine-generated and awaiting human review, and can
never be mistaken for a confirmed finding — it is **NOT evidence**.

Tokens: `--ai`, `--ai-foreground`, `--ai-muted`, `--ai-border`. Tailwind: `text-ai`, `bg-ai/12`,
`border-ai`.

Component: [`AiBadge`](src/components/forensic/AiBadge.tsx) — renders `AI · UNVERIFIED`.

---

## Evidence-integrity tokens — R2 / R3

A solid, secure **shield/lock** grammar. Verified hashes and intact custody read as _secure_;
a break reads as an _alarm_ — heavier than a tier badge, because integrity is the platform's
bedrock and a break must never look like a soft warning.

| State      | Hue     | Icon          | Meaning                                   |
| ---------- | ------- | ------------- | ----------------------------------------- |
| `verified` | emerald | shield-check  | SHA-256 verified, custody chain intact    |
| `broken`   | red     | shield-alert  | Hash mismatch or custody gap              |

Tokens: `--integrity-verified-*`, `--integrity-broken-*`. Tailwind: `text-integrity-verified`,
`bg-integrity-verified/15`, `text-integrity-broken`, …

Component: [`IntegrityBadge`](src/components/forensic/IntegrityBadge.tsx) — maps the API's
`custody_verified` boolean; optionally shows a truncated digest in monospace.

---

## Status / ambiguity tokens — timeline

Consistent markers for the four kinds of timing ambiguity the backend surfaces. All are **dashed**
and provisional; they mark uncertainty and are never presented as a resolved order.

| Kind (API)          | Token                       | Label               | Meaning                              |
| ------------------- | --------------------------- | ------------------- | ------------------------------------ |
| `assumed_tz`        | `--ambiguity-assumed-tz`    | Assumed TZ          | A timezone was assumed, not recorded |
| `precision_overlap` | `--ambiguity-indeterminate` | Indeterminate order | Precision windows overlap            |
| `clock_skew`        | `--ambiguity-skew`          | Clock skew          | Cross-source clock disagreement      |
| `tie`               | `--ambiguity-tie`           | Tie                 | Simultaneous / indistinguishable     |

Tailwind: `text-ambiguity-assumed-tz`, `text-ambiguity-indeterminate`, `text-ambiguity-skew`,
`text-ambiguity-tie`.

Component: [`AmbiguityBadge`](src/components/forensic/AmbiguityBadge.tsx).

---

## Typography

A restrained scale tuned for dense console UIs. Hashes, hex, and IDs are **always** monospace so
tampering is visually obvious.

| Class          | Role                              |
| -------------- | --------------------------------- |
| `type-display` | Page hero.                        |
| `type-h1…h4`   | Headings.                         |
| `type-body`    | Default reading size.             |
| `type-caption` | Secondary, muted context.         |
| `type-label`   | Uppercase micro labels.           |
| `font-mono`    | Hashes / hex / IDs.               |

Font sizes are defined as theme tokens (`text-display`, `text-h1`, … `text-micro`) in
`tailwind.config.ts`; the `type-*` classes are semantic aliases over them.

---

## Radius, motion

- `--radius` (`0.5rem`) drives `rounded-sm/md/lg`.
- `animate-pulse-dot` — the AI "unverified" live dot (subtle, 2s).
