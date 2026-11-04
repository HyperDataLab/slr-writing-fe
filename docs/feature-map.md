# FE Feature Map

Updated: 2026-11-05

The UI is one persistent Google Docs / VS Code-inspired workspace. Explorer selection changes the center work area and contextual inspector without leaving the shell.

| Feature | FE location | Connected Writing BE API | Main behavior |
| --- | --- | --- | --- |
| Local development role picker | `src/features/auth/` | SLR BE quick-login via Vite `/slr-api` proxy | Select reviewer, leader, or admin fixture; hold session in `sessionStorage` |
| Shared API client | `src/shared/api/client.ts` | `/api/*` | Bearer token, dev user header, envelope/error handling, ZIP download |
| Project linking and discovery | `src/features/workspace/Workspace.tsx` | `GET/POST /api/projects`, `GET /api/slr/projects` | Link a Writing project to an accessible SLR project |
| Run discovery and snapshot import | `Workspace.tsx` | `GET /api/slr/projects/:id/runs`, `POST /api/projects/:id/snapshots/from-slr` | Import approved SLR run; show blockers/warnings from backend readiness |
| Snapshot explorer and inspector | `Workspace.tsx` | `GET /api/projects/:id/snapshots`, `GET .../:snapshotId` | Browse immutable snapshots, counts, provenance, and readiness issues |
| Methods / PRISMA | `Workspace.tsx` | `GET/POST .../manuscript/methods` | Generate evidence-derived Methods and show facts/warnings |
| Journal profile | `Workspace.tsx` | `GET /api/journal-profiles`, `GET /:profileId` | Show verification notice, structure, and suggested word budgets |
| Outline / H1 | `Workspace.tsx` | `GET/POST/PUT .../manuscript/blueprint`, `POST .../approve|reject` | Generate, edit as a revision, inspect blockers, request OWNER approval |
| Paragraph plan | `Workspace.tsx` | `GET/POST/PUT .../manuscript/paragraph-plans` | Generate plans after approved H1; show readiness and evidence counts |
| Manuscript / H2 | `Workspace.tsx` | `GET/POST .../manuscript/sections/:sectionKey` | Generate evidence-grounded drafts, edit/save revisions, request H2 approval |
| Verification | `Workspace.tsx` | `GET .../manuscript/verification`, `POST .../verification/run` | Run and inspect quality-gate report |
| Final approval / export | `Workspace.tsx` | `GET .../final/status`, `POST .../final/approve|reject`, `POST/GET .../export`, `GET .../export/download` | Backend-gated H3 decision, create and download submission package |

## Explicit limitations

- Dev role picker is local-only. No production Firebase sign-in is connected in this rebuild.
- The BE does not expose ZIP project-package upload, so the FE imports SLR runs through Writing BE.
- H1/H2/H3 authorization and readiness are decided by the BE. FE state is a view of the current backend response, never the authority.
- The editor currently exposes outline JSON and Markdown draft text areas. Rich-text formatting controls and citation/evidence selection editing are not part of this API connection pass.
- Lineage/citation-manifest history endpoints exist in Writing BE but do not yet have dedicated inspector interactions.
