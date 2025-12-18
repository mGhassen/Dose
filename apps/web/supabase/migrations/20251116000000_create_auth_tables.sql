-- Auth Tables for Dose
-- Creates accounts and profiles tables for user authentication

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE profiles (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  profile_email VARCHAR(255),
  address TEXT,
  profession VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_profile_email ON profiles(profile_email);

-- ============================================================================
-- ACCOUNTS
-- ============================================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY, -- Uses Supabase auth user ID
  auth_user_id UUID NOT NULL UNIQUE, -- Reference to auth.users
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'suspended', 'archived'
  is_admin BOOLEAN DEFAULT false,
  profile_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_auth_user_id ON accounts(auth_user_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_profile_id ON accounts(profile_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT profile_id FROM accounts 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    id IN (
      SELECT profile_id FROM accounts 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Accounts: Users can read their own account
CREATE POLICY "Users can read own account"
  ON accounts FOR SELECT
  USING (auth_user_id = auth.uid());

-- Accounts: Users can update their own account (limited fields)
CREATE POLICY "Users can update own account"
  ON accounts FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Admins can read all accounts
CREATE POLICY "Admins can read all accounts"
  ON accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE auth_user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE auth_user_id = auth.uid() 
      AND is_admin = true
    )
  );

