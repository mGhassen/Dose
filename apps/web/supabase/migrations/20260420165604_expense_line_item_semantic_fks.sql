-- Semantic links on expense lines (subscription pattern extended): loan, leasing, personnel, salary projection.
-- line_kind distinguishes payroll net vs taxes, contractor hours, loan/leasing payment lines.

ALTER TABLE expense_line_items
  ADD COLUMN IF NOT EXISTS loan_id BIGINT REFERENCES loans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_schedule_id BIGINT REFERENCES loan_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leasing_id BIGINT REFERENCES leasing_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leasing_timeline_entry_id BIGINT REFERENCES leasing_timeline_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personnel_id BIGINT REFERENCES personnel(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personnel_hour_entry_id BIGINT REFERENCES personnel_hour_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personnel_salary_projection_id BIGINT REFERENCES personnel_salary_projections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_kind VARCHAR(40);

COMMENT ON COLUMN expense_line_items.line_kind IS 'salary_net | payroll_taxes | contractor_hours | loan_payment | leasing_payment (optional; display / reporting)';

CREATE INDEX IF NOT EXISTS idx_expense_line_items_loan_id ON expense_line_items(loan_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_loan_schedule_id ON expense_line_items(loan_schedule_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_leasing_id ON expense_line_items(leasing_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_leasing_timeline_entry_id ON expense_line_items(leasing_timeline_entry_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_personnel_id ON expense_line_items(personnel_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_personnel_hour_entry_id ON expense_line_items(personnel_hour_entry_id);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_personnel_salary_projection_id ON expense_line_items(personnel_salary_projection_id);

-- Backfill: loan/leasing expenses that have no lines yet (created before line inserts)
INSERT INTO expense_line_items (
  expense_id,
  item_id,
  loan_id,
  loan_schedule_id,
  leasing_id,
  leasing_timeline_entry_id,
  quantity,
  unit_id,
  unit_price,
  unit_cost,
  tax_rate_percent,
  tax_amount,
  line_total,
  sort_order,
  line_kind
)
SELECT DISTINCT ON (e.id)
  e.id,
  NULL,
  e.loan_id,
  ls.id,
  NULL,
  NULL,
  1,
  NULL,
  e.amount,
  NULL,
  0,
  0,
  e.amount,
  0,
  'loan_payment'
FROM expenses e
JOIN loan_schedules ls ON ls.loan_id = e.loan_id AND ls.payment_date = e.expense_date
WHERE e.expense_type = 'loan'
  AND e.loan_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM expense_line_items eli WHERE eli.expense_id = e.id)
ORDER BY e.id, ls.id;

INSERT INTO expense_line_items (
  expense_id,
  item_id,
  loan_id,
  loan_schedule_id,
  leasing_id,
  leasing_timeline_entry_id,
  quantity,
  unit_id,
  unit_price,
  unit_cost,
  tax_rate_percent,
  tax_amount,
  line_total,
  sort_order,
  line_kind
)
SELECT DISTINCT ON (e.id)
  e.id,
  NULL,
  NULL,
  NULL,
  e.leasing_id,
  lte.id,
  1,
  NULL,
  e.amount,
  NULL,
  0,
  0,
  e.amount,
  0,
  'leasing_payment'
FROM expenses e
JOIN leasing_timeline_entries lte ON lte.leasing_id = e.leasing_id AND lte.payment_date = e.expense_date
WHERE e.expense_type = 'leasing'
  AND e.leasing_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM expense_line_items eli WHERE eli.expense_id = e.id)
ORDER BY e.id, lte.id;
