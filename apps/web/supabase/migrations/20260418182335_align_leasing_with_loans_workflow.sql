-- Align leasing workflow with loans:
--   1) Add leasing_id to expenses (mirror of loan_id).
--   2) Backfill one entries row per leasing_timeline_entries row
--      (entry_type='leasing_payment', schedule_entry_id, reference_id).
--   3) Migrate actual_payments (payment_type='leasing') into payments.
--   4) Backfill expenses for already-paid leasing installments.
--   5) Add a trigger on payments that recomputes leasing_timeline_entries.is_paid.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS leasing_id BIGINT REFERENCES leasing_payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_leasing_id ON expenses(leasing_id);

-- ---------------------------------------------------------------------------
-- Backfill entries for existing leasing_timeline_entries
-- ---------------------------------------------------------------------------
INSERT INTO entries (
  direction,
  entry_type,
  name,
  amount,
  description,
  entry_date,
  due_date,
  reference_id,
  schedule_entry_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  'output',
  'leasing_payment',
  COALESCE(lp.name, 'Leasing') || ' - ' || lte.month,
  lte.amount,
  NULL,
  lte.payment_date,
  lte.payment_date,
  lte.leasing_id,
  lte.id,
  true,
  lte.created_at,
  lte.updated_at
FROM leasing_timeline_entries lte
JOIN leasing_payments lp ON lp.id = lte.leasing_id
WHERE NOT EXISTS (
  SELECT 1 FROM entries e
  WHERE e.entry_type = 'leasing_payment'
    AND e.schedule_entry_id = lte.id
);

-- ---------------------------------------------------------------------------
-- Migrate leasing actual_payments into payments
-- ---------------------------------------------------------------------------
INSERT INTO payments (
  entry_id,
  payment_date,
  amount,
  is_paid,
  paid_date,
  payment_method,
  notes,
  created_at,
  updated_at
)
SELECT
  e.id,
  ap.payment_date,
  ap.amount,
  ap.is_paid,
  ap.paid_date,
  NULL,
  ap.notes,
  ap.created_at,
  ap.updated_at
FROM actual_payments ap
JOIN leasing_timeline_entries lte
  ON lte.leasing_id = ap.reference_id AND lte.month = ap.month
JOIN entries e
  ON e.entry_type = 'leasing_payment' AND e.schedule_entry_id = lte.id
WHERE ap.payment_type = 'leasing'
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.entry_id = e.id
      AND p.payment_date = ap.payment_date
      AND p.amount = ap.amount
  );

-- ---------------------------------------------------------------------------
-- Backfill expenses for paid leasing installments
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  name,
  category,
  expense_type,
  amount,
  subtotal,
  total_tax,
  total_discount,
  leasing_id,
  expense_date,
  start_date,
  description,
  is_active,
  created_at,
  updated_at
)
SELECT
  COALESCE(lp.name, 'Leasing') || ' - Payment ' || lte.month,
  'leasing',
  'leasing',
  lte.amount,
  lte.amount,
  0,
  0,
  lte.leasing_id,
  lte.payment_date,
  lte.payment_date,
  NULL,
  true,
  NOW(),
  NOW()
FROM leasing_timeline_entries lte
JOIN leasing_payments lp ON lp.id = lte.leasing_id
WHERE EXISTS (
  SELECT 1
  FROM entries e
  JOIN payments p ON p.entry_id = e.id
  WHERE e.entry_type = 'leasing_payment'
    AND e.schedule_entry_id = lte.id
    AND p.is_paid = true
)
AND NOT EXISTS (
  SELECT 1 FROM expenses x
  WHERE x.leasing_id = lte.leasing_id
    AND x.expense_type = 'leasing'
    AND x.expense_date = lte.payment_date
);

-- ---------------------------------------------------------------------------
-- Recompute is_paid/paid_date for a given leasing timeline entry based on payments
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_leasing_timeline_paid_status(p_timeline_entry_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected    NUMERIC;
  v_total_paid  NUMERIC;
  v_latest_paid DATE;
BEGIN
  SELECT amount INTO v_expected
  FROM leasing_timeline_entries
  WHERE id = p_timeline_entry_id;

  IF v_expected IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(pay.amount), 0),
    MAX(COALESCE(pay.paid_date, pay.payment_date))
  INTO v_total_paid, v_latest_paid
  FROM payments pay
  JOIN entries e ON e.id = pay.entry_id
  WHERE pay.is_paid = true
    AND e.entry_type = 'leasing_payment'
    AND e.schedule_entry_id = p_timeline_entry_id;

  UPDATE leasing_timeline_entries
  SET is_paid   = (v_total_paid >= v_expected),
      paid_date = CASE
        WHEN v_total_paid >= v_expected THEN v_latest_paid
        ELSE NULL
      END
  WHERE id = p_timeline_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_payments_sync_leasing_timeline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_id BIGINT;
  v_new_id BIGINT;
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    SELECT e.schedule_entry_id INTO v_old_id
    FROM entries e
    WHERE e.id = OLD.entry_id AND e.entry_type = 'leasing_payment';
    IF v_old_id IS NOT NULL THEN
      PERFORM refresh_leasing_timeline_paid_status(v_old_id);
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    SELECT e.schedule_entry_id INTO v_new_id
    FROM entries e
    WHERE e.id = NEW.entry_id AND e.entry_type = 'leasing_payment';
    IF v_new_id IS NOT NULL AND v_new_id IS DISTINCT FROM v_old_id THEN
      PERFORM refresh_leasing_timeline_paid_status(v_new_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'payments_sync_leasing_timeline'
      AND tgrelid = 'payments'::regclass
  ) THEN
    DROP TRIGGER payments_sync_leasing_timeline ON payments;
  END IF;
END $$;

CREATE TRIGGER payments_sync_leasing_timeline
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_sync_leasing_timeline();

-- Refresh is_paid/paid_date for all existing leasing timeline entries
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM leasing_timeline_entries LOOP
    PERFORM refresh_leasing_timeline_paid_status(r.id);
  END LOOP;
END $$;
