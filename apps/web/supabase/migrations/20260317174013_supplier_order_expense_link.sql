-- Link received supplier orders to exactly one expense
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS supplier_order_id BIGINT;

-- Ensure each supplier order maps to at most one expense.
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_supplier_order_id_unique
  ON expenses (supplier_order_id);

CREATE INDEX IF NOT EXISTS idx_expenses_supplier_order_id
  ON expenses (supplier_order_id);

-- Deleting the supplier order should delete the linked expense.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_supplier_order_id_fkey'
  ) THEN
    ALTER TABLE expenses
      ADD CONSTRAINT expenses_supplier_order_id_fkey
      FOREIGN KEY (supplier_order_id)
      REFERENCES supplier_orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

