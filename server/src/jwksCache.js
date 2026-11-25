// Minimal JWKS cache: fetches Microsoft's signing keys once and caches them.
// Used by auth.js to validate Entra ID JWTs in local-dev / test mode.

let cachedKeys = null;
let cachedUri = null;
let fetchPromise = null;

async function fetchJwks(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Falha ao buscar JWKS: ${res.status}`);
  const data = await res.json();
  const keyMap = new Map();
  for (const key of data.keys) {
    keyMap.set(key.kid, key);
  }
  cachedKeys = keyMap;
  cachedUri = uri;
  return keyMap;
}

export function getJwks(uri) {
  return {
    async getKey(kid) {
      let keys = cachedKeys;
      if (!keys || cachedUri !== uri) {
        if (!fetchPromise) {
          fetchPromise = fetchJwks(uri).finally(() => { fetchPromise = null; });
        }
        keys = await fetchPromise;
      }
      const jwk = keys.get(kid);
      if (!jwk) {
        // Re-fetch in case keys rotated
        cachedKeys = null;
        keys = await fetchJwks(uri);
        const retry = keys.get(kid);
        if (!retry) throw new Error(`Chave JWKS não encontrada para kid: ${kid}`);
        return pemFromJwk(retry);
      }
      return pemFromJwk(jwk);
    },
  };
}

function pemFromJwk(jwk) {
  // Convert JWK x5c (certificate chain) to PEM
  if (jwk.x5c && jwk.x5c[0]) {
    const cert = jwk.x5c[0];
    const pem = cert.match(/.{1,64}/g).join('\n');
    return `-----BEGIN CERTIFICATE-----\n${pem}\n-----END CERTIFICATE-----`;
  }
  throw new Error('JWK sem x5c; formato não suportado.');
}
