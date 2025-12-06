-- Refactor: Merge ingredients into items and make recipes items
-- This allows recipes to contain other recipes (nested recipes)
-- Note: items table already exists from earlier migration, so we merge ingredients into it

-- Step 1: Add item_type to recipes table to mark them as recipe items
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'recipe';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Step 2: Add item_type and ensure required columns exist in items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'item';
-- Ensure unit column exists (it should from create_items_table, but check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'unit') THEN
    ALTER TABLE items ADD COLUMN unit VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'category') THEN
    ALTER TABLE items ADD COLUMN category VARCHAR(100);
  END IF;
  -- Add recipe-specific columns to items table so recipes can be items
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'serving_size') THEN
    ALTER TABLE items ADD COLUMN serving_size INTEGER;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'preparation_time') THEN
    ALTER TABLE items ADD COLUMN preparation_time INTEGER;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'cooking_time') THEN
    ALTER TABLE items ADD COLUMN cooking_time INTEGER;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'instructions') THEN
    ALTER TABLE items ADD COLUMN instructions TEXT;
  END IF;
END $$;

-- Step 3: Merge ingredients into items table (if ingredients table exists)
DO $$
DECLARE
  ingredient_record RECORD;
  new_item_id BIGINT;
  idx_record RECORD;
  trig_record RECORD;
  constr_record RECORD;
  fk_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ingredients') THEN
    -- Create a mapping table to track ingredient_id -> item_id mappings
    -- Drop temp table if it exists (no notice if it doesn't)
    BEGIN
      DROP TABLE ingredient_to_item_map;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
    CREATE TEMP TABLE ingredient_to_item_map (
      ingredient_id BIGINT PRIMARY KEY,
      item_id BIGINT
    );
    
    -- Migrate each ingredient to items table
    FOR ingredient_record IN SELECT * FROM ingredients LOOP
      -- Check if item with same name already exists
      SELECT id INTO new_item_id
      FROM items
      WHERE name = ingredient_record.name AND item_type = 'item'
      LIMIT 1;
      
      IF new_item_id IS NULL THEN
        -- Insert new item
        INSERT INTO items (name, description, unit, category, is_active, item_type, created_at, updated_at)
        VALUES (
          ingredient_record.name,
          ingredient_record.description,
          ingredient_record.unit,
          ingredient_record.category,
          ingredient_record.is_active,
          'item',
          ingredient_record.created_at,
          ingredient_record.updated_at
        )
        RETURNING id INTO new_item_id;
      END IF;
      
      -- Store mapping
      INSERT INTO ingredient_to_item_map (ingredient_id, item_id)
      VALUES (ingredient_record.id, new_item_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Update foreign keys in dependent tables using the mapping
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
      UPDATE recipe_ingredients ri
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE ri.ingredient_id = m.ingredient_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_order_items') THEN
      UPDATE supplier_order_items soi
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE soi.ingredient_id = m.ingredient_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_levels') THEN
      UPDATE stock_levels sl
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE sl.ingredient_id = m.ingredient_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
      UPDATE stock_movements sm
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE sm.ingredient_id = m.ingredient_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expiry_dates') THEN
      UPDATE expiry_dates ed
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE ed.ingredient_id = m.ingredient_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_catalogs') THEN
      UPDATE supplier_catalogs sc
      SET ingredient_id = m.item_id
      FROM ingredient_to_item_map m
      WHERE sc.ingredient_id = m.ingredient_id;
    END IF;
    
    -- Drop ingredients table after migration
    -- First drop all foreign key constraints that reference ingredients from other tables
    -- This must be done before dropping the ingredients table's primary key
    BEGIN
      -- Find and drop all foreign keys that reference the ingredients table
      FOR fk_record IN
        SELECT 
          tc.table_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'ingredients'
      LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', fk_record.table_name, fk_record.constraint_name);
      END LOOP;
    END;
    
    -- Now drop the ingredients table itself
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ingredients') THEN
      -- Drop constraints on ingredients table (primary key, unique constraints)
      FOR constr_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'ingredients'
      LOOP
        EXECUTE format('ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS %I', constr_record.constraint_name);
      END LOOP;
      
      -- Drop triggers on ingredients table
      FOR trig_record IN
        SELECT tgname FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'ingredients' AND tgname NOT LIKE 'RI_%'
      LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON ingredients', trig_record.tgname);
      END LOOP;
      
      -- Drop remaining indexes (if any, after constraints are dropped)
      FOR idx_record IN 
        SELECT indexname FROM pg_indexes WHERE tablename = 'ingredients'
      LOOP
        BEGIN
          EXECUTE format('DROP INDEX IF EXISTS %I', idx_record.indexname);
        EXCEPTION WHEN OTHERS THEN
          -- Index might be automatically dropped with constraint, ignore errors
          NULL;
        END;
      END LOOP;
      
      -- Drop the table (without CASCADE since we've handled dependencies)
      DROP TABLE ingredients;
    END IF;
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_name = 'ingredients_id_seq') THEN
      DROP SEQUENCE ingredients_id_seq;
    END IF;
    
    -- Clean up temp table
    BEGIN
      DROP TABLE ingredient_to_item_map;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
END $$;

-- Step 4: Rename recipe_ingredients to recipe_items (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
    ALTER TABLE recipe_ingredients RENAME TO recipe_items;
  END IF;
  IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_name = 'recipe_ingredients_id_seq') THEN
    ALTER SEQUENCE recipe_ingredients_id_seq RENAME TO recipe_items_id_seq;
  END IF;
END $$;

-- Step 5: Update recipe_items to reference items (which can be either items or recipes)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') THEN
    -- First, drop the foreign key constraint if it exists
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'recipe_items' AND constraint_name = 'recipe_ingredients_ingredient_id_fkey') THEN
      ALTER TABLE recipe_items DROP CONSTRAINT recipe_ingredients_ingredient_id_fkey;
    END IF;
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'recipe_items' AND constraint_name = 'recipe_items_ingredient_id_fkey') THEN
      ALTER TABLE recipe_items DROP CONSTRAINT recipe_items_ingredient_id_fkey;
    END IF;
    -- Rename the column if it exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'ingredient_id') THEN
      ALTER TABLE recipe_items RENAME COLUMN ingredient_id TO item_id;
    END IF;
    -- Add new foreign key that references items (which includes both items and recipes)
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'recipe_items' AND constraint_name = 'recipe_items_item_id_fkey') THEN
      ALTER TABLE recipe_items DROP CONSTRAINT recipe_items_item_id_fkey;
    END IF;
    ALTER TABLE recipe_items ADD CONSTRAINT recipe_items_item_id_fkey 
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Update all other tables that reference ingredients to use item_id
DO $$
BEGIN
  -- supplier_catalogs (if exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_catalogs') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supplier_catalogs' AND column_name = 'ingredient_id') THEN
      ALTER TABLE supplier_catalogs RENAME COLUMN ingredient_id TO item_id;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_catalogs' AND constraint_name = 'supplier_catalogs_ingredient_id_fkey') THEN
        ALTER TABLE supplier_catalogs DROP CONSTRAINT supplier_catalogs_ingredient_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_catalogs' AND constraint_name = 'supplier_catalogs_item_id_fkey') THEN
        ALTER TABLE supplier_catalogs DROP CONSTRAINT supplier_catalogs_item_id_fkey;
      END IF;
      ALTER TABLE supplier_catalogs ADD CONSTRAINT supplier_catalogs_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- supplier_order_items
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_order_items') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supplier_order_items' AND column_name = 'ingredient_id') THEN
      ALTER TABLE supplier_order_items RENAME COLUMN ingredient_id TO item_id;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_order_items' AND constraint_name = 'supplier_order_items_ingredient_id_fkey') THEN
        ALTER TABLE supplier_order_items DROP CONSTRAINT supplier_order_items_ingredient_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_order_items' AND constraint_name = 'supplier_order_items_item_id_fkey') THEN
        ALTER TABLE supplier_order_items DROP CONSTRAINT supplier_order_items_item_id_fkey;
      END IF;
      ALTER TABLE supplier_order_items ADD CONSTRAINT supplier_order_items_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;
    END IF;
  END IF;

  -- stock_levels
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_levels') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_levels' AND column_name = 'ingredient_id') THEN
      ALTER TABLE stock_levels RENAME COLUMN ingredient_id TO item_id;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_levels' AND constraint_name = 'stock_levels_ingredient_id_fkey') THEN
        ALTER TABLE stock_levels DROP CONSTRAINT stock_levels_ingredient_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_levels' AND constraint_name = 'stock_levels_item_id_fkey') THEN
        ALTER TABLE stock_levels DROP CONSTRAINT stock_levels_item_id_fkey;
      END IF;
      ALTER TABLE stock_levels ADD CONSTRAINT stock_levels_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- stock_movements
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'ingredient_id') THEN
      ALTER TABLE stock_movements RENAME COLUMN ingredient_id TO item_id;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_movements' AND constraint_name = 'stock_movements_ingredient_id_fkey') THEN
        ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_ingredient_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_movements' AND constraint_name = 'stock_movements_item_id_fkey') THEN
        ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_item_id_fkey;
      END IF;
      ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;
    END IF;
  END IF;

  -- expiry_dates
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expiry_dates') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'expiry_dates' AND column_name = 'ingredient_id') THEN
      ALTER TABLE expiry_dates RENAME COLUMN ingredient_id TO item_id;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'expiry_dates' AND constraint_name = 'expiry_dates_ingredient_id_fkey') THEN
        ALTER TABLE expiry_dates DROP CONSTRAINT expiry_dates_ingredient_id_fkey;
      END IF;
      IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'expiry_dates' AND constraint_name = 'expiry_dates_item_id_fkey') THEN
        ALTER TABLE expiry_dates DROP CONSTRAINT expiry_dates_item_id_fkey;
      END IF;
      ALTER TABLE expiry_dates ADD CONSTRAINT expiry_dates_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 7: Update indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ingredients_name') THEN
    DROP INDEX idx_ingredients_name;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ingredients_category') THEN
    DROP INDEX idx_ingredients_category;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ingredients_is_active') THEN
    DROP INDEX idx_ingredients_is_active;
  END IF;
