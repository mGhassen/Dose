-- Loan payments integration:
--   1) Add loan_id column to expenses so loan repayments can be recorded as expenses
--      (consistent with subscription payments using subscription_id).
--   2) Add a trigger on payments that recomputes loan_schedules.is_paid / paid_date
--      based on the sum of paid payments attached to the corresponding loan_payment entry.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS loan_id BIGINT REFERENCES loans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_loan_id ON expenses(loan_id);

-- Function: recompute is_paid/paid_date for a given loan schedule row
CREATE OR REPLACE FUNCTION refresh_loan_schedule_paid_status(p_schedule_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_payment NUMERIC;
  v_total_paid    NUMERIC;
  v_latest_paid   DATE;
BEGIN
  SELECT total_payment INTO v_total_payment
  FROM loan_schedules
  WHERE id = p_schedule_id;

  IF v_total_payment IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(pay.amount), 0),
    MAX(COALESCE(pay.paid_date, pay.payment_date))
  INTO v_total_paid, v_latest_paid
  FROM payments pay
  JOIN entries e ON e.id = pay.entry_id
  WHERE pay.is_paid = true
    AND e.entry_type = 'loan_payment'
    AND e.schedule_entry_id = p_schedule_id;

  UPDATE loan_schedules
  SET is_paid   = (v_total_paid >= v_total_payment),
      paid_date = CASE
        WHEN v_total_paid >= v_total_payment THEN v_latest_paid
        ELSE NULL
      END
  WHERE id = p_schedule_id;
END;
$$;

-- Trigger function: resolves the schedule id from the affected payment's entry
-- and calls the refresh function for both NEW and OLD schedule rows (handles UPDATE that moves the entry).
CREATE OR REPLACE FUNCTION trg_payments_sync_loan_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_schedule_id BIGINT;
  v_new_schedule_id BIGINT;
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    SELECT e.schedule_entry_id INTO v_old_schedule_id
    FROM entries e
    WHERE e.id = OLD.entry_id AND e.entry_type = 'loan_payment';
    IF v_old_schedule_id IS NOT NULL THEN
      PERFORM refresh_loan_schedule_paid_status(v_old_schedule_id);
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    SELECT e.schedule_entry_id INTO v_new_schedule_id
    FROM entries e
    WHERE e.id = NEW.entry_id AND e.entry_type = 'loan_payment';
    IF v_new_schedule_id IS NOT NULL AND v_new_schedule_id IS DISTINCT FROM v_old_schedule_id THEN
      PERFORM refresh_loan_schedule_paid_status(v_new_schedule_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'payments_sync_loan_schedule'
      AND tgrelid = 'payments'::regclass
  ) THEN
    DROP TRIGGER payments_sync_loan_schedule ON payments;
  END IF;
END $$;

CREATE TRIGGER payments_sync_loan_schedule
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION trg_payments_sync_loan_schedule();

-- Backfill: recompute is_paid/paid_date for all existing schedules
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM loan_schedules LOOP
    PERFORM refresh_loan_schedule_paid_status(r.id);
  END LOOP;
END $$;
