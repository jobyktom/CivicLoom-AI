# CivicLoom AI

An MVP for AI-assisted local market reports. It uses a polished demo dataset when credentials are absent, making it immediately usable in local development and on Vercel previews.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configuration

- `CENSUS_API_KEY` is optional for low-volume Census API use but recommended for production. The report API uses Census geocoding and then county ACS data.
- `OPENAI_API_KEY` enables detailed AI report sections. Without it, CivicLoom uses a structured fallback narrative.
- `OPENAI_MODEL` defaults to `gpt-4o-mini` if omitted.
- `AUTH_SECRET` signs first-party session cookies. Use a long random value in production.
- Add Hostinger MySQL variables to persist reports. Use either `DATABASE_URL` or the separate `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables.
- If your MySQL password contains special URL characters such as `@`, prefer the separate `DB_*` variables. If you use `DATABASE_URL`, encode `@` as `%40`.
- Run `hostinger/schema.sql` in Hostinger phpMyAdmin before enabling persistence.
- If your `users` table already exists from an older version, run `hostinger/auth-migration.sql` once to add `password_hash`.
- Visit `/api/db/health` after deployment to confirm the app can connect to MySQL and see the `reports` table.
- Add `STRIPE_SECRET_KEY` plus one recurring Price ID per paid plan to activate hosted Stripe Checkout. Stripe uses subscription Checkout Sessions; it never exposes the secret key in the browser.

## Architecture

- `src/lib/census.ts`: modular ACS variable map and county/place lookup.
- `src/lib/scoring.ts`: transparent 35/25/25/15 weighted opportunity score plus component breakdown.
- `src/lib/ai.ts`: structured OpenAI report generation with safe fallback.
- `src/lib/mock-data.ts`: demo report data for the MVP UI.
- `src/lib/db.ts`: lazy Hostinger MySQL pool. The app falls back to demo data if database variables are missing.
- `src/app/api/reports/generate/route.ts`: Census-resolved report generation plus optional Hostinger MySQL persistence.
- `src/app/api/reports/route.ts`: saved reports API backed by Hostinger MySQL with demo fallback.
- `src/app/api/checkout/route.ts`: subscription Checkout Session creation.

Pricing is displayed in USD. Stripe checkout is intentionally left as a front-end placeholder for the next integration phase.
