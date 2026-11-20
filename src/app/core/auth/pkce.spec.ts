import { base64Url, codeChallenge, randomToken } from './pkce';

describe('PKCE', () => {
  it('computes the S256 challenge of the RFC 7636 example', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('makes 43-character base64url verifiers that differ each time', () => {
    const first = randomToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(first);
  });

  it('encodes base64url without padding', () => {
    expect(base64Url(new Uint8Array([0xfb, 0xff, 0xfe]))).toBe('-__-');
    expect(base64Url(new Uint8Array([0x61]))).toBe('YQ');
  });
});
