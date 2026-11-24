# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

The web client of Dulo, a self-hosted family tree app. The server is a separate repository,
usually checked out at `../server`. Start Claude Code from the parent directory that holds both
checkouts, or from here with `claude --add-dir ../server`.

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
`image.yml` builds and smoke-tests the Docker image on pull requests that touch it, as a matrix
with one native runner per platform (`ubuntu-26.04` and `ubuntu-26.04-arm`).

## Docker image

This repository builds the one Dulo image: the server JAR plus the web client, served by nginx.

- `Dockerfile`: client build (native platform), server stage (extracts the JAR, jdeps + jlink a
  trimmed Java runtime), Alpine runtime with nginx and tini, user `dulo`. Base image tags are
  literal so Dependabot updates them.
- The server version is `ARG SERVER_VERSION` in the `Dockerfile`. `scripts/fetch-server.sh`
  downloads that JAR into `dist/server/` and runs `gh attestation verify` against the server's
  release workflow; the build copies it from there. Bump the ARG for a new server release.
- `docker/entrypoint.sh` starts the server on `127.0.0.1:8081` (command-line arguments, so no
  setting can move it) and nginx on `:8080`, and exits when either stops.
- `docker/nginx.conf` passes `/api/`, `/oauth2/`, `/login/`, `/connect/`, `/.well-known/`,
  `/userinfo` and `/actuator/health` to the server; everything else is the client, with
  `index.html` for app routes. A new server path must be added there. It sends
  `X-Forwarded-Proto` and `X-Forwarded-Port` (from an outer proxy, else the `Host` header), and the
  image sets `SERVER_FORWARD_HEADERS_STRATEGY=native`: the server builds absolute redirects (back
  to `/oauth2/authorize` after the identity provider) from them, and Tomcat assumes port 80 or 443
  without a port header.
- `docker/security-headers.mjs` writes the client's CSP at build time, with the sha256 of every
  inline script in `index.html`, so inline scripts need no other change.
- The image's outside (port 8080, `/config/dulo.yaml`, `/data`, `DULO_*` variables) is the
  contract with users; keep it stable.
- `release.yml` (by hand: major|minor|patch) takes the version from the latest `v*` tag. A matrix
  builds each platform on a native runner and pushes it by digest; the publish job joins them as
  `ghcr.io/dulo-family/dulo:{X.Y.Z, X.Y, latest}` (`docker buildx imagetools create`), attests
  that digest and creates the GitHub release. `package.json` keeps `0.0.0`.
- Test locally: `scripts/fetch-server.sh && docker build -t dulo:dev . &&
scripts/smoke-test-image.sh dulo:dev`.

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
  `IcuTranspiler` formats them with `intl-messageformat`, which interprets messages: the image's
  Content Security Policy has no `'unsafe-eval'`, so no code may compile strings with `eval` or
  `new Function` (as `@messageformat/core` did).
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
- Routing (`app.routes.ts`): the app's own pages are children of the `''` route, whose
  `canActivateChild` leads to the setup while it's pending (`setupCompletedGuard`) and to
  `/sign-in?returnTo=…` without a session (`signedInGuard`); add new pages there. `/setup` has
  `setupPendingGuard`, which leads home once the setup is done; `/sign-in` and `/auth/callback`
  are always open. `SetupStatus` (`src/app/core/setup`) asks `GET /setup/status` once per page
  load. The review step marks it completed, and the `setup-required` interceptor marks it pending.
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
- Buttons and forms that do something (submit, sign in or out) run it through `action()`
  (`src/app/ui/action/action.ts`) and disable the button with its `busy()`: a second click or
  Enter is ignored until it has finished. `leavesPage: true` keeps it busy after a redirect, until
  the browser shows the page again from its back/forward cache. Setup steps pass theirs as
  `[action]` to `<dulo-setup-step>`.
- Grid layouts that hold long unbreakable content (YAML, ids) use `minmax(0, 1fr)` columns, or
  the content widens the page.
- American English in code and in `en.json`.
- Branches: `feat/`, `fix/`, `chore/`; PRs close their issue with `Closes #n`.
