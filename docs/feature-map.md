# FE Feature Map

This repository is the SLR AI Writing frontend. The base shell, Projects, Snapshots, Methods/PRISMA, and Journal Profile are implemented; later manuscript workflows follow the sequence below.

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
| `outline` | Edit and reorder the manuscript blueprint, show research-question coverage, and request H1 approval. | M5 |
| `manuscripts` | Show paragraph plans and revisions, draft from the approved evidence pack, and request H2 approval. | M6–M7 |
| `verification` | Show citation-registry checks, G1–G7 results, and review issues. | M8 |
| `approvals` | Present OWNER-only H1/H2/H3 decisions with their recorded provenance. | Cross-cutting workflow |
| `export` | Present export eligibility and produce the Markdown package after H3. | M9 |

## Delivery order

1. `projects` → `snapshots`: connect project list/create and snapshot import-from-SLR/history/detail endpoints. Use local backend dev-auth only when explicitly configured; implement `auth` and Firebase token wiring before production use.
2. `methods` → `journal-profiles` → `outline`: Methods/PRISMA and the read-only M3 Journal Profile endpoints are connected. Next, build Outline/H1.
3. `outline` → `approvals` (H1): create and approve the blueprint.
4. `manuscripts` → `approvals` (H2): plan and draft paragraphs from snapshot evidence.
5. `verification`: validate citation IDs and quality gates; expose unresolved issues.
6. `export` → `approvals` (H3): enforce export gates and prepare the final package.

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
