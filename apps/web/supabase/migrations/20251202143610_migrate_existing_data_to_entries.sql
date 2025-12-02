-- Migrate existing data to entries and payments
-- This migration converts existing sales, expenses, subscriptions, loans, leasing to entries
-- and converts actual_payments to payments linked to entries

-- Step 1: Create entries from sales (inputs)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, reference_id, is_active, created_at, updated_at)
SELECT 
  'input' as direction,
  'sale' as entry_type,
  COALESCE(description, CONCAT('Sale - ', type)) as name,
  amount,
  description,
  date as entry_date,
  id as reference_id,
  true as is_active,
  created_at,
  updated_at
FROM sales
ON CONFLICT DO NOTHING;

-- Step 2: Create entries from expenses (outputs)
INSERT INTO entries (direction, entry_type, name, amount, description, category, vendor, entry_date, reference_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'expense' as entry_type,
  name,
  amount,
  description,
  category,
  vendor,
  COALESCE(expense_date, start_date) as entry_date,
  id as reference_id,
  is_active,
  created_at,
  updated_at
FROM expenses
ON CONFLICT DO NOTHING;

-- Step 2b: Create OUTPUT entries from expense projection entries (individual payment dates)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, due_date, reference_id, schedule_entry_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'expense_payment' as entry_type,
  CONCAT(e.name, ' - ', epe.month) as name,
  COALESCE(epe.actual_amount, epe.amount) as amount,
  epe.notes as description,
  CONCAT(epe.month, '-01')::DATE as entry_date,
  CONCAT(epe.month, '-01')::DATE as due_date,
  epe.expense_id as reference_id,
  epe.id as schedule_entry_id,
  true as is_active,
  epe.created_at,
  epe.updated_at
FROM expense_projection_entries epe
INNER JOIN expenses e ON e.id = epe.expense_id
ON CONFLICT DO NOTHING;

-- Step 3: Create entries from subscriptions (outputs)
INSERT INTO entries (direction, entry_type, name, amount, description, category, vendor, entry_date, reference_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'subscription' as entry_type,
  name,
  amount,
  description,
  category,
  vendor,
  start_date as entry_date,
  id as reference_id,
  is_active,
  created_at,
  updated_at
FROM subscriptions
ON CONFLICT DO NOTHING;

-- Step 4: Create INPUT entries from loans (principal amount received)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, reference_id, is_active, created_at, updated_at)
SELECT 
  'input' as direction,
  'loan' as entry_type,
  name,
  principal_amount as amount,
  description,
  start_date as entry_date,
  id as reference_id,
  true as is_active,
  created_at,
  updated_at
FROM loans
ON CONFLICT DO NOTHING;

-- Step 5: Create OUTPUT entries from loan schedules (repayments)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, due_date, reference_id, schedule_entry_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'loan_payment' as entry_type,
  CONCAT(l.name, ' - Payment Month ', ls.month) as name,
  ls.total_payment as amount,
  CONCAT('Principal: ', ls.principal_payment, ', Interest: ', ls.interest_payment) as description,
  ls.payment_date as entry_date,
  ls.payment_date as due_date,
  ls.loan_id as reference_id,
  ls.id as schedule_entry_id,
  true as is_active,
  ls.created_at,
  ls.updated_at
FROM loan_schedules ls
INNER JOIN loans l ON l.id = ls.loan_id
ON CONFLICT DO NOTHING;

-- Step 6: Create OUTPUT entries from leasing payments
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, reference_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'leasing' as entry_type,
  name,
  amount,
  description,
  start_date as entry_date,
  id as reference_id,
  is_active,
  created_at,
  updated_at
FROM leasing_payments
ON CONFLICT DO NOTHING;

-- Step 7: Create OUTPUT entries from leasing timeline entries (individual payment dates)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, due_date, reference_id, schedule_entry_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'leasing_payment' as entry_type,
  CONCAT(lp.name, ' - ', lte.month) as name,
  COALESCE(lte.actual_amount, lte.amount) as amount,
  lte.notes as description,
  lte.payment_date as entry_date,
  lte.payment_date as due_date,
  lte.leasing_id as reference_id,
  lte.id as schedule_entry_id,
  true as is_active,
  lte.created_at,
  lte.updated_at
FROM leasing_timeline_entries lte
INNER JOIN leasing_payments lp ON lp.id = lte.leasing_id
ON CONFLICT DO NOTHING;

-- Step 7b: Create OUTPUT entries from subscription projection entries (individual payment dates)
INSERT INTO entries (direction, entry_type, name, amount, description, entry_date, due_date, reference_id, schedule_entry_id, is_active, created_at, updated_at)
SELECT 
  'output' as direction,
  'subscription_payment' as entry_type,
  CONCAT(s.name, ' - ', spe.month) as name,
  COALESCE(spe.actual_amount, spe.amount) as amount,
  spe.notes as description,
  CONCAT(spe.month, '-01')::DATE as entry_date,
  CONCAT(spe.month, '-01')::DATE as due_date,
  spe.subscription_id as reference_id,
  spe.id as schedule_entry_id,
  true as is_active,
  spe.created_at,
  spe.updated_at
FROM subscription_projection_entries spe
INNER JOIN subscriptions s ON s.id = spe.subscription_id
ON CONFLICT DO NOTHING;

-- Step 8: Migrate actual_payments to payments
-- First, try to find matching entries for each actual_payment
INSERT INTO payments (entry_id, payment_date, amount, is_paid, paid_date, notes, created_at, updated_at)
SELECT 
  e.id as entry_id,
  ap.payment_date,
  ap.amount,
  ap.is_paid,
  ap.paid_date,
  ap.notes,
  ap.created_at,
  ap.updated_at
FROM actual_payments ap
INNER JOIN entries e ON (
  e.direction = ap.direction 
  AND e.entry_type = ap.payment_type 
  AND e.reference_id = ap.reference_id
  AND (ap.schedule_entry_id IS NULL OR e.schedule_entry_id = ap.schedule_entry_id)
)
WHERE NOT EXISTS (
  SELECT 1 FROM payments p 
  WHERE p.entry_id = e.id 
    AND p.payment_date = ap.payment_date
    AND p.amount = ap.amount
)
ON CONFLICT DO NOTHING;

-- Step 9: For payments without matching entries, create entries first
-- (This handles edge cases where payments exist but entries don't)
INSERT INTO entries (direction, entry_type, name, amount, entry_date, reference_id, schedule_entry_id, is_active, created_at, updated_at)
SELECT DISTINCT
  ap.direction,
  ap.payment_type as entry_type,
  CONCAT(ap.payment_type, ' - Payment ', ap.month) as name,
  ap.amount,
  ap.payment_date as entry_date,
  ap.reference_id,
  ap.schedule_entry_id,
  true as is_active,
  ap.created_at,
  ap.updated_at
FROM actual_payments ap
WHERE NOT EXISTS (
  SELECT 1 FROM entries e 
  WHERE e.direction = ap.direction 
    AND e.entry_type = ap.payment_type 
    AND e.reference_id = ap.reference_id
    AND (ap.schedule_entry_id IS NULL OR e.schedule_entry_id = ap.schedule_entry_id)
)
ON CONFLICT DO NOTHING;

-- Step 10: Link remaining payments to the newly created entries
INSERT INTO payments (entry_id, payment_date, amount, is_paid, paid_date, notes, created_at, updated_at)
SELECT 
  e.id as entry_id,
  ap.payment_date,
  ap.amount,
  ap.is_paid,
  ap.paid_date,
  ap.notes,
  ap.created_at,
  ap.updated_at
FROM actual_payments ap
INNER JOIN entries e ON (
  e.direction = ap.direction 
  AND e.entry_type = ap.payment_type 
  AND e.reference_id = ap.reference_id
  AND (ap.schedule_entry_id IS NULL OR e.schedule_entry_id = ap.schedule_entry_id)
)
WHERE NOT EXISTS (
  SELECT 1 FROM payments p 
  WHERE p.entry_id = e.id 
    AND p.payment_date = ap.payment_date
    AND p.amount = ap.amount
)
ON CONFLICT DO NOTHING;

