/**
 * SeaSpider integration for James' existing CommonJS Express server.
 *
 * Install in James:
 *   npm install openid-client express-session connect-mongo
 *
 * James currently uses /james-todos internally while the reverse proxy exposes
 * /james publicly. Both paths are therefore configurable here.
 */

const session = require('express-session');
const MongoStore = require('connect-mongo');

let oidc;
let configuration;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function client() {
  oidc ||= await import('openid-client');
  const clientSecret = required('SEASPIDER_CLIENT_SECRET');
  configuration ||= await oidc.discovery(
    new URL(required('SEASPIDER_ISSUER')),
    required('SEASPIDER_CLIENT_ID'),
    { client_secret: clientSecret },
    oidc.ClientSecretBasic(clientSecret)
  );
  return { oidc, configuration };
}

function externalCallbackUrl(req) {
  const callback = new URL(required('SEASPIDER_REDIRECT_URI'));
  const incoming = new URL(req.originalUrl, 'http://internal.invalid');
  callback.search = incoming.search;
  return callback;
}

function installSeaSpider(app, {
  mongoUrl,
  internalBasePath = '/james-todos',
  externalBasePath = '/james',
} = {}) {
  required('JAMES_SESSION_SECRET');
  required('SEASPIDER_REDIRECT_URI');

  app.use(session({
    name: 'james.sid',
    secret: process.env.JAMES_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({ mongoUrl, collectionName: 'james_sessions' }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    },
  }));

  app.get(`${internalBasePath}/auth/login`, async (req, res, next) => {
    try {
      const { oidc, configuration } = await client();
      const verifier = oidc.randomPKCECodeVerifier();
      const challenge = await oidc.calculatePKCECodeChallenge(verifier);
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      req.session.oidc = { verifier, state, nonce };

      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: process.env.SEASPIDER_REDIRECT_URI,
        scope: 'openid profile email seaspider',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });
      res.redirect(url.href);
    } catch (error) {
      next(error);
    }
  });

  app.get(`${internalBasePath}/auth/callback`, async (req, res, next) => {
    try {
      const saved = req.session.oidc;
      if (!saved) return res.status(400).send('Missing OIDC session');

      const { oidc, configuration } = await client();
      const tokens = await oidc.authorizationCodeGrant(configuration, externalCallbackUrl(req), {
        pkceCodeVerifier: saved.verifier,
        expectedState: saved.state,
        expectedNonce: saved.nonce,
        idTokenExpected: true,
      });
      const claims = tokens.claims();

      if (!claims || !['admin', 'user'].includes(claims.role)) {
        return res.status(403).send('Access denied');
      }

      req.session.user = {
        id: claims.sub,
        username: claims.preferred_username,
        email: claims.email,
        role: claims.role,
      };
      delete req.session.oidc;
      res.redirect(externalBasePath);
    } catch (error) {
      next(error);
    }
  });

  app.post(`${internalBasePath}/auth/logout`, (req, res) => {
    req.session.destroy(() => res.redirect(`${externalBasePath}/auth/login`));
  });

  function requireSeaSpider(req, res, next) {
    if (req.session.user && ['admin', 'user'].includes(req.session.user.role)) return next();
    if (req.originalUrl.includes('/api/')) return res.status(401).json({ error: 'Unauthorized' });
    return res.redirect(`${externalBasePath}/auth/login`);
  }

  return { requireSeaSpider };
}

module.exports = { installSeaSpider };
