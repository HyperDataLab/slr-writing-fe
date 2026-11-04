# SLRW Frontend Specification

Updated: 2026-11-05

## Product shape

SLRW is a single writing workspace inspired by Google Docs and VS Code. After local development sign-in, the user stays in a three-column shell:

- **Explorer:** Writing projects, snapshots, Methods / PRISMA, journal profile, outline / H1, paragraph plans, manuscript sections / H2, verification, final approval, and export.
- **Work area:** The selected item opens here. Import, review, editing, and workflow checks do not navigate to separate dashboard pages.
- **Inspector:** Snapshot provenance/readiness, Methods warnings, profile status, outline checks, paragraph evidence links, and workflow results.

The top menubar has File, Edit, Review, Verify, and Export. Text formatting is only relevant in the manuscript editor; workflow commands call the Writing BE and are disabled when their required project/snapshot/revision is missing.

## API and data flow

The browser calls the Writing BE for project data and all writing workflows. Writing BE calls the SLR BE with the user's SLR token when it needs SLR projects, runs, or owner decisions. The FE calls SLR BE directly only for development quick-login.

| Purpose | FE endpoint | Backend endpoint |
| --- | --- | --- |
| Local role sign-in | `/slr-api/auth/dev/quick-login` | SLR BE `POST /api/auth/dev/quick-login` |
| Writing projects | `/api/projects` | Writing BE projects API |
| SLR projects and runs | `/api/slr/projects`, `/api/slr/projects/:id/runs` | Writing BE SLR discovery; it forwards the bearer token |
| Import an approved run | `/api/projects/:id/snapshots/from-slr` | Writing BE pulls the run and creates an immutable snapshot |
| Snapshot detail/readiness | `/api/projects/:id/snapshots/:snapshotId` | Writing BE |
| Methods / PRISMA | `.../manuscript/methods` | Writing BE generator and revision API |
| Journal profile | `/api/journal-profiles` and `/:profileId` | Writing BE |
| Outline / H1 | `.../manuscript/blueprint` | Writing BE; SLR project OWNER controls approval |
| Paragraph plan | `.../manuscript/paragraph-plans` | Writing BE; generation requires approved H1 |
| Manuscript / H2 | `.../manuscript/sections/:sectionKey` | Writing BE; drafting uses approved outline and paragraph plan |
| Verification | `.../manuscript/verification` | Writing BE quality gates and report |
| Final approval / export | `.../manuscript/final/*`, `.../manuscript/export*` | Writing BE; H3 and gates remain backend-authoritative |

All FE writes use the current project and snapshot identifiers. A snapshot is never edited in the FE. Readiness blockers returned as `422 SNAPSHOT_NOT_READY` are shown from the BE report, including issue codes and messages. Warnings on a successful import remain attached to the snapshot.

### Local API proxy and development session

- Vite sends `/api/*` to Writing BE, default `http://localhost:5100`.
- Vite sends `/slr-api/*` to SLR BE, default `http://localhost:5000`, rewriting the prefix to `/api`.
- Override targets with `VITE_WRITING_API_TARGET` and `VITE_SLR_API_TARGET` in a local `.env` file; `.env.example` documents the defaults.
- The dev sign-in selector offers the SLR BE fixture aliases `reviewer`, `leader`, and `admin`. The token and user ID are kept in `sessionStorage`.
- Writing BE requests include `Authorization: Bearer <accessToken>` and `X-Dev-User-Id: <userId>`. The latter is needed when Writing BE is running with its explicit development auth mode and no Firebase token verifier.
- This role selector is a development convenience, not production authentication. Production sign-in is not implemented in this FE reset.

## Import contract

The first work item after signing in is to link a Writing project to an SLR project the selected identity can access. The Explorer then offers approved SLR runs from Writing BE discovery. Import sends only `{ "runId": "..." }` to `POST /api/projects/:projectId/snapshots/from-slr`; Writing BE fetches and validates source artifacts server-side.

The Writing BE currently has no ZIP package upload endpoint. The FE must not simulate ZIP import or post untrusted corpus data to the manual import/validate routes. If a run is blocked, no snapshot is created and the FE presents the returned readiness report.

## Current implementation

- React + TypeScript + Vite.
- Tailwind CSS v4; local shadcn-style components use Radix UI primitives, currently Radix Menubar.
- Heroicons for workspace navigation and actions.
- Motion for subtle view transitions. GSAP remains available for later intentional motion work.
- Development role selection, session persistence, typed API client, project linking/discovery, run import, snapshot readiness, and the writing workflow endpoints listed above are connected.
- The main workspace is a persistent three-column shell; no React Router page navigation is used for its modules.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

Start both backends separately for integrated local use. Writing BE requires its database and explicit dev-auth configuration; SLR BE requires its Firebase/emulator configuration and the dev quick-login endpoint enabled.
