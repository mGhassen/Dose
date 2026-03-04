-- Subscription as expense line item: line can reference a subscription (the "item" is the subscription).
ALTER TABLE expense_line_items ADD COLUMN IF NOT EXISTS subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expense_line_items_subscription_id ON expense_line_items(subscription_id);

-- Backfill: expenses with subscription_id get their first line's subscription_id set
UPDATE expense_line_items eli
SET subscription_id = e.subscription_id
FROM expenses e
WHERE eli.expense_id = e.id
  AND e.subscription_id IS NOT NULL
  AND eli.subscription_id IS NULL
  AND eli.id = (SELECT MIN(id) FROM expense_line_items WHERE expense_id = e.id);

-- Expenses with subscription_id but no line items: insert one line
INSERT INTO expense_line_items (expense_id, item_id, subscription_id, quantity, unit_id, unit_price, unit_cost, tax_rate_percent, tax_amount, line_total, sort_order)
SELECT e.id, NULL, e.subscription_id, 1, NULL, e.amount, NULL, 0, 0, e.amount, 0
FROM expenses e
WHERE e.subscription_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM expense_line_items eli WHERE eli.expense_id = e.id);
