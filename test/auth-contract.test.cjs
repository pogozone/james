const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'express-session') {
    return () => (_req, _res, next) => next?.();
  }
  if (request === 'connect-mongo') {
    return { MongoStore: { create: () => ({}) } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

function loadAuth() {
  const target = require.resolve('../james-auth.cjs');
  delete require.cache[target];
  return require(target);
}

function fakeApp() {
  const routes = { get: [], post: [], use: [] };
  return {
    routes,
    set() {},
    use(fn) { routes.use.push(fn); },
    get(path, fn) { routes.get.push([path, fn]); },
    post(path, fn) { routes.post.push([path, fn]); },
  };
}

function response() {
  return {
    statusCode: 200,
    redirectedTo: null,
    jsonBody: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.jsonBody = value; return this; },
    redirect(value) { this.redirectedTo = value; return this; },
  };
}

function installFor(redirectUri) {
  process.env.JAMES_SESSION_SECRET = 'test-session-secret';
  process.env.SEASPIDER_REDIRECT_URI = redirectUri;
  process.env.SEASPIDER_ISSUER = 'http://seaspider.emaz.local';
  process.env.SEASPIDER_CLIENT_ID = 'james';
  process.env.SEASPIDER_CLIENT_SECRET = 'not-used-by-this-test';

  const app = fakeApp();
  const { installSeaSpider } = loadAuth();
  const api = installSeaSpider(app, { mongoUrl: 'mongodb://example.invalid/james' });
  return { app, api };
}

{
  const { app, api } = installFor('http://james.emaz.local/auth/callback');
  assert.deepEqual(app.routes.get.map(([path]) => path), ['/auth/login', '/auth/callback']);
  assert.deepEqual(app.routes.post.map(([path]) => path), ['/auth/logout']);

  const req = { session: {}, baseUrl: '', originalUrl: '/' };
  const res = response();
  api.requireSeaSpider(req, res, () => assert.fail('must not call next'));
  assert.equal(res.redirectedTo, '/auth/login');

  const apiReq = { session: {}, baseUrl: '/james-todos/api', originalUrl: '/james-todos/api/todos' };
  const apiRes = response();
  api.requireSeaSpider(apiReq, apiRes, () => assert.fail('must not call next'));
  assert.equal(apiRes.statusCode, 401);
  assert.deepEqual(apiRes.jsonBody, { error: 'Unauthorized' });
}

{
  const { api } = installFor('https://www.christian-woldt.de/james/auth/callback');
  const req = { session: {}, baseUrl: '', originalUrl: '/' };
  const res = response();
  api.requireSeaSpider(req, res, () => assert.fail('must not call next'));
  assert.equal(res.redirectedTo, '/james/auth/login');
}

console.log('James auth contract: OK');
