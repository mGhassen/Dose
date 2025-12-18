# Supabase Migrations

This directory contains SQL migration files for the Dose database.

## Seed Data Migration

The file `20250101000000_seed_data.sql` contains seed data for development and testing purposes.

### What's Included

The seed data includes sample records for:

- **10 Expenses** - Various categories (rent, utilities, supplies, marketing, insurance, maintenance, professional services)
- **3 Leasing Payments** - Operating and finance leases
- **3 Loans** - Different loan amounts and terms
- **6 Variables** - Tax rates, inflation, exchange rates, minimum wage
- **8 Personnel Records** - Various positions and types (full-time, part-time, contractor)
- **31 Sales Records** - Daily sales for January 2024 (various types: on-site, delivery, takeaway, catering)
- **6 Investments** - Equipment, vehicles, renovations, technology
- **3 Months of Financial Data** - Cash flow, working capital, profit & loss, balance sheet, financial plan

### Running the Migration

#### Using Supabase CLI

```bash
# Make sure you're in the project root
cd apps/web

# Apply the migration
supabase db reset  # This will apply all migrations including seed data
# OR
supabase migration up  # Apply pending migrations
```

#### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20250101000000_seed_data.sql`
4. Paste and execute the SQL

### Important Notes

- **Dates**: All seed data uses 2024 dates for consistency
- **Currency**: All amounts are in Tunisian Dinars (TND)
- **Calculated Fields**: 
  - Loan schedules should be generated via the application (use the "Generate Schedule" feature)
  - Depreciation entries should be generated via the application (use the "Generate Depreciation" feature)
  - Financial statements (P&L, Balance Sheet, etc.) should be calculated via the application's calculation services
- **RLS Policies**: Make sure Row Level Security policies are set up before running in production
- **Indexes**: Ensure indexes are created on frequently queried fields (month, date, category, etc.)

### Customization

You can modify the seed data to match your specific needs:
- Adjust amounts to reflect your business scale
- Change dates to match your timeline
- Add or remove records as needed
- Update personnel names and positions

### Clearing Seed Data

To remove all seed data:

```sql
-- WARNING: This will delete all data from these tables
TRUNCATE TABLE expenses, leasing_payments, loans, loan_schedules, variables, 
  personnel, sales, investments, depreciation_entries, cash_flow, 
  working_capital, profit_and_loss, balance_sheet, financial_plan CASCADE;
```

Note: This will also delete any data you've added manually. Use with caution.

