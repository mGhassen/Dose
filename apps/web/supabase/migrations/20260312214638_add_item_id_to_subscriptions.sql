-- Each subscription has an item with the same name, used on expense line items.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS item_id BIGINT REFERENCES items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_item_id ON subscriptions(item_id);

-- Link expense created from a subscription payment so deleting the payment deletes the expense.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS actual_payment_id BIGINT REFERENCES actual_payments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_expenses_actual_payment_id ON expenses(actual_payment_id);

-- expense_type: source of the expense (expense, subscription, leasing, loan, personnel, other).
-- All payments end up as expenses; this distinguishes the workflow/source.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50) NOT NULL DEFAULT 'expense';
UPDATE expenses SET expense_type = 'subscription' WHERE subscription_id IS NOT NULL AND (expense_type IS NULL OR expense_type = 'expense');
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);

-- Backfill item_id for subscriptions that don't have one (e.g. created before item_id existed).
-- Creates an item with the same name and links it to the subscription.
DO $$
DECLARE
  sub RECORD;
  new_item_id BIGINT;
BEGIN
  FOR sub IN SELECT id, name, description, category FROM subscriptions WHERE item_id IS NULL
  LOOP
    INSERT INTO items (name, description, category, unit, item_type, is_active)
    VALUES (sub.name, sub.description, sub.category, 'unit', 'item', true)
    RETURNING id INTO new_item_id;
    UPDATE subscriptions SET item_id = new_item_id WHERE id = sub.id;
  END LOOP;
END $$;
