-- Create Integrations Table
-- Stores third-party integrations (Square, etc.) with OAuth credentials and sync status

CREATE TABLE IF NOT EXISTS integrations (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- 'square', 'stripe', etc.
  name VARCHAR(255) NOT NULL, -- User-friendly name for the integration
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'disconnected', 'error'
  
  -- OAuth credentials (encrypted at application level)
  access_token TEXT, -- Encrypted OAuth access token
  refresh_token TEXT, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMP, -- When the access token expires
  
  -- Integration-specific configuration (JSON)
  config JSONB DEFAULT '{}', -- Store location_id, merchant_id, etc.
  
  -- Sync information
  last_sync_at TIMESTAMP, -- Last successful sync
  last_sync_status VARCHAR(20), -- 'success', 'error', 'in_progress'
  last_sync_error TEXT, -- Error message if last sync failed
  sync_frequency VARCHAR(20) DEFAULT 'manual', -- 'manual', 'hourly', 'daily', 'realtime'
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one integration per type per account
  UNIQUE(account_id, integration_type)
);

CREATE INDEX idx_integrations_account_id ON integrations(account_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_is_active ON integrations(is_active);
CREATE INDEX idx_integrations_account_type ON integrations(account_id, integration_type);

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Users can read their own integrations
CREATE POLICY "Users can read own integrations"
  ON integrations FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Users can create their own integrations
CREATE POLICY "Users can create own integrations"
  ON integrations FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can read all integrations
CREATE POLICY "Admins can read all integrations"
  ON integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE auth_user_id = auth.uid() 
      AND is_admin = true
    )
  );

