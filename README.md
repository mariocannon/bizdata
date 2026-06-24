# LINK Business Dashboard

Next.js dashboard for LINK Business NZ listing trends.

## Setup

```cmd
npm install
copy .env.local.example .env.local
notepad .env.local
```

Add your Supabase URL and anon key.

## Run locally

```cmd
npm run dev
```

Open http://localhost:3000

## Deploy to Netlify

1. Push this folder to a GitHub repo
2. Go to app.netlify.com → Add new site → Import from Git
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy

## Tabs

- **Overview** — industry breakdown, turnover rates, days on market, regional turnover
- **Velocity** — new listings per week trend lines by industry
- **Price** — bracket distribution and avg price by industry
- **Location** — regional breakdown table with turnover rates
- **Price drops** — listings where asking price has fallen between weeks
