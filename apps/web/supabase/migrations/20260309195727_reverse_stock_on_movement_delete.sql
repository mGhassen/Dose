-- Reverse stock_levels when a stock_movement is deleted (so deleting a sale's movements restores stock)
CREATE OR REPLACE FUNCTION reverse_stock_on_movement_delete()
RETURNS TRIGGER AS $$
DECLARE
  current_qty DECIMAL(15,4);
  new_qty DECIMAL(15,4);
BEGIN
  SELECT quantity INTO current_qty
  FROM stock_levels
  WHERE item_id = OLD.item_id
    AND (location = OLD.location OR (location IS NULL AND OLD.location IS NULL))
  LIMIT 1;

  IF current_qty IS NULL THEN
    IF OLD.movement_type IN ('out', 'waste', 'expired', 'transfer') THEN
      INSERT INTO stock_levels (item_id, quantity, unit, location, last_updated)
      VALUES (OLD.item_id, OLD.quantity, OLD.unit, OLD.location, NOW());
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.movement_type IN ('in', 'adjustment') THEN
    new_qty := current_qty - OLD.quantity;
    IF new_qty < 0 THEN new_qty := 0; END IF;
  ELSIF OLD.movement_type IN ('out', 'waste', 'expired', 'transfer') THEN
    new_qty := current_qty + OLD.quantity;
  ELSE
    RETURN OLD;
  END IF;

  UPDATE stock_levels
  SET quantity = new_qty,
      unit = OLD.unit,
      last_updated = NOW()
  WHERE item_id = OLD.item_id
    AND (location = OLD.location OR (location IS NULL AND OLD.location IS NULL));

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reverse_stock_on_movement_delete_trigger
  AFTER DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION reverse_stock_on_movement_delete();
