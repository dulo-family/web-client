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
- `npm run api:types`: regenerates `src/app/core/api/schema.d.ts` from
  `../server/api/openapi.json` (checked in; run it when the server's API changes).
  `openapi-typescript` declares TypeScript 5 as a peer, so an `overrides` entry in `package.json`
  lets it use the project's TypeScript.

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
- Every user-facing text comes from `public/i18n/<lang>.json` through Transloco (`| transloco`
  pipe or `TranslocoService`). Keys are nested by area (`setup.token.title`,
  `problem.invalid-setup-token`, `feature.people.name`). Messages are ICU MessageFormat: use
  `{name}` placeholders, `plural` and `select`, never Transloco's `{{ }}` syntax, so the files stay
  usable on any translation platform. Add each key to every language;
  `src/app/core/i18n/translations.spec.ts` fails on missing keys or messages that don't parse.
- Languages are listed in `src/app/core/i18n/languages.ts`. `LocaleService` picks the start
  language (stored `dulo.lang`, else the browser's languages, else English), loads it before the
  first render and keeps `<html lang>` in sync. Component tests get Transloco with the real files
  from `provideI18nTesting()` in `src/testing/i18n.ts`.
- API errors are RFC 9457 problem details with `urn:dulo:problem:*` types; translate by `type`,
  never show the server's English `title` when a translation exists.
- API calls: build URLs with `apiUrl(inject(API_BASE_URL), '/path')` (`src/app/core/api/api.ts`;
  the base is `''` in production, `http://localhost:8080` in development via
  `src/environments`). Use the generated types (`Schemas['MeResponse']`, aliases in `api.ts`).
  Prefer `httpResource` for reads. Show errors with `ProblemMessages.message(error)`, which
  translates `problem.<code>` and covers network errors.
- Auth (`src/app/core/auth`): `AuthService.signIn(providerId, returnTo)` always sends `idp=`;
  `authInterceptor` adds the token to `${API_BASE_URL}/api/` calls only, refreshes before expiry
  and once after a 401. Refresh tokens live in localStorage (`dulo.auth.refreshToken`), access
  and ID tokens in memory. Tests replace full-page navigation through `BROWSER_LOCATION`.
- Setup wizard (`src/app/features/setup`): one route per step (`/setup/<step>`, `SETUP_STEPS`
  in `setup.store.ts`), each wrapped in `<dulo-setup-step>` (form, Enter continues, focus on the
  `[data-autofocus]` field, Back/Continue, errors sent back by later steps). `SetupStore` holds
  the state in signals, mirrored to sessionStorage (`dulo.setup`) so it survives the sign-in
  redirects; `setupStepGuard` only opens a step when every earlier step is valid.
  On request, the review step shows the server's configuration (`GET /setup/config`) merged
  with the wizard's values (`merged-configuration.ts`; the `yaml` library loads only then).
  Each value's comment is read as a source chain (`default → file x → environment variable Y`,
  `→` or `->`); all but the last source render struck through, and values the wizard sets end
  in `this setup`.
- Grid layouts that hold long unbreakable content (YAML, ids) use `minmax(0, 1fr)` columns, or
  the content widens the page.
- American English in code and in `en.json`.
- Branches: `feat/`, `fix/`, `chore/`; PRs close their issue with `Closes #n`.
