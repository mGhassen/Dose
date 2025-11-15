-- Items Table
-- Stores inventory/product items that can be associated with sales, expenses, and other transactions

CREATE TABLE items (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  sku VARCHAR(100),
  unit VARCHAR(50),
  unit_price DECIMAL(15,2),
  vendor_id BIGINT REFERENCES vendors(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_vendor_id ON items(vendor_id);
CREATE INDEX idx_items_is_active ON items(is_active);

