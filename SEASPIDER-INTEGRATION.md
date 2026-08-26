# James + SeaSpider

SeaSpider is the OIDC provider. James keeps a server-side session and never exposes OAuth/OIDC tokens to the React frontend.

## URLs

SeaSpider owns its dedicated host as the OIDC issuer. Do **not** append `/oidc` to the issuer.

Local Platform:

```text
SeaSpider issuer:       http://seaspider.emaz.local
SeaSpider Docker URL:   http://seaspider:3400
James browser URL:      http://james.emaz.local
James callback:         http://james.emaz.local/auth/callback
```

Production example:

```text
SeaSpider issuer:       https://auth.christian-woldt.de
James browser URL:      https://www.christian-woldt.de/james/
James callback:         https://www.christian-woldt.de/james/auth/callback
```

The OIDC provider's standard endpoints therefore live at the issuer root, e.g. `/.well-known/openid-configuration`, `/auth`, `/token`, and the JWKS endpoint advertised by discovery. SeaSpider's custom interaction UI remains below `/oidc/interaction/...`.

## 1. Register James

In **SeaSpider → Register app** create:

- Name: `James`
- Client ID: `james`
- Local redirect URI: `http://james.emaz.local/auth/callback`
- Production redirect URI: `https://www.christian-woldt.de/james/auth/callback`

Copy the generated client secret once and assign your SeaSpider account the James role `admin` or `user`.

## 2. Platform environment

For the default local James instance, `~/CascadeProjects/platform/.env.local` contains:

```env
SEASPIDER_ISSUER=http://seaspider.emaz.local
SEASPIDER_INTERNAL_URL=http://seaspider:3400
JAMES_SEASPIDER_CLIENT_ID=james
JAMES_SEASPIDER_CLIENT_SECRET=<secret issued by SeaSpider>
JAMES_SEASPIDER_REDIRECT_URI=http://james.emaz.local/auth/callback
```

`JAMES_SESSION_SECRET` is generated persistently by Platform from James' `platform.yml`.

The public issuer is used in browser redirects and token validation. `SEASPIDER_INTERNAL_URL` is only the Docker transport address for James' back-channel discovery/token/JWKS requests.

## 3. James source

James needs these runtime dependencies:

```text
openid-client
express-session
connect-mongo
```

Copy `examples/james-auth.cjs` to the James project root. `server-mongo.js` loads it with:

```js
const { installSeaSpider } = require('./james-auth.cjs');
```

After `express.json()` and before the `/james-todos/api/...` routes:

```js
const { requireSeaSpider } = installSeaSpider(app, {
  mongoUrl: MONGODB_URI,
});

app.use('/james-todos/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return requireSeaSpider(req, res, next);
});
```

Immediately before `express.static(buildDirectory)` protect the UI while keeping auth and health public:

```js
app.use((req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  if (req.path === '/james-todos/api/health') return next();
  if (req.path.startsWith('/james-todos/api/')) return next();
  return requireSeaSpider(req, res, next);
});
```

James' Express auth routes are always `/auth/login`, `/auth/callback`, and `/auth/logout`. The external prefix is derived from `SEASPIDER_REDIRECT_URI`, so local `/auth/...` and production `/james/auth/...` use the same source code.

## 4. Role handling

SeaSpider adds an application-specific `role` claim. James accepts only `admin` and `user`; `denied` fails closed.

## 5. Data isolation

Authentication does not make the existing Todo/Epic/Sprint collections user-specific. Add SeaSpider's stable `sub` as an owner ID in a separate schema migration if per-user data separation is wanted.
