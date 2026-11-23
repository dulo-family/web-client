# syntax=docker/dockerfile:1

# Dulo in one image: the server (the attested JAR from its GitHub release) and the web client,
# served together by nginx on port 8080. Fetch the JAR first:
#
#   scripts/fetch-server.sh && docker build -t dulo .

# The server release the image bundles; scripts/fetch-server.sh reads it from here.
ARG SERVER_VERSION=0.4.0
# The base images have literal tags, so Dependabot can update them. Node.js is the version in
# .nvmrc, Java the server's.

# --- 1. Build the web client. It's the same on every architecture, so it builds natively.
FROM --platform=$BUILDPLATFORM node:26-alpine AS client
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public public
COPY src src
COPY docker/security-headers.mjs docker/
RUN npm run build \
 && node docker/security-headers.mjs dist/dulo-web/browser/index.html > dist/security-headers.conf

# --- 2. Unpack the server JAR and build a Java runtime with only the modules it uses, for the
#        target architecture.
FROM eclipse-temurin:25-jdk-alpine AS server
ARG SERVER_VERSION
COPY dist/server/dulo-server-${SERVER_VERSION}.jar /dulo-server.jar
RUN java -Djarmode=tools -jar /dulo-server.jar extract --layers --destination /layers \
 && java -Djarmode=tools -jar /dulo-server.jar extract --destination /exploded
# Modules found by jdeps, plus modules that are only loaded at runtime (charsets for database
# drivers, DNS lookups, management for health checks).
RUN modules="$(jdeps --ignore-missing-deps -q --recursive --multi-release 25 \
        --print-module-deps --class-path '/exploded/lib/*' /exploded/dulo-server.jar)" \
 && jlink \
        --add-modules "${modules},jdk.charsets,jdk.naming.dns,jdk.management,jdk.zipfs" \
        --strip-debug --no-man-pages --no-header-files --compress=zip-6 \
        --output /jre

# --- 3. Runtime image.
FROM alpine:3.24

ARG VERSION=dev
ARG SERVER_VERSION
LABEL org.opencontainers.image.title="Dulo" \
      org.opencontainers.image.description="Self-hosted family tree app: the Dulo server and web client" \
      org.opencontainers.image.source="https://github.com/dulo-family/web-client" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.version="${VERSION}" \
      com.dulo.server.version="${SERVER_VERSION}"

# With nginx in front, the server takes the client's address and scheme from X-Forwarded-*.
ENV JAVA_HOME=/opt/java \
    PATH=/opt/java/bin:$PATH \
    LANG=C.UTF-8 \
    DULO_DATA_DIR=/data \
    SERVER_FORWARD_HEADERS_STRATEGY=native

RUN apk add --no-cache nginx tini \
 && addgroup -S -g 10001 dulo \
 && adduser -S -D -H -u 10001 -G dulo dulo \
 && mkdir -p /data /config \
 && chown dulo:dulo /data

COPY --from=server /jre /opt/java
WORKDIR /app
COPY --from=server /layers/dependencies/ ./
COPY --from=server /layers/spring-boot-loader/ ./
COPY --from=server /layers/snapshot-dependencies/ ./
COPY --from=server /layers/application/ ./

COPY --from=client /src/dist/dulo-web/browser /srv/web
COPY --from=client /src/dist/security-headers.conf /etc/dulo/security-headers.conf
COPY --from=client /src/dist/dulo-web/3rdpartylicenses.txt /usr/share/doc/dulo/web-client-third-party-licenses.txt
COPY LICENSE /usr/share/doc/dulo/LICENSE
COPY docker/nginx.conf /etc/dulo/nginx.conf
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/dulo

USER dulo
EXPOSE 8080
VOLUME /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:8080/actuator/health/liveness || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/dulo"]