END $$;
-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_name') THEN
    CREATE INDEX idx_items_name ON items(name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_category') THEN
    CREATE INDEX idx_items_category ON items(category);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_is_active') THEN
    CREATE INDEX idx_items_is_active ON items(is_active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_item_type') THEN
    CREATE INDEX idx_items_item_type ON items(item_type);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_ingredients_recipe_id') THEN
    DROP INDEX idx_recipe_ingredients_recipe_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_ingredients_ingredient_id') THEN
    DROP INDEX idx_recipe_ingredients_ingredient_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_items_recipe_id') THEN
    CREATE INDEX idx_recipe_items_recipe_id ON recipe_items(recipe_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_items_item_id') THEN
    CREATE INDEX idx_recipe_items_item_id ON recipe_items(item_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplier_catalogs_ingredient_id') THEN
    DROP INDEX idx_supplier_catalogs_ingredient_id;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_catalogs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplier_catalogs_item_id') THEN
      CREATE INDEX idx_supplier_catalogs_item_id ON supplier_catalogs(item_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplier_order_items_ingredient_id') THEN
    DROP INDEX idx_supplier_order_items_ingredient_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplier_order_items_item_id') THEN
    CREATE INDEX idx_supplier_order_items_item_id ON supplier_order_items(item_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_levels_ingredient_id') THEN
    DROP INDEX idx_stock_levels_ingredient_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_levels_item_id') THEN
    CREATE INDEX idx_stock_levels_item_id ON stock_levels(item_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_movements_ingredient_id') THEN
    DROP INDEX idx_stock_movements_ingredient_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_movements_item_id') THEN
    CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expiry_dates_ingredient_id') THEN
    DROP INDEX idx_expiry_dates_ingredient_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expiry_dates_item_id') THEN
    CREATE INDEX idx_expiry_dates_item_id ON expiry_dates(item_id);
  END IF;
END $$;

-- Step 8: Update triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ingredients_updated_at') THEN
    DROP TRIGGER update_ingredients_updated_at ON items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_items_updated_at') THEN
    CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipe_ingredients_updated_at') THEN
    DROP TRIGGER update_recipe_ingredients_updated_at ON recipe_items;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipe_items_updated_at') THEN
      CREATE TRIGGER update_recipe_items_updated_at BEFORE UPDATE ON recipe_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

-- Step 9: Update function to use item_id instead of ingredient_id
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  current_qty DECIMAL(15,4);
  new_qty DECIMAL(15,4);
BEGIN
  -- Get current stock level for this item and location
  SELECT quantity INTO current_qty
  FROM stock_levels
  WHERE item_id = NEW.item_id
    AND (location = NEW.location OR (location IS NULL AND NEW.location IS NULL))
  LIMIT 1;

  -- If no stock level exists, create one
  IF current_qty IS NULL THEN
    INSERT INTO stock_levels (item_id, quantity, unit, location, last_updated)
    VALUES (NEW.item_id, 0, NEW.unit, NEW.location, NOW());
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
  WHERE item_id = NEW.item_id
    AND (location = NEW.location OR (location IS NULL AND NEW.location IS NULL));

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 10: Update unique constraint in recipe_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') THEN
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'recipe_items' AND constraint_name = 'recipe_ingredients_recipe_id_ingredient_id_key') THEN
      ALTER TABLE recipe_items DROP CONSTRAINT recipe_ingredients_recipe_id_ingredient_id_key;
    END IF;
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'recipe_items' AND constraint_name = 'recipe_items_recipe_id_item_id_key') THEN
      ALTER TABLE recipe_items DROP CONSTRAINT recipe_items_recipe_id_item_id_key;
    END IF;
    ALTER TABLE recipe_items ADD CONSTRAINT recipe_items_recipe_id_item_id_key UNIQUE(recipe_id, item_id);
  END IF;
END $$;

-- Step 11: Update unique constraint in stock_levels
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_levels') THEN
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_levels' AND constraint_name = 'stock_levels_ingredient_id_location_key') THEN
      ALTER TABLE stock_levels DROP CONSTRAINT stock_levels_ingredient_id_location_key;
    END IF;
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'stock_levels' AND constraint_name = 'stock_levels_item_id_location_key') THEN
      ALTER TABLE stock_levels DROP CONSTRAINT stock_levels_item_id_location_key;
    END IF;
    ALTER TABLE stock_levels ADD CONSTRAINT stock_levels_item_id_location_key UNIQUE(item_id, location);
  END IF;
END $$;

-- Step 12: Update unique constraint in supplier_catalogs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_catalogs') THEN
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_catalogs' AND constraint_name = 'supplier_catalogs_supplier_id_ingredient_id_effective_date_key') THEN
      ALTER TABLE supplier_catalogs DROP CONSTRAINT supplier_catalogs_supplier_id_ingredient_id_effective_date_key;
    END IF;
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supplier_catalogs' AND constraint_name = 'supplier_catalogs_supplier_id_item_id_effective_date_key') THEN
      ALTER TABLE supplier_catalogs DROP CONSTRAINT supplier_catalogs_supplier_id_item_id_effective_date_key;
    END IF;
    ALTER TABLE supplier_catalogs ADD CONSTRAINT supplier_catalogs_supplier_id_item_id_effective_date_key UNIQUE(supplier_id, item_id, effective_date);
  END IF;
END $$;

