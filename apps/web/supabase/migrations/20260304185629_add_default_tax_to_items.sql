-- Item-level default tax: when item is added to a sale or expense line, this rate pre-fills (user can override)
ALTER TABLE items ADD COLUMN IF NOT EXISTS default_tax_rate_percent DECIMAL(5,2) NULL;
