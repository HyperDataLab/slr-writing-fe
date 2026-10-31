# ADR-0001: Frontend stack

- Status: Accepted
- Date: 2026-10-31

## Context

The SLR AI Writing interface is being built in a separate frontend repository. The application needs a TypeScript component architecture, accessible UI primitives, and the requested SLR academic-blue design system.

## Decision

Use React + TypeScript + Vite. Build shared components in the shadcn/ui source style, using Radix UI primitives where interaction and accessibility behavior is needed. Use Tailwind CSS v4, Heroicons React, Motion for React, and GSAP.

## Alternatives considered

- Vue 3 + TypeScript with shadcn-vue and Reka UI would avoid React, but it would not use the requested shadcn/ui and Radix React packages directly.
- TypeScript with Vite and native HTML controls would avoid React, but would require replacing the requested component system.

## Consequences

- Application and feature components use `.tsx`; routing uses React Router.
- Feature-owned API calls, UI, hooks, models, and helpers stay under `src/features/<feature>/`.
- The first implementation establishes the shell and the Projects/Snapshots entry points. Firebase session wiring and backend-connected workflows remain follow-up modules.
- SLR color tokens are kept in `src/app/styles/tokens.css` and are mapped into Tailwind in `globals.css`.

