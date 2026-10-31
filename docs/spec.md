# SLR AI Writing FE — Product and Engineering Spec

> Onboarding context for contributors and AI agents. Read this file first, then inspect the linked source documents and current code for the task at hand. This file summarizes the frontend; backend contracts and detailed module ownership remain in their source documents.

## 1. Product context

SLR AI Writing is the post-review writing workspace for the SLR system. It takes an approved review run, imports it as an immutable snapshot, checks whether that snapshot is ready, and then supports a controlled manuscript workflow. The intended output is a traceable manuscript package: each scientific claim can be followed back through evidence, finding, study, and source anchor.

The guiding product rule is: **AI may help write and edit prose; it must not change scientific data.** The FE presents and coordinates the workflow. The writing backend remains responsible for authorization, persistence, validation, provenance, and workflow gates.

## 2. Non-negotiable behavior

- Writing uses a saved, versioned snapshot. Do not read live SLR corpus data as the source for manuscript content.
- Treat snapshots as immutable. Changed source data produces a different snapshot; do not edit snapshot findings, counts, studies, or references in the writing UI.
- Citations must resolve to IDs in the snapshot registry. Never invent a DOI, reference, evidence ID, or citation.
- Fail closed: a blocking issue prevents the next workflow step. `NOT_RUN` is distinct from `PASS`.
- Keep missing, inferred, and explicit information distinct. Do not fill missing values with invented facts.
- The project OWNER makes H1 (outline), H2 (manuscript), and H3 (final package) decisions. The backend records the decisions and provenance.
- A fluent draft is not automatically a valid manuscript. Show readiness, verification, and unresolved issues clearly when those workflows are implemented.

The backend source for these requirements is [`PROJECT_GUIDE.md`](../PROJECT_GUIDE.md), especially its principles, snapshot readiness, API, and roadmap sections. See [`feature-map.md`](./feature-map.md) for the frontend invariants and module responsibilities.

## 3. Frontend architecture

### Stack

| Area | Choice |
| --- | --- |
| Application | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| UI primitives | shadcn/ui source-component patterns with Radix UI primitives |
| Styling | Tailwind CSS v4; semantic SLR tokens in `src/app/styles/tokens.css` |
| Icons | Heroicons React |
| Motion | Motion for React and GSAP; respect reduced-motion preferences |
| Validation | Zod |
| Localization | i18next and react-i18next |

The repository uses shadcn/ui patterns; `shadcn/ui` is not a runtime package dependency. The accepted stack decision and alternatives are recorded in [`adr/0001-frontend-stack.md`](./adr/0001-frontend-stack.md).

### Code ownership

- `src/app/`: app entry, routing, providers, shell, and global styles.
- `src/features/<feature>/`: feature-owned API methods, components, hooks, pages, types/schemas, and helpers.
- `src/shared/`: reusable UI primitives, API transport, localization, types, constants, and utilities.
- Keep business logic and API contracts within their feature. Put cross-feature infrastructure in `shared/`; do not add empty placeholder folders for roadmap modules.

## 4. Current frontend state

The app currently exposes `/` (Overview), `/projects`, and `/snapshots`, wrapped in the shared `AppShell`.

| Area | Present in code | Current limitation |
| --- | --- | --- |
| App shell | Responsive navigation, page title, shared layout | No authenticated-route guard yet |
| Overview | Product workflow and guardrail introduction | Informational screen |
| Projects | Page, empty state, project types/schema, API methods, and `useProjects` hook | Page currently renders the empty state; it does not load or create projects |
| Snapshots | Readiness information, report component, types/schema, import API method, and `useSnapshotImport` hook | Page is informational; import, history, and report flows are not connected |
| Auth | `setApiTokenProvider` seam in the API client | No Firebase session feature/provider, token wiring, or protected routes; **auth is deferred by the current FE delivery decision** |
| Methods through Export | Responsibilities and sequence are mapped | Roadmap only; no feature implementation yet |
| Localization | Vietnamese default, English option, header selector | New user-facing text must be added to both locales |

