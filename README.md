# Dulo web client

Dulo is a self-hosted app for managing family trees. This repository holds the **web client**: the
Angular app people use in the browser. It talks to the
[Dulo server](https://github.com/dulo-family/dulo-server) through its REST API.

> **Status:** early development. Sign-in, the setup wizard and a placeholder home page work;
> administration and record editing come next.

Dulo ships as one Docker image with the server and the web client, which this repository builds.

## Running Dulo

The image is `ghcr.io/dulo-family/dulo`, for amd64 and arm64. It listens on port 8080, keeps its
data in the `/data` volume, and reads its configuration from `/config/dulo.yaml`. A minimal
configuration names the address people use and one identity provider:

```yaml
dulo:
  public-url: https://tree.example.com
  identity:
    providers:
      pocketid:
        type: oidc
        display-name: Pocket ID
        issuer-uri: https://id.example.com
        client-id: dulo
        client-secret: change-me
```

Register `https://tree.example.com/login/oauth2/code/pocketid` as the redirect URI at the identity
provider (the last part is the provider's key). Then start Dulo:

```sh
docker run -d --name dulo -p 8080:8080 \
  -v dulo-data:/data -v ./dulo.yaml:/config/dulo.yaml:ro \
  ghcr.io/dulo-family/dulo
```

Open the public URL and follow the setup. It asks for the setup token, which the server prints in
its log (`docker logs dulo`) until the setup is done.

- **HTTPS:** put Dulo behind your reverse proxy (Caddy, Traefik, nginx, …), which terminates TLS
  and forwards to port 8080. Dulo takes the scheme and port from its `X-Forwarded-Proto` and
  `X-Forwarded-Port` headers (without them, from the `Host` header), so its redirects stay on
  https.
- **Settings:** every value can also be an environment variable, such as `DULO_PUBLIC_URL`. The
  server's [README](https://github.com/dulo-family/dulo-server#readme) covers the database,
  identity providers, roles and the example configuration.
- **Example:** [Dulo with Tailscale and Pocket ID](docs/tailscale.md), a Docker Compose setup
  with HTTPS from Tailscale and sign-in with passkeys, without a reverse proxy or open ports.
- **Verify the image:** `gh attestation verify oci://ghcr.io/dulo-family/dulo:<version> --repo
dulo-family/web-client`. The server JAR inside is checked against the server's attestation when
  the image is built.

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

### Building the image

The image bundles the server release that `ARG SERVER_VERSION` in the `Dockerfile` names. Fetch
that JAR first: the script downloads it from the server's GitHub release and checks its
attestation, so it needs the GitHub CLI, signed in.

```sh
scripts/fetch-server.sh
docker build -t dulo:dev .
scripts/smoke-test-image.sh dulo:dev
```

Inside the image, nginx serves the web client on port 8080 and passes `/api/`, `/oauth2/`,
`/login/`, `/connect/`, `/.well-known/`, `/userinfo` and `/actuator/health` to the server, which
listens on `127.0.0.1:8081` only. Releases are started by hand with the `Release` workflow (major,
minor or patch), which publishes the image for amd64 and arm64.

### Scripts

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm start`            | Dev server on http://localhost:5173                        |
| `npm test`             | Unit tests (Vitest), once                                  |
| `npm run test:watch`   | Unit tests in watch mode                                   |
| `npm run lint`         | ESLint for TypeScript and templates                        |
| `npm run format`       | Format everything with Prettier                            |
| `npm run format:check` | Check formatting, as CI does                               |
| `npm run build`        | Production build in `dist/dulo-web/browser`                |
| `npm run api:types`    | Regenerate the API types from `../server/api/openapi.json` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under the [GNU AGPL v3.0 or later](LICENSE).
