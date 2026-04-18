-- Drop the static check constraint on suppliers.supplier_type.
-- Valid types are managed dynamically via metadata_enum_values ('SupplierType'),
-- so the hard-coded CHECK ('supplier', 'vendor') rejected new types like
-- 'lender', 'lessor', 'customer', 'bank' that already exist in the seed.

ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS check_supplier_type;
