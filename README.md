# Dulo web client

Dulo is a self-hosted app for managing family trees. This repository holds the **web client**: the
Angular app people use in the browser. It talks to the
[Dulo server](https://github.com/dulo-family/dulo-server) through its REST API.

> **Status:** early development. The project scaffold is in place; theming, translations, sign-in
> and the setup wizard are coming next.

Dulo ships as one Docker image with the server and the web client. This repository will build that
image.

## Development

You need Node.js 26 (see `.nvmrc`) and a running Dulo server with its dev configuration.

1. Start the mock identity provider:

   ```sh
   docker run --rm -p 9090:8080 -e JSON_CONFIG='{"interactiveLogin": true}' \
     ghcr.io/navikt/mock-oauth2-server:6.1.5
   ```

2. In a checkout of [dulo-server](https://github.com/dulo-family/dulo-server), build and start the
   server with the dev configuration (setup token `dev-setup-token`):

   ```sh
   ./mvnw -B -DskipTests package
   DULO_CONFIG_FILE=deploy/dev/dulo.dev.yaml java -jar dulo-service/target/dulo-server-*.jar
   ```

3. Start the web client and open http://localhost:5173:

   ```sh
   npm ci
   npm start
   ```

### Scripts

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm start`            | Dev server on http://localhost:5173         |
| `npm test`             | Unit tests (Vitest), once                   |
| `npm run test:watch`   | Unit tests in watch mode                    |
| `npm run lint`         | ESLint for TypeScript and templates         |
| `npm run format`       | Format everything with Prettier             |
| `npm run format:check` | Check formatting, as CI does                |
| `npm run build`        | Production build in `dist/dulo-web/browser` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under the [GNU AGPL v3.0 or later](LICENSE).
