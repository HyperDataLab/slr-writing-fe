# FE Feature Map

This repository is the SLR AI Writing frontend. Every workflow in the table below is implemented and wired to the writing backend (verified 2026-11-06); the remaining work is listed under "Open items".

See [`spec.md`](./spec.md) for the onboarding context and current implementation status. Projects and Snapshots currently connect to the writing backend using opt-in local dev-auth; Firebase auth remains deferred and is required before production use of protected endpoints.

## Base stack

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui source components with Radix UI primitives, Heroicons, Motion for React, and GSAP.

## Feature boundaries

| Feature | Responsibility | Roadmap alignment |
| --- | --- | --- |
| `auth` | Hold the signed-in user session, pass the Firebase ID token, and protect authenticated routes. | M1 |
| `projects` | List, create, and open writing projects linked to an SLR project. | Existing project API; M1 permission check |
| `snapshots` | Import a run, show immutable snapshot history/details, and present readiness issues and stale state. | M0, M10 |
| `methods` | Generate and review deterministic Methods revisions from a READY snapshot; show PRISMA facts, source paths, and missing-data warnings. | M2 |
| `journal-profiles` | List and view read-only journal profiles, preserve section order and expected sources, and clearly label verification status and suggested word budgets. | M3 |
| `outline` | Generate and version a manuscript blueprint from a READY snapshot and Journal Profile; assign snapshot claims, show RQ coverage and backend issues, and request H1 approval. Profile section order is fixed; subsections can be reordered. OWNER authorization is enforced by the backend. | M5 |
| `paragraph-plans` | Generate and show paragraph plans from the approved blueprint, with per-section status and the backend's readiness issues. Implemented as its own feature, not under `manuscripts`. | M6 |
| `drafting` | Draft a section from READY plans, show markdown with evidence markers, record OWNER H2. Methods is excluded (it has its own page). | M7 |
| `verification` | Run and show G1–G7 (`NOT_RUN` and `NOT_APPLICABLE` stay distinct from `PASS`), review issues, and the citation manifest. | M8 |
| `approvals` | Not a feature folder: H1 lives in `outline`, H2 in `drafting`, H3 in `export`. Each presents the OWNER decision with its recorded provenance. | Cross-cutting workflow |
| `export` | Show H3 readiness (`blockingReasons`, `requiredSections`, `omittedSections`), record H3, create and download the package, and query evidence lineage. | M9 |
| `manuscripts` | Reserved name from the original plan; no folder exists. | n/a |

## Delivery status

1. `projects` → `snapshots`: done. Local backend dev-auth only; `auth` is still missing.
2. `methods` → `journal-profiles` → `outline`: done (Outline/H1 uses optimistic-concurrency revisions and OWNER decisions).
3. `paragraph-plans` → `drafting` (H2): done; read, generate and approve only.
4. `verification`: done.
5. `export` → H3: done.

## Open items

- Manual edit of a draft and of paragraph plans (the BE `PUT` routes exist).
- Picker for approved SLR runs (import currently takes a typed `runId`).
- Translate `paragraph-plans`, `drafting`, `verification`, and `export` into both locales.
- Firebase `auth`: token via `setApiTokenProvider`, protected routes.
- A run with real evidence to exercise G2/G5.

## UI invariants

- Use Heroicons React for interface icons; keep one icon library across features.
- Writing views read saved snapshots; they do not read live SLR corpus data.
- Findings, counts, and reference records are never edited by the writing UI.
- Citations must resolve to IDs in the snapshot registry.
- `NOT_RUN` is visibly distinct from `PASS`; blocking issues prevent the next workflow step.
- The default journal profile is always labeled as unverified.
- Suggested word budgets must not be presented as a target journal's policy; display the backend notice while a profile is unverified.
- H1, H2, and H3 are OWNER decisions and must be recorded with provenance by the backend.

## Feature folder convention

Each implemented feature owns its API calls, components, hooks/composables, pages, model types/schemas, and helpers. Cross-feature primitives stay in `shared/`; route composition and global providers stay in `app/`. Avoid creating placeholder files for roadmap features before they have behavior to own.
