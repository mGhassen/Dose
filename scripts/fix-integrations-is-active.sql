-- Fix integrations that have is_active = false but status = 'connected'
-- This script updates all connected integrations to have is_active = true

UPDATE integrations
SET is_active = true
WHERE status = 'connected' AND is_active = false;

-- Verify the fix
SELECT 
  id,
  integration_type,
  name,
  status,
  is_active,
  created_at
FROM integrations
WHERE status = 'connected'
ORDER BY created_at DESC;

