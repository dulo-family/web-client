#!/bin/sh
# Runs the Dulo server and the web server side by side. When either one stops, it stops the other
# and exits with the server's status, so Docker can restart the container. tini (PID 1) passes
# SIGTERM on to this script.
set -eu

mkdir -p /tmp/nginx

# Command-line arguments win over every other setting, so the server stays behind nginx.
java -XX:MaxRAMPercentage=75 --enable-native-access=ALL-UNNAMED \
  -jar /app/dulo-server.jar --server.address=127.0.0.1 --server.port=8081 &
server=$!

nginx -c /etc/dulo/nginx.conf -e stderr -g 'daemon off;' &
web=$!

stop() {
  # The server shuts down gracefully on SIGTERM, nginx on SIGQUIT.
  kill -TERM "$server" 2>/dev/null || true
  kill -QUIT "$web" 2>/dev/null || true
}
trap 'stop' TERM INT

# Check every second that both still run. (BusyBox's `wait -n` misses a child that died before it
# was called, so it can't be trusted here.) Each `wait` reaps a dead child, so `kill -0` fails for
# it afterwards, and it returns at once when a trapped signal arrives.
while kill -0 "$server" 2>/dev/null && kill -0 "$web" 2>/dev/null; do
  sleep 1 &
  wait $! || true
done
stop
status=0
wait "$server" || status=$?
wait "$web" || true
exit "$status"
