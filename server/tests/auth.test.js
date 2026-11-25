import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { authMiddleware } from '../src/auth.js';

/**
 * Auth tests verify:
 * 1. Unauthenticated requests are denied (401)
 * 2. Easy Auth headers are only trusted when EASY_AUTH_ENABLED=true
 * 3. Forged Easy Auth headers are rejected when Easy Auth is off
 * 4. Dev bypass works only in development with AUTH_BYPASS=true
 */

function makeApp(opts = {}) {
  process.env.NODE_ENV = opts.env ?? 'production';
  process.env.EASY_AUTH_ENABLED = opts.easyAuth ? 'true' : 'false';
  process.env.AUTH_BYPASS = opts.devBypass ? 'true' : 'false';
  process.env.ENTRA_TENANT_ID = 'fake-tenant';

  const app = express();
  app.use(express.json());
  app.use('/api', authMiddleware());
  app.get('/api/test', (req, res) => res.json({ user: req.user }));
  return app;
}

async function request(app, path, headers = {}) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request({ port, path, headers, method: 'GET' }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(body || '{}') });
        });
      });
      req.end();
    });
  });
}

describe('Auth middleware', () => {
  test('denies unauthenticated requests in production', async () => {
    const app = makeApp({ env: 'production' });
    const res = await request(app, '/api/test');
    assert.equal(res.status, 401);
    assert.ok(res.body.error.includes('Token'));
  });

  test('rejects forged Easy Auth headers when Easy Auth is off', async () => {
    const app = makeApp({ env: 'production', easyAuth: false });
    const res = await request(app, '/api/test', {
      'x-ms-client-principal-name': 'attacker@nexteer.com',
    });
    assert.equal(res.status, 401);
  });

  test('accepts Easy Auth headers when Easy Auth is on', async () => {
    const app = makeApp({ env: 'production', easyAuth: true });
    const res = await request(app, '/api/test', {
      'x-ms-client-principal-name': 'user@nexteer.com',
      'x-ms-client-principal-idp': 'EntraID',
      'x-ms-client-principal-id': 'user-uuid-123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'user@nexteer.com');
    assert.equal(res.body.user.source, 'easy-auth');
  });

  test('denies even with Easy Auth on if no principal header present', async () => {
    const app = makeApp({ env: 'production', easyAuth: true });
    const res = await request(app, '/api/test');
    assert.equal(res.status, 401);
  });

  test('dev bypass works in development with AUTH_BYPASS', async () => {
    const app = makeApp({ env: 'development', devBypass: true });
    const res = await request(app, '/api/test');
    assert.equal(res.status, 200);
    assert.equal(res.body.user.source, 'dev');
  });

  test('dev bypass does NOT work in production', async () => {
    const app = makeApp({ env: 'production', devBypass: true });
    const res = await request(app, '/api/test');
    assert.equal(res.status, 401);
  });
});
