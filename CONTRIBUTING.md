# Contributing

## Workflow

1. Open or pick an issue.
2. Create a branch from `main`:
   - `feat/<short-name>` for features
   - `fix/<short-name>` for bug fixes
   - `chore/<short-name>` for build, CI and dependency changes
3. Open a pull request. Link its issue with `Closes #123`.
4. Pull requests are squash-merged once checks pass and the PR is approved.

CI runs on pull requests only: lint, format check, unit tests and the production build. Run the same
checks locally before you push:

```sh
npm run lint && npm run format:check && npm test && npm run build
```

By contributing, you agree that your contributions are licensed under the same terms as the
project: the [GNU AGPL v3.0 or later](LICENSE).

## Development setup

See [Development](README.md#development) in the README.

## Code style

- Prettier formats everything; ESLint (angular-eslint) checks TypeScript and templates, including
  the accessibility rules.
- Standalone components with signals and `OnPush` change detection. The app is zoneless.
- Selectors use the `dulo` prefix (`dulo-button`, `[duloAutofocus]`).
- UI components are our own, built on the Angular CDK. Don't add Angular Material or other
  component libraries.
- The app makes no requests to third parties at runtime: no web fonts, CDNs or analytics.
- American English in code, comments and English texts.

## Server API

The REST API is described by the OpenAPI document of the server
([`api/openapi.json`](https://github.com/dulo-family/dulo-server/blob/main/api/openapi.json)) and
its [docs site](https://dulo-family.github.io/dulo-server/).
