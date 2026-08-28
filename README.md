# QAIF Frontend — Investigator Console

The investigator UI for **QAIF**, a national DFIR (digital forensics / incident response)
intelligence platform. It is a dark, sober "security console" that consumes the platform's
**read-only** FastAPI backend over HTTP.

This is a standalone repository, independent of the Python backend.

> **Status: Stage A of 3 — scaffold + design-system foundation.**
> Feature views (graph, timeline, tables) arrive in stages B and C. This stage builds the
> foundation those views stand on: the design-token system, the primitive components, and the
> typed API client — plus a demo page that proves the visual language.

---

## What this is

QAIF assembles one case from many evidence sources into a single graph under a single chain of
custody. Two forensic invariants shape everything in this UI:

- **R4 — tier separation.** _Confirmed_ evidence and _probabilistic_ inference are never merged.
  Here that separation is **visual and structural**, not just a text label (see below).
- **R6 — AI is advisory, not evidence.** AI suggestions are quarantined into their own visibly
  distinct treatment and never look like a confirmed finding.

These rules are encoded in the design tokens and enforced again at the API boundary by Zod, so a
mis-tiered or unannounced-AI payload fails validation before it can render.

---

## Stack

A curated, coherent set:

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | React 18 + TypeScript (strict) + Vite 6            |
| Styling            | Tailwind CSS + shadcn/ui conventions (Radix)       |
| Icons              | Lucide (the single icon system)                    |
| Server state       | TanStack Query _(installed; wired in B/C)_          |
| Data tables        | TanStack Table _(installed; wired in B/C)_          |
| Validation / forms | Zod (API boundary) + React Hook Form               |
| Graph / timeline   | Cytoscape.js + vis-timeline _(installed; wired in C)_ |

---

## Getting started

```bash
# 1. Install
npm install

# 2. Point at the backend (optional; defaults to http://localhost:8000)
cp .env.example .env.local
#   edit VITE_API_BASE_URL if your backend runs elsewhere

# 3. Run the dev server → http://localhost:5173
npm run dev
```

### Scripts

| Script                 | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Vite dev server (HMR).                         |
| `npm run build`        | `tsc --noEmit` (strict) then `vite build`.     |
| `npm run typecheck`    | Strict type-check only.                        |
| `npm run lint`         | ESLint (flat config).                          |
| `npm run format`       | Prettier write.                                |
| `npm run preview`      | Serve the production build.                    |

Stage A verification: `npm run build`, `npm run typecheck`, and `npm run lint` all pass, and the
dev server renders the design-system demo page.

---

## How it connects to the backend

- The backend is the read-only QAIF API (`modules/api` in the backend repo). Its OpenAPI schema is
  vendored at [`openapi/qaif-openapi.json`](openapi/qaif-openapi.json).
- The base URL comes only from the environment: **`VITE_API_BASE_URL`** (default
  `http://localhost:8000`). No secret ever lives in the frontend.
- The fetch layer lives in [`src/api/client.ts`](src/api/client.ts); typed, Zod-validated endpoint
  functions (one per resource, plus the single suggestion-review write) live in
  [`src/api/endpoints.ts`](src/api/endpoints.ts).
- **Every response is validated against a Zod schema** ([`src/types/schemas.ts`](src/types/schemas.ts))
  before it reaches a component. The TypeScript types ([`src/types/api.ts`](src/types/api.ts)) are
  _derived_ from those schemas via `z.infer`, so runtime and compile-time contracts can't drift.
  Stage A wires the client but makes **no live calls** — the views consume it in B/C.

---

## Design-token philosophy

The visual language is the heart of stage A. It exists so the forensic invariants are impossible to
violate _by accident_: the confirmed/probabilistic/AI/integrity distinctions are encoded in color,
border, and iconography — then the primitive components are built on those tokens, selecting a
treatment only via a closed union type.

- **Tier (R4):** `confirmed` = cyan, solid border, filled check, full emphasis (a fact);
  `probabilistic` = amber, **dashed** border, dashed-circle icon, muted (an inference).
  Distinguishable before you read a word.
- **AI quarantine (R6):** a distinct violet, dashed, `AI · UNVERIFIED` signature that never reads
  as a finding.
- **Evidence integrity (R2/R3):** a solid emerald shield for verified hashes / intact custody; a
  loud red shield for a break.
- **Timeline ambiguity:** consistent dashed markers for `assumed_tz` / `precision_overlap` /
  `clock_skew` / `tie`.

Full reference: **[TOKENS.md](TOKENS.md)**.

### Primitive components (built on the tokens)

- [`TierBadge`](src/components/forensic/TierBadge.tsx) — confirmed vs probabilistic.
- [`AiBadge`](src/components/forensic/AiBadge.tsx) — `AI · UNVERIFIED`.
- [`IntegrityBadge`](src/components/forensic/IntegrityBadge.tsx) — verified / broken hash + custody.
- [`AmbiguityBadge`](src/components/forensic/AmbiguityBadge.tsx) — the four timeline states.
- [`Card`](src/components/ui/card.tsx) + the typographic scale.

They are all showcased on the demo page ([`DesignSystemPage`](src/features/design-system/DesignSystemPage.tsx)),
which is what the app renders in stage A.

---

## Project structure

```
src/
├── app/          App shell, providers (TanStack Query), entry point
├── api/          Fetch client + typed, Zod-validated endpoint functions
├── components/
│   ├── ui/       Neutral primitives (Badge, Card)
│   └── forensic/ Token-bound domain primitives (Tier/Ai/Integrity/Ambiguity badges)
├── features/     Feature areas (stage A: design-system demo)
├── lib/          Utilities (cn, shortHash)
├── styles/       globals.css — the design tokens live here
└── types/        Zod schemas (source of truth) + derived TS types
```

---

## License

Internal — part of the QAIF platform.
