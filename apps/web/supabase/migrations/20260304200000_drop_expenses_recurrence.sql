-- Expenses are always one-time (payment events). Recurrence lives on subscriptions.
ALTER TABLE expenses DROP COLUMN IF EXISTS recurrence;
