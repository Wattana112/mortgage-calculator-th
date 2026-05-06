# Thai Mortgage Calculator

Vite + React frontend for a Thai mortgage calculator, backed by PHP + MySQL so it can be deployed on Hostinger shared hosting.

## What this repo includes

- `src/` React calculator UI converted from the original HTML
- `api/` PHP JSON endpoint for current bank interest rates
- `database/schema.sql` MySQL schema designed for quarterly interest-rate updates
- `.gitignore` for Node + PHP deployment artifacts

## Database design

The schema is built around three tables:

1. `banks` stores bank metadata, display color, and ordering.
2. `rate_periods` stores each quarterly publication window, so every 3-month update becomes a new historical snapshot instead of overwriting older data.
3. `bank_interest_rates` stores the actual rate rows for each bank and quarter.

This makes it easy to:

- keep history by quarter
- compare current rates
- add new rates every 3 months without losing past data
- extend later with multiple products or rate types

## API

`GET /api/rates.php`

Returns the latest rate period and all active bank rates for that period.

Example response:

```json
{
  "success": true,
  "period": {
    "label": "Q2/2026"
  },
  "banks": []
}
```

## Hostinger deployment

1. Create a MySQL database in Hostinger.
2. Import `database/schema.sql`.
3. Update `api/config.php` with the Hostinger MySQL credentials.
4. Build the frontend locally with `npm install` then `npm run build`.
5. Upload the generated `dist/` contents to `public_html`.
6. Upload the `api/` folder into the same site root so `fetch('/api/rates.php')` works on the live domain.

## Local development

Run the Vite frontend:

```bash
npm install
npm run dev
```

If you want the API during local development, start PHP separately:

```bash
php -S 127.0.0.1:8000 -t .
```

Then Vite will proxy `/api` to the PHP server.