Do not describe a hook or API wrapper as a completed user flow unless the page actually calls it. Inspect the current route and component before extending a feature.

## 5. Module roadmap and sequencing

The ten planned modules are `auth`, `projects`, `snapshots`, `methods`, `journal-profiles`, `outline`, `manuscripts`, `verification`, `approvals`, and `export`. See [`feature-map.md`](./feature-map.md) for each module's full responsibility and backend milestone mapping.

Current FE sequencing decision: continue the Projects and Snapshot screens and their feature boundaries first; defer Firebase auth while building those UI foundations. Wire auth and the Firebase token provider **before connecting the pages to protected backend endpoints**. Then proceed through Methods/PRISMA and Journal Profile, Outline/H1, manuscript planning/drafting/H2, verification, and export/H3.

The backend contract still requires authentication for its routes. Deferring the FE auth module does not make protected API calls anonymous or authorize bypassing backend checks.

## 6. SLR visual system

`src/app/styles/tokens.css` is the source of truth for the palette:

| Token / role | Value |
| --- | --- |
| Primary / accent | `#0071BC` |
| Primary hover | `#005F9E` |
| Light blue tint | `#F0F7FC` |
| Main text | `#122331` |
| Secondary text | `#647381` |
| Main background | `#F7F9FA` |
| Surface / card | `#FFFFFF` |
| Border | `#DCE4E9` |

Use semantic Tailwind classes such as `bg-primary`, `text-muted-foreground`, and `border-border`; do not repeat these hex values in feature components.

## 7. Localization

- i18next is initialized in `src/shared/i18n/i18n.ts`; resource dictionaries live in `src/shared/i18n/resources.ts`.
- Vietnamese (`vi`) is the default; English (`en`) is supported. The header selector persists the choice in local storage and updates `document.documentElement.lang`.
- Initialize the app only after i18n resources are ready. Use `useTranslation()` for UI and validation messages.
- Add every new visible label, status, empty state, validation message, and generic error to both locales. Keep server-provided readiness codes/messages intact unless the backend contract explicitly provides translation keys.

## 8. API and environment

The shared client is `src/shared/lib/api-client.ts`. It prefixes feature paths with `/api`, sends the bearer token supplied by `setApiTokenProvider`, and parses the backend envelope:

```ts
{ success: true, data: ... }
{ success: false, error: { code, message, requestId?, details? } }
```

Feature API wrappers live alongside their feature, for example `src/features/projects/api/projects.api.ts` and `src/features/snapshots/api/snapshots.api.ts`. The Vite development proxy targets `http://localhost:5100` by default. Configure `VITE_API_PROXY_TARGET` to change that target; `VITE_API_BASE_URL` can set an API base URL. See [`.env.example`](../.env.example).

The FE calls the writing backend. It must not call `slr-be` directly for writing data; the writing backend owns the SLR integration and snapshot creation. Current endpoint definitions and error semantics are in [`PROJECT_GUIDE.md`](../PROJECT_GUIDE.md#8-api-hiện-có).

## 9. Local commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

`npm run build` runs `tsc --noEmit` and then creates a Vite production build. `package.json` currently has no test or lint script; do not invent project commands based only on the stack.

## 10. AI scout checklist

1. Read this spec first to understand product invariants, current status, and sequencing.
2. Read [`feature-map.md`](./feature-map.md) for the target module and [`adr/0001-frontend-stack.md`](./adr/0001-frontend-stack.md) for stack decisions.
3. For backend behavior, verify the relevant endpoint and invariant in [`PROJECT_GUIDE.md`](../PROJECT_GUIDE.md); then verify actual FE behavior in the route, page, hook, API wrapper, and types.
4. Before editing, distinguish implemented code from roadmap and static UI. Keep changes within the owning feature and its shared dependencies.
5. Update both locale resources for new UI copy, use semantic design tokens, and preserve snapshot, citation, readiness, and approval rules.
6. Read run commands from `package.json`; report only checks actually run.
