-- Inventory Management System
-- Creates all tables for inventory, suppliers, recipes, and stock management

-- ============================================================================
-- INGREDIENTS
-- ============================================================================
-- Base ingredients that can be used in recipes
CREATE TABLE ingredients (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL, -- e.g., 'kg', 'L', 'piece', 'box'
  category VARCHAR(100), -- e.g., 'vegetables', 'meat', 'dairy', 'spices'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_is_active ON ingredients(is_active);

-- ============================================================================
-- RECIPES
-- ============================================================================
-- Recipes that use ingredients
CREATE TABLE recipes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  serving_size INTEGER, -- Number of servings this recipe produces
  preparation_time INTEGER, -- Minutes
  cooking_time INTEGER, -- Minutes
  instructions TEXT, -- Cooking instructions
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_is_active ON recipes(is_active);

-- ============================================================================
-- RECIPE INGREDIENTS
-- ============================================================================
-- Junction table: ingredients used in recipes with quantities
CREATE TABLE recipe_ingredients (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(15,4) NOT NULL, -- Quantity needed
  unit VARCHAR(50) NOT NULL, -- Unit for this quantity (should match ingredient unit or be convertible)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
-- Suppliers for ingredients (different from vendors - focused on inventory)
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  contact_person VARCHAR(255),
  payment_terms VARCHAR(100), -- e.g., 'Net 30', 'COD'
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- ============================================================================
-- SUPPLIER CATALOGS
-- ============================================================================
-- Catalog of ingredients available from suppliers with prices
CREATE TABLE supplier_catalogs (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  supplier_sku VARCHAR(100), -- Supplier's SKU for this ingredient
  unit_price DECIMAL(15,4) NOT NULL, -- Price per unit
  unit VARCHAR(50) NOT NULL, -- Unit for the price
  minimum_order_quantity DECIMAL(15,4), -- Minimum order quantity
  lead_time_days INTEGER, -- Days to deliver
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE, -- When this price becomes effective
  expiry_date DATE, -- When this price expires (NULL = current price)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(supplier_id, ingredient_id, effective_date)
);

CREATE INDEX idx_supplier_catalogs_supplier_id ON supplier_catalogs(supplier_id);
CREATE INDEX idx_supplier_catalogs_ingredient_id ON supplier_catalogs(ingredient_id);
CREATE INDEX idx_supplier_catalogs_effective_date ON supplier_catalogs(effective_date);
CREATE INDEX idx_supplier_catalogs_is_active ON supplier_catalogs(is_active);

-- ============================================================================
-- SUPPLIER ORDERS
-- ============================================================================
-- Orders placed with suppliers
CREATE TABLE supplier_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number VARCHAR(100) UNIQUE, -- Order reference number
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'
  total_amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplier_orders_supplier_id ON supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_order_date ON supplier_orders(order_date);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX idx_supplier_orders_order_number ON supplier_orders(order_number);

-- ============================================================================
-- SUPPLIER ORDER ITEMS
-- ============================================================================
-- Items in supplier orders
CREATE TABLE supplier_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity DECIMAL(15,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL, -- quantity * unit_price
  received_quantity DECIMAL(15,4), -- Actual quantity received
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supplier_order_items_order_id ON supplier_order_items(order_id);
CREATE INDEX idx_supplier_order_items_ingredient_id ON supplier_order_items(ingredient_id);

-- ============================================================================
-- STOCK LEVELS
-- ============================================================================
-- Current stock levels for ingredients
CREATE TABLE stock_levels (
  id BIGSERIAL PRIMARY KEY,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  location VARCHAR(255), -- Storage location (e.g., 'Freezer A', 'Shelf 3')
  minimum_stock_level DECIMAL(15,4), -- Reorder point
  maximum_stock_level DECIMAL(15,4), -- Maximum stock to hold
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ingredient_id, location)
);

CREATE INDEX idx_stock_levels_ingredient_id ON stock_levels(ingredient_id);
CREATE INDEX idx_stock_levels_location ON stock_levels(location);

-- ============================================================================
-- STOCK MOVEMENTS
-- ============================================================================
-- History of stock movements (in/out)
CREATE TABLE stock_movements (
  id BIGSERIAL PRIMARY KEY,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer', 'waste', 'expired'
  quantity DECIMAL(15,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50), -- 'supplier_order', 'recipe', 'manual', 'waste', 'expiry'
  reference_id BIGINT, -- ID of the related record (order, recipe, etc.)
  location VARCHAR(255), -- Storage location
  notes TEXT,
  movement_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by BIGINT, -- User ID (if you have user tracking)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_ingredient_id ON stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================================================
-- EXPIRY DATES
-- ============================================================================
-- Track expiry dates for stock items
CREATE TABLE expiry_dates (
  id BIGSERIAL PRIMARY KEY,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  stock_movement_id BIGINT REFERENCES stock_movements(id) ON DELETE SET NULL, -- Link to the movement that added this stock
  quantity DECIMAL(15,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  location VARCHAR(255),
  is_expired BOOLEAN DEFAULT false,
  disposed_date DATE, -- When expired items were disposed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expiry_dates_ingredient_id ON expiry_dates(ingredient_id);
CREATE INDEX idx_expiry_dates_expiry_date ON expiry_dates(expiry_date);
CREATE INDEX idx_expiry_dates_is_expired ON expiry_dates(is_expired);
CREATE INDEX idx_expiry_dates_stock_movement_id ON expiry_dates(stock_movement_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_catalogs_updated_at BEFORE UPDATE ON supplier_catalogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_order_items_updated_at BEFORE UPDATE ON supplier_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expiry_dates_updated_at BEFORE UPDATE ON expiry_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO UPDATE STOCK LEVELS ON MOVEMENT
-- ============================================================================
-- Automatically update stock_levels when stock_movements are created
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  current_qty DECIMAL(15,4);
  new_qty DECIMAL(15,4);
BEGIN
  -- Get current stock level for this ingredient and location
  SELECT quantity INTO current_qty
  FROM stock_levels
  WHERE ingredient_id = NEW.ingredient_id
    AND (location = NEW.location OR (location IS NULL AND NEW.location IS NULL))
  LIMIT 1;

  -- If no stock level exists, create one
  IF current_qty IS NULL THEN
    INSERT INTO stock_levels (ingredient_id, quantity, unit, location, last_updated)
    VALUES (NEW.ingredient_id, 0, NEW.unit, NEW.location, NOW());
    current_qty := 0;
  END IF;

  -- Calculate new quantity based on movement type
  IF NEW.movement_type IN ('in', 'adjustment') THEN
    new_qty := current_qty + NEW.quantity;
  ELSIF NEW.movement_type IN ('out', 'waste', 'expired', 'transfer') THEN
    new_qty := current_qty - NEW.quantity;
    -- Prevent negative stock
    IF new_qty < 0 THEN
      new_qty := 0;
    END IF;
  ELSE
    new_qty := current_qty;
  END IF;

  -- Update stock level
  UPDATE stock_levels
  SET quantity = new_qty,
      unit = NEW.unit,
      last_updated = NOW()
  WHERE ingredient_id = NEW.ingredient_id
    AND (location = NEW.location OR (location IS NULL AND NEW.location IS NULL));

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_on_movement_trigger
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_movement();

-- ============================================================================
-- FUNCTION TO CHECK EXPIRY DATES
-- ============================================================================
-- Automatically mark items as expired when expiry_date passes
CREATE OR REPLACE FUNCTION check_expiry_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as expired if expiry_date has passed
  IF NEW.expiry_date < CURRENT_DATE THEN
    NEW.is_expired := true;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_expiry_dates_trigger
  BEFORE INSERT OR UPDATE ON expiry_dates
  FOR EACH ROW
  EXECUTE FUNCTION check_expiry_dates();

