/**
 * SeaSpider OIDC integration for James' CommonJS Express server.
 *
 * Contract:
 * - Express always sees /auth/login, /auth/callback, /auth/logout.
 * - The browser-facing base path is derived from SEASPIDER_REDIRECT_URI.
 *   Local:      http://james.emaz.local/auth/callback        -> ""
 *   Production: https://www.christian-woldt.de/james/auth/callback -> "/james"
 * - OIDC public issuer and Docker transport are separate:
 *   SEASPIDER_ISSUER       = public browser issuer
 *   SEASPIDER_INTERNAL_URL = internal Docker origin
 */

const session = require('express-session');
const connectMongo = require('connect-mongo');

const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;

let oidc;
let configuration;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function redirectUri() {
  return new URL(required('SEASPIDER_REDIRECT_URI'));
}

function externalBasePath() {
  const pathname = redirectUri().pathname;
  const suffix = '/auth/callback';

  if (!pathname.endsWith(suffix)) {
    throw new Error(
      `SEASPIDER_REDIRECT_URI must end with ${suffix}: ${pathname}`,
    );
  }

  const prefix = pathname.slice(0, -suffix.length).replace(/\/$/, '');
  return prefix === '/' ? '' : prefix;
}

function browserUrl(pathname = '/') {
  const prefix = externalBasePath();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (!prefix) return path;
  if (path === '/') return `${prefix}/`;
  return `${prefix}${path}`;
}

function internalOrigin() {
  const value = process.env.SEASPIDER_INTERNAL_URL?.trim();
  return value ? new URL(value) : null;
}

function createSeaSpiderFetch(issuer) {
  const internal = internalOrigin();
  if (!internal) return undefined;

  if (internal.pathname !== '/' && internal.pathname !== '') {
    throw new Error('SEASPIDER_INTERNAL_URL must be an origin without a path');
  }

  return async (input, init = {}) => {
    const source = input instanceof Request
      ? input.url
      : (input instanceof URL ? input.href : String(input));
    const requested = new URL(source);

    if (requested.origin !== issuer.origin) {
      return globalThis.fetch(input, init);
    }

    const target = new URL(requested.href);
    target.protocol = internal.protocol;
    target.username = internal.username;
    target.password = internal.password;
    target.host = internal.host;

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // SeaSpider derives its public issuer from these headers. The TCP
    // connection remains inside Docker, while discovery and redirects expose
    // only the configured public issuer.
    headers.set('x-forwarded-host', issuer.host);
    headers.set('x-forwarded-proto', issuer.protocol.replace(':', ''));

    if (input instanceof Request) {
      const rewritten = new Request(target, input);
      return globalThis.fetch(new Request(rewritten, {
        ...init,
        headers,
      }));
    }

    return globalThis.fetch(target, {
      ...init,
      headers,
    });
  };
}

async function client() {
  oidc ||= await import('openid-client');

  const issuer = new URL(required('SEASPIDER_ISSUER'));
  const clientSecret = required('SEASPIDER_CLIENT_SECRET');
  const options = {};
  const customFetch = createSeaSpiderFetch(issuer);

  if (customFetch) {
    options[oidc.customFetch] = customFetch;
  }

  if (issuer.protocol === 'http:') {
    options.execute = [oidc.allowInsecureRequests];
  }

  configuration ||= await oidc.discovery(
    issuer,
    required('SEASPIDER_CLIENT_ID'),
    { client_secret: clientSecret },
    oidc.ClientSecretBasic(clientSecret),
    options,
  );

  return { oidc, configuration };
}

function callbackUrl(req) {
  const callback = redirectUri();
  const incoming = new URL(req.originalUrl, 'http://internal.invalid');
  callback.search = incoming.search;
  return callback;
}

function installSeaSpider(app, { mongoUrl } = {}) {
  const sessionSecret = required('JAMES_SESSION_SECRET');
  const callback = redirectUri();

  if (!mongoUrl) {
    throw new Error('installSeaSpider requires mongoUrl');
  }

  app.set('trust proxy', 1);

  app.use(session({
    name: 'james.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl,
      collectionName: 'james_sessions',
      ttl: 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: callback.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000,
    },
  }));

  app.get('/auth/login', async (req, res, next) => {
    try {
      const { oidc: oidcClient, configuration: oidcConfiguration } = await client();
      const verifier = oidcClient.randomPKCECodeVerifier();
      const challenge = await oidcClient.calculatePKCECodeChallenge(verifier);
      const state = oidcClient.randomState();
      const nonce = oidcClient.randomNonce();

      req.session.oidc = { verifier, state, nonce };

      const url = oidcClient.buildAuthorizationUrl(oidcConfiguration, {
        redirect_uri: callback.href,
        scope: 'openid profile email seaspider',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });

      return req.session.save((error) => {
        if (error) return next(error);
        return res.redirect(url.href);
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/auth/callback', async (req, res, next) => {
    try {
      const saved = req.session.oidc;
      if (!saved) return res.status(400).send('Missing OIDC session');

      const { oidc: oidcClient, configuration: oidcConfiguration } = await client();
      const tokens = await oidcClient.authorizationCodeGrant(
        oidcConfiguration,
        callbackUrl(req),
        {
          pkceCodeVerifier: saved.verifier,
          expectedState: saved.state,
          expectedNonce: saved.nonce,
          idTokenExpected: true,
        },
      );

      const idClaims = tokens.claims();
      if (!idClaims?.sub || !tokens.access_token) {
        delete req.session.oidc;
        return res.status(403).send('Access denied');
      }

      const userInfo = await oidcClient.fetchUserInfo(
        oidcConfiguration,
        tokens.access_token,
        idClaims.sub,
      );

      if (!userInfo?.sub || !['admin', 'user'].includes(userInfo.role)) {
        delete req.session.oidc;
        return res.status(403).send('Access denied');
      }

      const user = {
        id: userInfo.sub,
        username: userInfo.preferred_username,
        email: userInfo.email,
        role: userInfo.role,
      };

      return req.session.regenerate((error) => {
        if (error) return next(error);

        req.session.user = user;
        return req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.redirect(browserUrl('/'));
        });
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/auth/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie('james.sid', { path: '/' });
      return res.redirect(browserUrl('/auth/login'));
    });
  });

  function requireSeaSpider(req, res, next) {
    if (req.session.user && ['admin', 'user'].includes(req.session.user.role)) {
      return next();
    }

    if (
      req.baseUrl === '/james-todos/api'
      || req.originalUrl.startsWith('/james-todos/api/')
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.redirect(browserUrl('/auth/login'));
  }

  return { requireSeaSpider };
}

module.exports = { installSeaSpider };
