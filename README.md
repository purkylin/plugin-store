# Hawk Plugin Store

Cloudflare Worker + D1 + R2 backend for the Hawk plugin catalog, author
submissions, administrator review, PY/CMS Push, and TVBox configuration files.

The API contract is maintained in [openapi.yaml](openapi.yaml).

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set ADMIN_TOKEN.
npm run cf-typegen
npm run db:migrate:local
npm run dev
```

Local pages:

- Admin: `http://localhost:8787/admin`
- User portal: `http://localhost:8787`

`.dev.vars` contains local-only values and is ignored by Git. Resend variables
are optional locally; leave them empty to disable email delivery.

## Deploy

`wrangler.jsonc` currently uses:

- D1 binding `DB`, database `hawk-plugin-store`
- R2 binding `STORAGE`, bucket `storage`
- `PUBLIC_ASSET_BASE_URL` (set this to your own R2 custom domain)

The D1 ID, bucket name, and custom domain are account-specific. Review them
before deploying this repository to another Cloudflare account.

### First deployment

1. Install and authenticate:

   ```bash
   npm install
   npx wrangler login
   npx wrangler whoami
   ```

2. Create resources only if they do not already exist:

   ```bash
   npx wrangler d1 create hawk-plugin-store
   npx wrangler r2 bucket create storage
   ```

   Put the returned D1 `database_id` into `wrangler.jsonc`. If the bucket or
   database already exists, do not create a second one.

3. **Optional:** attach an R2 custom domain in Cloudflare. It must point to the
   `storage` bucket; then set `PUBLIC_ASSET_BASE_URL` to that domain in
   `wrangler.jsonc`.

4. Apply the remote schema:

   ```bash
   npm run db:migrate:remote
   ```

5. Add Worker secrets interactively. Wrangler prompts for the values; do not
   place them in source files or `wrangler.jsonc`:

   ```bash
   npx wrangler secret put ADMIN_TOKEN
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put RESEND_FROM_EMAIL
   npx wrangler secret put ADMIN_NOTIFY_EMAIL
   ```

   `ADMIN_TOKEN` is required. The Resend secrets are optional. Plugin and Push notifications require the admin email switch.
   Password recovery emails are independent of this switch.

6. Deploy:

   ```bash
   npm run deploy
   ```
