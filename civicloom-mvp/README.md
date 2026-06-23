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
- `OPENAI_API_KEY` enables real AI narratives. Without it, CivicLoom uses the demo narrative.
- Add Supabase variables when connecting authentication and persistent reports. The schema is at `supabase/schema.sql`.
- Add `STRIPE_SECRET_KEY` plus one recurring Price ID per paid plan to activate hosted Stripe Checkout. Stripe uses subscription Checkout Sessions; it never exposes the secret key in the browser.

## Architecture

- `src/lib/census.ts`: modular ACS variable map and county/place lookup.
- `src/lib/scoring.ts`: transparent 35/25/25/15 weighted opportunity score.
- `src/lib/ai.ts`: OpenAI generation with safe mock fallback.
- `src/lib/mock-data.ts`: demo report data for the MVP UI.
- `src/app/api/reports/generate/route.ts`: Census-resolved report generation plus optional Supabase persistence.
- `src/app/api/checkout/route.ts`: subscription Checkout Session creation.

Pricing is displayed in USD. Stripe checkout is intentionally left as a front-end placeholder for the next integration phase.
