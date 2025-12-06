# Coffee Shop Inventory Seed Data

The coffee shop seed data has been added to `seed.sql` (not as a migration).

## What's Included

- **40+ Ingredients**: Coffee beans, dairy, syrups, packaging, toppings, etc.
- **6 Suppliers**: Coffee roasters, dairy suppliers, packaging companies, etc.
- **15 Recipes**: Common coffee shop drinks (espresso, latte, cappuccino, etc.)
- **Initial Stock Levels**: Pre-configured stock levels with min/max thresholds

## Usage

The seed data will be automatically loaded when you run:
```bash
supabase db reset
```

This applies all migrations first, then runs `seed.sql`.

## Note on Recipe Ingredients

The recipe ingredients (linking recipes to ingredients with quantities) are not included in the seed data because they require specific ingredient IDs that may vary. You'll need to:

1. Create recipes through the UI
2. Add ingredients to recipes through the recipe detail/edit pages
3. Or manually insert recipe_ingredients records after ingredients are created

## Future Migrations

If you need to add more seed data or modify the inventory schema, create a new migration using:

```bash
supabase migration new <migration_name>
```

Then edit the generated migration file in `apps/web/supabase/migrations/`.

