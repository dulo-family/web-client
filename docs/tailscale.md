# Dulo with Tailscale and Pocket ID

This Docker Compose example runs Dulo and [Pocket ID](https://pocket-id.org) (a self-hosted
identity provider with passkeys) on your [Tailscale](https://tailscale.com) network. Each one gets
its own machine name and an HTTPS certificate from Tailscale, so there's no reverse proxy, open port
or domain to set up:

- `https://dulo.<tailnet>.ts.net`: Dulo
- `https://pocketid.<tailnet>.ts.net`: Pocket ID

Each app shares the network of a Tailscale container (`network_mode: service:…`). Tailscale's
`serve` terminates TLS on port 443 and passes requests to the app on `127.0.0.1:8080`. Pocket ID
listens on 8080 too, so both use the same serve configuration.

With `AllowFunnel`, [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) also makes both
reachable from the internet, so family members don't need Tailscale. Remove the `AllowFunnel`
block to keep them on your tailnet only.

## Before you start

1. In the Tailscale admin console, [enable HTTPS](https://tailscale.com/kb/1153/enabling-https)
   and, for Funnel, add the `funnel` attribute to the machines in your policy file.
2. [Generate an auth key](https://tailscale.com/kb/1085/auth-keys) and tick **Reusable**: both
   Tailscale containers sign in with it.
3. Note your tailnet name (`<tailnet>.ts.net`, under **DNS** in the admin console) and replace
   `XXXXXX` below with it.
4. Generate a random encryption key for Pocket ID, e.g. `openssl rand -base64 32`.

## compose.yaml

```yaml
configs:
  tailscale:
    content: |
      {
          "TCP": {
              "443": {
                  "HTTPS": true
              }
          },
          "Web": {
              "$${TS_CERT_DOMAIN}:443": {
                  "Handlers": {
                      "/": {
                          "Proxy": "http://127.0.0.1:8080"
                      }
                  }
              }
          },
          "AllowFunnel": {
              "$${TS_CERT_DOMAIN}:443": true
          }
      }

  dulo:
    content: |
      dulo:
        public-url: https://dulo.XXXXXX.ts.net
        identity:
          providers:
            pocketid:
              type: oidc
              display-name: Pocket ID
              issuer-uri: https://pocketid.XXXXXX.ts.net
              client-id: XXX # From the OIDC client in Pocket ID
              client-secret: XXX # From the OIDC client in Pocket ID
              # Pocket ID sends the user's groups only for this scope.
              scopes: [openid, profile, email, groups]
              # Members of these Pocket ID groups get these Dulo roles at once.
              role-mappings:
                dulo_admins: admin
                dulo_editors: editor
              # Everyone else may look, once an administrator approves them.
              default-role: viewer
        registration:
          mode: approval

services:
  tailscale_dulo: &tailscale
    image: tailscale/tailscale:v1.104.2
    container_name: tailscale_dulo
    hostname: dulo
    environment:
      TS_AUTHKEY: XXX # The reusable auth key
      TS_STATE_DIR: /var/lib/tailscale
      TS_SERVE_CONFIG: /config/ts-serve.json
      TS_USERSPACE: false
      TS_ENABLE_HEALTH_CHECK: true
      TS_LOCAL_ADDR_PORT: 127.0.0.1:41234
      TS_ACCEPT_DNS: true
    configs:
      - source: tailscale
        target: /config/ts-serve.json
    volumes:
      - tailscale_dulo_state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - net_admin
      - sys_module
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://127.0.0.1:41234/healthz']
      interval: 1m
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: always

  dulo:
    image: ghcr.io/dulo-family/dulo:0.2
    container_name: dulo
    network_mode: service:tailscale_dulo
    configs:
      - source: dulo
        target: /config/dulo.yaml
    volumes:
      - dulo_data:/data
    depends_on:
      tailscale_dulo:
        condition: service_healthy
      pocket_id:
        condition: service_healthy
    restart: always

  tailscale_pocket_id:
    <<: *tailscale
    container_name: tailscale_pocket_id
    hostname: pocketid
    volumes:
      - tailscale_pocket_id_state:/var/lib/tailscale

  pocket_id:
    image: ghcr.io/pocket-id/pocket-id:v2.19.1
    container_name: pocket_id
    network_mode: service:tailscale_pocket_id
    environment:
      APP_URL: https://pocketid.XXXXXX.ts.net
      ENCRYPTION_KEY: XXX # The random encryption key
      PORT: 8080 # Same port as Dulo, so both use the same Tailscale configuration
      PUID: 1000
      PGID: 1000
    volumes:
      - pocket_id_data:/app/data
    depends_on:
      tailscale_pocket_id:
        condition: service_healthy
    healthcheck:
      test: ['CMD', '/app/pocket-id', 'healthcheck']
      interval: 1m30s
      timeout: 5s
      retries: 2
      start_period: 10s
    restart: unless-stopped

volumes:
  dulo_data:
  pocket_id_data:
  tailscale_dulo_state:
  tailscale_pocket_id_state:
```

To use a custom directory instead of the named volume for Dulo, map it in place of the volume.
Create the directory and `chown 10001:10001` it first: the image runs as user `10001`.

## Set up Pocket ID

1. Start Pocket ID's Tailscale container: `docker compose up -d tailscale_pocket_id`.
2. Create its HTTPS certificate. The serve configuration's `TS_CERT_DOMAIN` only works once the
   machine has one:
   `docker compose exec tailscale_pocket_id tailscale cert pocketid.XXXXXX.ts.net`
3. Start Pocket ID: `docker compose up -d pocket_id`.
4. Open `https://pocketid.XXXXXX.ts.net/setup` and create your account with a passkey.
5. Under **OIDC Clients**, add a client named Dulo with the callback URL
   `https://dulo.XXXXXX.ts.net/login/oauth2/code/pocketid` (the last part is the provider's key in
   the Dulo configuration). Copy its client ID and secret into the `dulo` config above.
   Turn on **PKCE**: Dulo signs in with PKCE at every identity provider, so Pocket ID can require
   it. Leave **Public client** off, since Dulo has a client secret.
   To sign users out of Dulo when they sign out of Pocket ID, also set the back-channel logout
   URL to `https://dulo.XXXXXX.ts.net/logout/connect/back-channel/pocketid`.
6. Under **User Groups**, create `dulo-admins` (and `dulo-editors`, if you want editors) and add
   yourself to `dulo-admins`. Allow the groups to use the Dulo client if you restrict it.

## Start Dulo

1. Start Dulo's Tailscale container: `docker compose up -d tailscale_dulo`.
2. Create its HTTPS certificate, as for Pocket ID:
   `docker compose exec tailscale_dulo tailscale cert dulo.XXXXXX.ts.net`
3. Start Dulo: `docker compose up -d`.
4. Get the setup token from the log: `docker compose logs dulo | grep -i "setup token"`.
5. Open `https://dulo.XXXXXX.ts.net` and follow the setup: it asks for the token, has you sign in
   with Pocket ID (you become the tree's administrator), and creates the tree.

Family members sign in with their own Pocket ID accounts. Members of a mapped group get their role
right away; everyone else waits until you approve them in Dulo.

## Updating

Change the image tags, then `docker compose pull && docker compose up -d`. The `0.2` tag of Dulo
follows the latest `0.2.x` release; pin an exact version such as `0.2.0` to update only on purpose.
