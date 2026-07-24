# Hawk Plugin Store

Cloudflare Worker + D1 implementation of the Hawk Plugin Store API.

## Features

- Cursor-paginated plugin catalog filtered by iOS/tvOS and minimum app version.
- Exact manifest delivery with SHA-256 integrity metadata.
- Idempotent install/update/uninstall event ingestion.
- Unique cumulative installation counts.
- Admin bearer-token protected review and unpublish endpoints.
- Responsive management dashboard with structured manifest editing.
- Email/password author accounts with secure HttpOnly session cookies and globally unique email and nick.
- User plugin submissions with administrator accept/reject review.
- D1 migrations and Workers-runtime integration tests.

The Hawk app should use the deployed Worker URL with `/api/v1` appended, for
example:

```text
https://hawk-plugin-store.example.workers.dev/api/v1
```

## Local development

Requirements: Node.js 20+ and a Cloudflare account for deployment.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run cf-typegen
npm run db:migrate:local
npm test
npm run dev
```

Set a long random `ADMIN_TOKEN` in `.dev.vars`. The file is ignored by Git.
Local D1 data is persisted by Wrangler under `.wrangler/`.

## Manage plugins locally

With the local Worker running:

Open `http://localhost:8787/admin` to use the management dashboard. Enter the
same `ADMIN_TOKEN` configured in `.dev.vars`; the token remains only in the
current page memory and is not written to browser storage.

Authors can register, sign in, and submit plugins at
`http://localhost:8787/submit`. Their registered nick is used as the immutable
manifest author. A submission is not visible in the public catalog until an
administrator accepts it from the review queue.

Direct entry points:

- Registration: `http://localhost:8787/register`
- Login: `http://localhost:8787/login`
- Author portal: `http://localhost:8787/submit`

The site root directly renders the login page. Registration is available at
`/register`.

## Deploy

Authenticate and deploy:

```bash
npx wrangler login
npm run deploy
```

Wrangler can automatically provision the configured D1 database on the first
deployment and write its generated database ID back to `wrangler.jsonc`.
Then apply the schema and configure the publishing secret:

```bash
npm run db:migrate:remote
npx wrangler secret put ADMIN_TOKEN
```

Run `npm run deploy` once more if Wrangler reports that a new Worker version is
needed after binding or configuration changes.

For a controlled production rollout, you can instead create D1 first with
`npx wrangler d1 create hawk-plugin-store`, copy its `database_id` into
`wrangler.jsonc`, apply the remote migration, and then deploy.

## API

Public app endpoints:

- `GET /api/v1/plugins` (`page`, `page_size`, `sort`, `order`, `type`, and `q`)
- `GET /api/v1/plugins/{plugin_id}/manifest`
- `POST /api/v1/plugins/{plugin_id}/install-events`

Administrator endpoints:

- `GET /api/v1/admin/plugins`
- `POST /api/v1/admin/plugins/{plugin_id}/unpublish`
- `GET /api/v1/admin/reviews`
- `POST /api/v1/admin/reviews/{submission_id}/accept`
- `POST /api/v1/admin/reviews/{submission_id}/reject`

Author accounts and submissions:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/user/me`
- `GET /api/v1/user/submissions`
- `POST /api/v1/user/submissions/{submission_id}/cancel`
- `POST /api/v1/user/plugins` (server-generated UUID)
- `POST /api/v1/user/plugins/draft`
- `PUT /api/v1/user/plugins/{plugin_id}`
- `PUT /api/v1/user/plugins/{plugin_id}/draft`
- `DELETE /api/v1/user/plugins/{plugin_id}`
- `POST /api/v1/user/plugins/{plugin_id}/unpublish`

Management dashboard:

- `GET /admin`
- `GET /submit`

See [openapi.yaml](openapi.yaml) for the complete contract.

Install counts are cumulative unique `(plugin_id, installation_id)` pairs.
Retries use `event_id` as an idempotency key. Update and uninstall events are
stored for analytics but do not change the public count.

## Production notes

- Keep `ADMIN_TOKEN` only in a Worker secret.
- Add a Cloudflare rate-limiting rule to the install-events endpoint before a
  public launch.
- Back up D1 or use Time Travel before destructive schema changes.
- Run `npm run cf-typegen` whenever Worker bindings or the compatibility date
  changes.

Cloudflare references:

- [Workers configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
