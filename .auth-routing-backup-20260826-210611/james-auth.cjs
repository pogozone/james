/**
 * SeaSpider integration for James' CommonJS Express server.
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

function seaSpiderInternalOrigin(issuer) {
  const configured = process.env.SEASPIDER_INTERNAL_URL?.trim();

  if (configured) {
    return new URL(configured);
  }

  // Local Platform convention: the browser uses *.emaz.local while
  // container-to-container traffic uses the Docker service name.
  if (issuer.hostname.endsWith('.emaz.local')) {
    return new URL('http://seaspider:3400');
  }

  return null;
}

function createSeaSpiderFetch(issuer) {
  const internal = seaSpiderInternalOrigin(issuer);
  if (!internal) return undefined;

  return async (input, init = {}) => {
    const original = new URL(
      input instanceof URL
        ? input.href
        : (typeof input === 'string' ? input : input.url),
    );

    // Only reroute requests that belong to the configured SeaSpider issuer.
    if (original.origin !== issuer.origin) {
      return globalThis.fetch(input, init);
    }

    const target = new URL(original.href);
    target.protocol = internal.protocol;
    target.username = internal.username;
    target.password = internal.password;
    target.host = internal.host;

    const forwardedHeaders = new Headers(
      input instanceof Request ? input.headers : undefined,
    );

    for (const [name, value] of new Headers(init.headers || {})) {
      forwardedHeaders.set(name, value);
    }

    // SeaSpider derives its public issuer dynamically from these headers.
    // The TCP connection goes to the Docker service, but generated OIDC
    // metadata and browser redirects keep using the public issuer.
    forwardedHeaders.set('x-forwarded-host', issuer.host);
    forwardedHeaders.set('x-forwarded-proto', issuer.protocol.replace(':', ''));

    if (input instanceof Request) {
      const rewritten = new Request(target, input);
      return globalThis.fetch(new Request(rewritten, {
        ...init,
        headers: forwardedHeaders,
      }));
    }

    return globalThis.fetch(target, {
      ...init,
      headers: forwardedHeaders,
    });
  };
}

async function client() {
  oidc ||= await import('openid-client');

  const issuer = new URL(required('SEASPIDER_ISSUER'));
  const clientSecret = required('SEASPIDER_CLIENT_SECRET');
  const customFetch = createSeaSpiderFetch(issuer);

  const discoveryOptions = {};

  // openid-client v6 exposes customFetch as a symbol-keyed option.
  // The same fetch implementation is retained for token/JWKS requests.
  if (customFetch) {
    discoveryOptions[oidc.customFetch] = customFetch;
  }

  if (issuer.protocol === 'http:') {
    discoveryOptions.execute = [oidc.allowInsecureRequests];
  }

  configuration ||= await oidc.discovery(
    issuer,
    required('SEASPIDER_CLIENT_ID'),
    { client_secret: clientSecret },
    oidc.ClientSecretBasic(clientSecret),
    discoveryOptions,
  );

  return { oidc, configuration };
}

function externalCallbackUrl(req) {
  const callback = new URL(required('SEASPIDER_REDIRECT_URI'));
  const incoming = new URL(req.originalUrl, 'http://internal.invalid');
  callback.search = incoming.search;
  return callback;
}

function browserBasePathFromRedirectUri() {
  const pathname = new URL(required('SEASPIDER_REDIRECT_URI')).pathname;
  const suffix = '/auth/callback';

  if (!pathname.endsWith(suffix)) {
    throw new Error(`SEASPIDER_REDIRECT_URI must end with ${suffix}`);
  }

  const basePath = pathname.slice(0, -suffix.length).replace(/\/+$/, '');
  return basePath === '/' ? '' : basePath;
}

function installSeaSpider(app, {
  mongoUrl,
  internalBasePath = '/james-todos',
  externalBasePath: _ignoredExternalBasePath = undefined,
} = {}) {
  required('JAMES_SESSION_SECRET');
  required('SEASPIDER_REDIRECT_URI');
  const externalBasePath = browserBasePathFromRedirectUri();

  if (!mongoUrl) {
    throw new Error('installSeaSpider requires mongoUrl');
  }

  app.set('trust proxy', 1);

  app.use(session({
    name: 'james.sid',
    secret: process.env.JAMES_SESSION_SECRET,
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
      secure: 'auto',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    },
  }));

  app.get(`${internalBasePath}/auth/login`, async (req, res, next) => {
    try {
      const { oidc: oidcClient, configuration: oidcConfiguration } = await client();
      const verifier = oidcClient.randomPKCECodeVerifier();
      const challenge = await oidcClient.calculatePKCECodeChallenge(verifier);
      const state = oidcClient.randomState();
      const nonce = oidcClient.randomNonce();

      req.session.oidc = { verifier, state, nonce };

      const url = oidcClient.buildAuthorizationUrl(oidcConfiguration, {
        redirect_uri: process.env.SEASPIDER_REDIRECT_URI,
        scope: 'openid profile email seaspider',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });

      return res.redirect(url.href);
    } catch (error) {
      return next(error);
    }
  });

  app.get(`${internalBasePath}/auth/callback`, async (req, res, next) => {
    try {
      const saved = req.session.oidc;
      if (!saved) return res.status(400).send('Missing OIDC session');

      const { oidc: oidcClient, configuration: oidcConfiguration } = await client();
      const tokens = await oidcClient.authorizationCodeGrant(
        oidcConfiguration,
        externalCallbackUrl(req),
        {
          pkceCodeVerifier: saved.verifier,
          expectedState: saved.state,
          expectedNonce: saved.nonce,
          idTokenExpected: true,
        },
      );

      const idClaims = tokens.claims();
      if (!idClaims?.sub) {
        delete req.session.oidc;
        return res.status(403).send('Access denied');
      }

      // In the Authorization Code Flow, claims requested through profile,
      // email and the custom "seaspider" scope belong to UserInfo. The ID
      // token is used to validate the authentication and obtain the stable sub.
      const userInfo = await oidcClient.fetchUserInfo(
        oidcConfiguration,
        tokens.access_token,
        idClaims.sub,
      );

      if (!['admin', 'user'].includes(userInfo.role)) {
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
          return res.redirect(externalBasePath || '/');
        });
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post(`${internalBasePath}/auth/logout`, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie('james.sid');
      return res.redirect(`${externalBasePath}/auth/login`);
    });
  });

  function requireSeaSpider(req, res, next) {
    if (req.session.user && ['admin', 'user'].includes(req.session.user.role)) {
      return next();
    }

    if (req.originalUrl.includes('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.redirect(`${externalBasePath}/auth/login`);
  }

  return { requireSeaSpider };
}

module.exports = { installSeaSpider };
