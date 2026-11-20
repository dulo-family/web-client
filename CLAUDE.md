# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

The web client of Dulo, a self-hosted family tree app. The server is a separate repository,
usually checked out at `../server` (start Claude Code with `claude --add-dir ../server`).

- API contract: `../server/api/openapi.json`.
- Auth flow (Dulo is its own OAuth2 server, the SPA is the public PKCE client `dulo-web`):
  `../server/src/site/markdown/authentication.md`.
- Dev server config the client must match: `../server/deploy/dev/dulo.dev.yaml` (client on
  `http://localhost:5173`, callback `/auth/callback`, sign-in page `/sign-in`).

## Commands

- `npm start`: dev server on port 5173
- `npm test`: Vitest unit tests, once (`npm run test:watch` to watch)
- `npm run lint`: angular-eslint
- `npm run format` / `npm run format:check`: Prettier
- `npm run build`: production build in `dist/dulo-web/browser`

CI (`.github/workflows/ci.yml`) runs lint, format check, tests and build on pull requests only.

npm 12 blocks dependency install scripts. `allowScripts` in `package.json` denies the ones we
don't need (the packages ship prebuilt binaries). Review new entries with
`npm install-scripts ls`.

## Stack

Angular 22: standalone components, signals, zoneless, strict TypeScript and templates,
`@angular/build` (esbuild). Unit tests with Vitest through `ng test`. Angular CDK as the base for
our own components; no Angular Material.

## Architecture (planned in M1)

```
src/app/
  core/      api (generated types + typed services, problem+json), auth (PKCE), i18n, theme, setup
  ui/        own reusable components on the CDK
  features/  setup wizard, sign-in, home, ...
public/i18n/ translations (en, bg)
```

## Conventions

- Components are standalone, use signals and `ChangeDetectionStrategy.OnPush`.
- Selector prefix `dulo`.
- No third-party requests at runtime (no web fonts, CDNs or analytics).
- Styles use the design tokens in `src/styles/tokens.css` (custom properties, colors via
  `light-dark()`); don't hard-code colors, spacing or durations in components. The theme is
  `data-theme` on `<html>` (absent = system), set by `ThemeService` and, before Angular boots, by
  the inline script in `src/index.html`; both use the storage key `dulo.theme`.
- The splash in `src/index.html` is removed by `SplashService` after the first navigation settles,
  so guards that decide the start route keep it up. Critical-CSS inlining is off: the global
  stylesheet is small and render-blocking, so the splash and the stored theme paint correctly
  from the first frame.
- Wrap every `localStorage`/`sessionStorage` access in try/catch; storage can be blocked.
- API errors are RFC 9457 problem details with `urn:dulo:problem:*` types; translate by `type`,
  never show the server's English `title` when a translation exists.
- American English in code and in `en.json`.
- Branches: `feat/`, `fix/`, `chore/`; PRs close their issue with `Closes #n`.
