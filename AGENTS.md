# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React 19 + TypeScript client. Entry flows live in `src/main.tsx` and `src/App.tsx`, reusable widgets under `src/components/`, and shared helpers in `src/lib/`. Keep any editor-specific assets beside their host component (for example `src/components/editor/`).
- Serverless Convex functions sit in `convex/` with domain-based modules (`chat.ts`, `cases.ts`, etc.) and the routing surface defined by `convex/router.ts`. Schema updates go through `convex/schema.ts`.
- Static guidance lives under `docs/`, while build tooling is at the repo root (`vite.config.ts`, `tailwind.config.js`, `eslint.config.js`).

## Build, Test, and Development Commands
- `npm run dev` launches Vite and `convex dev` together for a full-stack preview; use `npm run dev:frontend` or `npm run dev:backend` when troubleshooting a single layer.
- `npm run build` performs a production Vite build and should run cleanly before every PR.
- `npm run lint` type-checks both Convex and app TS projects, ensures the Convex router compiles once, and executes the Vite build. Treat it as the minimum regression gate.

## Coding Style & Naming Conventions
- Stick to 2-space indentation, TypeScript `strict` typings, and functional React components. Prefer hooks and `clsx` for conditional classes.
- Name files by feature (`AuditPanel.tsx`, `cases.ts`) and export React components in PascalCase. Convex actions/mutations should be verbs describing intent (`createTask`, `listCases`).
- Run ESLint + TypeScript via `npm run lint`; format JSX/CSS with Prettier defaults and Tailwind utility ordering.

## Testing Guidelines
- There is no dedicated automated test runner yet; rely on `npm run lint` plus manual QA of critical flows (auth, document editor, case management). When adding tests, colocate them beside components (`ComponentName.test.tsx`) and favor React Testing Library integrations.
- Keep Convex functions deterministic so they can be exercised through `convex dev --once` scripts or mock callers.

## Commit & Pull Request Guidelines
- Follow the existing short, present-tense style (`CasePanel: focus initial tab`, `chat: fix type top scrolling`). Reference the touched module and clearly state the effect.
- Each PR should include: context/issue links, a summary of functional changes, screenshots or screen recordings for UI tweaks, and notes on migrations or env vars touched.
- Confirm lint/build status locally and mention any skipped checks explicitly.

## Security & Configuration Notes
- Required env vars live under the `CONVEX_` namespace (e.g., `CONVEX_OPENAI_API_KEY`, `CONVEX_SITE_URL`). Never commit actual secrets; document needed keys in PRs and keep `.env.local` out of source control.
- When integrating new external services, route credentials through Convex configuration to avoid exposing them to the browser bundle.

## Convex Helpers
This project uses the convex-helpers library as the primary source of Convex best practices.

Must treat the following paths as authoritative sources of patterns:

- `convex-helpers-src/packages/convex-helpers/**`
- `convex-helpers-src/src/hooks/**`
- `convex-helpers-src/convex/**`
- `docs/convex-helpers.md`
- `src/lib/convex/**` (application-specific wrappers)

When generating or editing Convex code (both in `convex/` and `src/`):

- Prefer `customFunctions` and other server utilities from convex-helpers over hand-written boilerplate.
- Validate all arguments with Zod helpers from convex-helpers.
- Use relationship helpers for cross-table references where possible.
- Apply `actionRetry` and rate-limiting helpers for external API calls.
- On the client side, prefer `useStableQuery`, presence/session hooks and other React utilities from convex-helpers.
- Do not reimplement features that already exist in convex-helpers; instead, compose them.
