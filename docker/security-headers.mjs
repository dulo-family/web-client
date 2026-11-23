// Writes the nginx snippet with the security headers of the web client's pages. The Content
// Security Policy allows inline scripts only by their hash, so it is computed from the built
// index.html and can't drift from it.
//
//   node docker/security-headers.mjs dist/dulo-web/browser/index.html > security-headers.conf
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [indexFile] = process.argv.slice(2);
if (!indexFile) {
  console.error('Usage: node security-headers.mjs <index.html>');
  process.exit(1);
}

const html = readFileSync(indexFile, 'utf8');
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  ([, body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`,
);

const policy = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')}`.trim(),
  // Angular adds component styles as <style> elements.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

process.stdout.write(
  [
    `add_header Content-Security-Policy "${policy}" always;`,
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "same-origin" always;',
    '',
  ].join('\n'),
);
