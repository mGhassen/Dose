-- Merge vendors into suppliers with type field
-- Suppliers can be: 'supplier' (for items/inventory), 'vendor' (for expenses/subscriptions/loans/leasing), or both

-- Step 1: Add type field to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50)[] DEFAULT ARRAY['supplier']::VARCHAR(50)[];

-- Add check constraint to ensure valid types
ALTER TABLE suppliers 
ADD CONSTRAINT check_supplier_type 
CHECK (supplier_type <@ ARRAY['supplier', 'vendor']::VARCHAR(50)[]);

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers USING GIN(supplier_type);

-- Step 2: Migrate vendors data into suppliers
-- For each vendor, create or update a supplier with vendor type
INSERT INTO suppliers (name, email, phone, address, contact_person, notes, is_active, supplier_type, created_at, updated_at)
SELECT 
  v.name,
  v.email,
  v.phone,
  v.address,
  v.contact_person,
  v.notes,
  v.is_active,
  ARRAY['vendor']::VARCHAR(50)[],
  v.created_at,
  v.updated_at
FROM vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers s 
  WHERE s.name = v.name 
  AND 'vendor' = ANY(s.supplier_type)
)
ON CONFLICT DO NOTHING;

-- If a supplier with same name exists, add 'vendor' to its type array
UPDATE suppliers s
SET supplier_type = 
  CASE 
    WHEN 'supplier' = ANY(s.supplier_type) THEN ARRAY['supplier', 'vendor']::VARCHAR(50)[]
    ELSE ARRAY['vendor']::VARCHAR(50)[]
  END
FROM vendors v
WHERE s.name = v.name
AND NOT ('vendor' = ANY(s.supplier_type));

-- Step 3: Create mapping table for vendor_id -> supplier_id
CREATE TEMP TABLE vendor_to_supplier_map AS
SELECT 
  v.id AS vendor_id,
  s.id AS supplier_id
FROM vendors v
JOIN suppliers s ON s.name = v.name
WHERE 'vendor' = ANY(s.supplier_type);

-- Step 4: Update items.vendor_id to reference suppliers.id
-- First, update items that reference vendors
UPDATE items i
SET vendor_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
WHERE i.vendor_id = vtsm.vendor_id;

-- Drop old foreign key constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_vendor_id_fkey;

-- Add new foreign key constraint to suppliers
ALTER TABLE items 
ADD CONSTRAINT items_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Step 5: Add supplier_id columns to expenses, subscriptions, loans, leasing
-- Expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);

-- Migrate vendor string to supplier_id for expenses
UPDATE expenses e
SET supplier_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
JOIN suppliers s ON s.id = vtsm.supplier_id
WHERE e.vendor = s.name
AND e.supplier_id IS NULL;

-- Subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_supplier_id ON subscriptions(supplier_id);

-- Migrate vendor string to supplier_id for subscriptions
UPDATE subscriptions sub
SET supplier_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
JOIN suppliers s ON s.id = vtsm.supplier_id
WHERE sub.vendor = s.name
AND sub.supplier_id IS NULL;

-- Loans
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loans_supplier_id ON loans(supplier_id);

-- Migrate lender string to supplier_id for loans
UPDATE loans l
SET supplier_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
JOIN suppliers s ON s.id = vtsm.supplier_id
WHERE l.lender = s.name
AND l.supplier_id IS NULL;

-- Leasing
ALTER TABLE leasing_payments 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leasing_supplier_id ON leasing_payments(supplier_id);

-- Migrate lessor string to supplier_id for leasing
UPDATE leasing_payments lp
SET supplier_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
JOIN suppliers s ON s.id = vtsm.supplier_id
WHERE lp.lessor = s.name
AND lp.supplier_id IS NULL;

-- Entries table (also has vendor field)
ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_supplier_id ON entries(supplier_id);

-- Migrate vendor string to supplier_id for entries
UPDATE entries e
SET supplier_id = vtsm.supplier_id
FROM vendor_to_supplier_map vtsm
JOIN suppliers s ON s.id = vtsm.supplier_id
WHERE e.vendor = s.name
AND e.supplier_id IS NULL;

-- Step 6: Drop vendors table (after all migrations)
DROP TABLE IF EXISTS vendors CASCADE;

-- Clean up temp table
DROP TABLE IF EXISTS vendor_to_supplier_map;

