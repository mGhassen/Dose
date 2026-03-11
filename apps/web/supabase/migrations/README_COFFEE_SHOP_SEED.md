# Seed Data

## Staging seed (default)

`seed.sql` is the **staging seed**: config only, no business data.

- **variables**: VAT, tax rates, TVA (20% / 5.5% / 10%), exchange rate, min wage, social security, etc.
- **tax_rules**: TVA rules by sales type (on_site 10%, delivery/takeaway 5.5%) and expense (20%).

Loaded automatically when you run:

```bash
supabase db reset
```

(Migrations run first, then `seed.sql`.)

## Full coffee-shop seed

`seed-full.sql` contains the full dataset (2 years of sales, suppliers, items, recipes, expenses, etc.).

To use it after a reset:

```bash
cd apps/web
psql "postgresql://postgres:postgres@127.0.0.1:64322/postgres" -f supabase/seed-full.sql
```

Or with Supabase CLI (if your local DB is already up):

```bash
supabase db execute -f supabase/seed-full.sql
```

(Adjust connection string if needed; default local port is 64322.)

## Future migrations

To add or change seed data or schema:

```bash
supabase migration new <migration_name>
```

Edit the generated file in `apps/web/supabase/migrations/`.
