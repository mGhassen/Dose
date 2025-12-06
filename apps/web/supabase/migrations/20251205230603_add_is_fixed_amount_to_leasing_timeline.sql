-- Add is_fixed_amount field to leasing_timeline_entries
-- This field indicates whether an amount has been manually set and should not be modified by projection

ALTER TABLE leasing_timeline_entries
ADD COLUMN IF NOT EXISTS is_fixed_amount BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leasing_timeline_is_fixed_amount ON leasing_timeline_entries(is_fixed_amount);

