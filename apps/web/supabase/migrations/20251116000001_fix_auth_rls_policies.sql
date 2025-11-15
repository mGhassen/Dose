-- Fix RLS policies for auth tables
-- Allow inserts and fix recursion issues

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read all accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Allow service role to bypass (this is automatic, but we need policies that work)
-- For inserts, we need to allow them during user creation
-- The service role key should bypass RLS, but if using anon key, we need insert policies

-- Allow inserts for accounts (during registration/user creation)
CREATE POLICY "Allow account inserts"
  ON accounts FOR INSERT
  WITH CHECK (true); -- Allow all inserts (service role or proper auth will handle security)

-- Allow inserts for profiles (during registration/user creation)  
CREATE POLICY "Allow profile inserts"
  ON profiles FOR INSERT
  WITH CHECK (true); -- Allow all inserts

-- Admins can read all accounts (using a function to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM accounts 
    WHERE auth_user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can read all accounts"
  ON accounts FOR SELECT
  USING (is_admin_user());

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin_user());

