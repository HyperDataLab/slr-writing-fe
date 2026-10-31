# SLR AI Writing FE

Feature-based React + TypeScript frontend for the SLR AI Writing workspace.

## Start here

Contributors and AI agents should read [`docs/spec.md`](docs/spec.md) first for product context, current implementation status, frontend conventions, and the current auth sequencing decision. Use [`docs/feature-map.md`](docs/feature-map.md) for detailed module ownership and delivery mapping.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` if the backend proxy target needs to change.
3. Start the Vite server with `npm run dev`.

The development server proxies `/api` to `http://localhost:5100` by default. API requests use the envelope documented by the writing backend. Firebase authentication will provide the bearer token through `setApiTokenProvider` when the auth feature is implemented.

## Languages

The interface supports Vietnamese (`vi`, default) and English (`en`). Use the language selector in the app header; the selected language is saved in browser storage and applied to the document language.

## Checks

- `npm run typecheck` checks TypeScript without emitting files.
- `npm run build` type-checks and creates the production Vite bundle.

## Feature boundaries

See `docs/feature-map.md` for the module responsibilities, delivery sequence, and data-safety rules. Keep API calls and domain types inside their feature; put reusable UI primitives and infrastructure in `src/shared/`.

