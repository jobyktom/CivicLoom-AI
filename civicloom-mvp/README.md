# CivicLoom AI

An MVP for AI-assisted local market reports. It uses a polished demo dataset when credentials are absent, making it immediately usable in local development and on Vercel previews.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Configuration

- `CENSUS_API_KEY` is optional for low-volume Census API use but recommended for production. The report API uses Census geocoding and then county ACS data.
- `OPENAI_API_KEY` enables detailed AI report sections. Without it, CivicLoom uses a structured fallback narrative.
- `OPENAI_MODEL` defaults to `gpt-4o-mini` if omitted.
- `AUTH_SECRET` signs Auth.js sessions and first-party migration cookies. Use a long random value in production. `NEXTAUTH_SECRET` is also accepted as a hosting compatibility alias.
- `AUTH_URL` is used by the Phase 3 Auth.js setup. In local development it should match your dev server URL.
- `AUTH_TRUST_HOST=true` is recommended on Vercel/Hostinger-style deployments where Auth.js should trust the deployed host header.
- `AUTH_PRISMA_ADAPTER=false` keeps Auth.js in safe JWT-session mode until the Phase 3 SQL has been applied. Set it to `true` after `accounts`, `sessions`, and `verification_tokens` exist.
- Add Hostinger MySQL variables to persist reports. Use either `DATABASE_URL` or the separate `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables.
- If your MySQL password contains special URL characters such as `@`, prefer the separate `DB_*` variables. If you use `DATABASE_URL`, encode `@` as `%40`.
- Run `hostinger/schema.sql` in Hostinger phpMyAdmin before enabling persistence.
- If your `users` table already exists from an older version, run `hostinger/auth-migration.sql` once to add `password_hash`.
- Phase 3 Prisma/Auth.js/Stripe tables are prepared in `hostinger/phase3-prisma-auth-billing.sql`. Review and run it once before switching production traffic to Auth.js/Prisma billing flows.
- Visit `/api/db/health` after deployment to confirm the app can connect to MySQL and see the `reports` table.
- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and one recurring Price ID per paid plan to activate hosted Stripe Checkout. Stripe uses subscription Checkout Sessions; it never exposes the secret key in the browser.

## Prisma

Prisma is the Phase 3 database layer. The schema maps to the existing Hostinger MySQL tables and includes upcoming Auth.js, Stripe subscription, usage, business-template, and watchlist tables.

Useful commands:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:studio
```

The Prisma config can build a MySQL connection from either `DATABASE_URL` or the separate `DB_*` variables in `.env.local`.

Do not run destructive Prisma migrations against the Hostinger database. Use the additive SQL files in `hostinger/` until the database has been fully migrated and backed up.

## Auth.js migration

Auth.js is available at `/api/auth/*` with the credentials provider. It uses the existing `users.email` and `users.password_hash` records, so existing accounts can continue to sign in. During the transition, `src/lib/auth.ts` reads Auth.js sessions first and falls back to the old `civicloom_session` cookie for users who were already signed in before the migration.

After running `hostinger/phase3-prisma-auth-billing.sql`, set `AUTH_PRISMA_ADAPTER=true` to enable the Prisma adapter tables for OAuth/session features.

## Architecture

- `src/lib/census.ts`: modular ACS variable map and county/place lookup.
- `src/lib/scoring.ts`: transparent 35/25/25/15 weighted opportunity score plus component breakdown.
- `src/lib/ai.ts`: structured OpenAI report generation with safe fallback.
- `src/lib/mock-data.ts`: demo report data for the MVP UI.
- `src/lib/db.ts`: lazy Hostinger MySQL pool. The app falls back to demo data if database variables are missing.
- `src/lib/prisma.ts`: generated Prisma client accessor for Phase 3 routes.
- `src/lib/billing.ts`: Stripe subscription, billing status, usage limit, and runtime-safe billing schema helpers.
- `src/app/api/reports/generate/route.ts`: Census-resolved report generation plus optional Hostinger MySQL persistence.
- `src/app/api/reports/route.ts`: saved reports API backed by Hostinger MySQL with demo fallback.
- `src/app/api/checkout/route.ts`: subscription Checkout Session creation.
- `src/app/api/stripe/webhook/route.ts`: Stripe webhook receiver for subscription lifecycle updates.
- `src/app/api/billing/status/route.ts`: current user plan and monthly report usage.
- `src/app/api/billing/portal/route.ts`: Stripe customer portal session creation.
- `src/app/api/templates/route.ts`: business-type templates used by the report builder.
- `src/app/api/watchlist/route.ts`: signed-in user watchlist create/list API.
- `src/lib/value-add.ts`: business template and watchlist service helpers.

Pricing is displayed in USD. Paid plans use hosted Stripe Checkout in subscription mode. Stripe webhooks update the local subscription table, and report generation checks usage server-side before spending Census/OpenAI calls.

Business templates and watchlists are additive Phase 3 value services. Templates help users start reports with business-specific assumptions. Watchlists let signed-in users save promising markets for future monitoring and alerts.

## Stripe webhook setup

In Stripe, configure a webhook endpoint pointing to:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.
