import jwt from 'jsonwebtoken';
import { config } from './config.js';

/**
 * Two authentication modes:
 *
 * 1. Easy Auth (App Service): The platform proxy validates the Entra ID token
 *    and injects authenticated headers. We trust ONLY the proxy by checking
 *    WEBSITE_AUTH_ENABLED === 'true'. We never accept these headers from
 *    outside the platform.
 *
 * 2. Bearer token: When Easy Auth is not active (local dev, test), we
 *    validate the Entra ID JWT directly against the tenant issuer.
 *
 * Deny by default in production. No header is trusted unless Easy Auth is
 * confirmed active or a valid Bearer token is presented.
 */

function extractName(claims) {
  return claims.name || claims.preferred_username || claims.email || claims.upn || claims.sub || 'unknown';
}

function fromEasyAuthHeaders(req) {
  const username = req.headers['x-ms-client-principal-name'];
  if (!username) return null;
  const idP = req.headers['x-ms-client-principal-idp'] || 'EntraID';
  const principalId = req.headers['x-ms-client-principal-id'] || '';
  return {
    name: username,
    idp: idP,
    principalId,
    source: 'easy-auth',
  };
}

async function validateJwt(token) {
  const { tenantId, audience } = config.entra;
  if (!tenantId) throw new Error('ENTRA_TENANT_ID não configurado');
  if (!audience) throw new Error('ENTRA_AUDIENCE não configurado');
  const issuer = `https://sts.windows.net/${tenantId}/`;
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

  // Decode without verifying to get the kid
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('Token inválido');

  // Fetch JWKS and verify with the matching key
  const jwksClient = (await import('./jwksCache.js')).getJwks(jwksUri);
  const key = await jwksClient.getKey(decoded.header.kid);

  const claims = jwt.verify(token, key, {
    algorithms: ['RS256'],
    issuer,
    audience,
  });

  return {
    name: extractName(claims),
    idp: claims.idp || 'EntraID',
    principalId: claims.oid || claims.sub || '',
    source: 'bearer',
  };
}

export function authMiddleware() {
  return async (req, res, next) => {
    const isEasyAuth = process.env.EASY_AUTH_ENABLED === 'true' || process.env.WEBSITE_AUTH_ENABLED === 'true';
    const isDev = (process.env.NODE_ENV ?? 'production') === 'development';

    // Development bypass for local testing only
    if (isDev && process.env.AUTH_BYPASS === 'true') {
      req.user = { name: 'dev-user', idp: 'dev', principalId: 'dev-001', source: 'dev' };
      return next();
    }

    try {
      // Mode 1: Easy Auth — trust platform-injected headers ONLY when Easy Auth is active
      if (isEasyAuth) {
        const user = fromEasyAuthHeaders(req);
        if (user) {
          req.user = user;
          return next();
        }
        // Easy Auth is on but no principal header → deny
        return res.status(401).json({ error: 'Não autenticado pelo Easy Auth.' });
      }

      // Mode 2: Bearer token validation
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação ausente.' });
      }
      const token = authHeader.slice(7);
      req.user = await validateJwt(token);
      next();
    } catch (err) {
      res.status(401).json({ error: `Falha na autenticação: ${err.message}` });
    }
  };
}
