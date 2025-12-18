# Square Sandbox Quick Start Guide

This is a simplified guide for using Square Sandbox to test your integration without a real Square account.

## Why Use Sandbox?

- **No real Square account needed** - Test without signing up for Square
- **Free testing** - No charges or real transactions
- **Safe environment** - Test without affecting real business data

## Step-by-Step Setup

### 1. Create a Sandbox Test Account

1. Go to [Square Developer Console](https://developer.squareup.com/console)
2. Sign in (or create a free Square Developer account)
3. Click **"Sandbox Test Accounts"** in the left sidebar
4. Click **"+ New sandbox test account"**
5. Enter a name (e.g., "My Test Store")
6. Select your country
7. Click **"Create"**

### 2. Get Your Sandbox Application Credentials

1. In Square Developer Console, make sure you're in **"Sandbox"** mode (toggle in top right)
2. Go to your application (or create one if you haven't)
3. Go to **"Credentials"** tab
4. Copy:
   - **Sandbox Application ID**
   - **Sandbox Application Secret**

### 3. Configure OAuth for Sandbox

1. In your application, go to **"OAuth"** tab
2. Scroll to **"Sandbox Test Accounts"** section
3. Click **"Authorize test account"**
4. Select your test account
5. Check all permissions:
   - ✅ MERCHANT_PROFILE_READ
   - ✅ PAYMENTS_READ
   - ✅ ORDERS_READ
   - ✅ ITEMS_READ
6. Click **"Save"**

**Important:** This generates a pre-authorized access token. You'll see it displayed - you can copy it for direct testing if needed.

### 4. Add Redirect URI

1. Still in **"OAuth"** tab, scroll to **"Redirect URL"** section
2. Add: `http://localhost:3000/api/integrations/oauth/square/callback`
3. Click **"Save"**

### 5. Configure Your App

Add to your `.env.local` file:

```env
# Square Sandbox Credentials
SQUARE_APPLICATION_ID=your_sandbox_application_id_here
SQUARE_APPLICATION_SECRET=your_sandbox_application_secret_here
SQUARE_REDIRECT_URI=http://localhost:3000/api/integrations/oauth/square/callback
SQUARE_USE_SANDBOX=true
```

### 6. Connect Square (Important Steps!)

**Before clicking "Connect Square" in your app:**

1. In Square Developer Console, go to **"Sandbox Test Accounts"**
2. Click **"Open"** next to your test account
3. This opens the Sandbox Dashboard in a new tab - **KEEP IT OPEN**
4. Now go back to your SunnyBudget app
5. Navigate to **Settings → Integrations**
6. Click **"Connect Square"**
7. You'll be redirected to Square's authorization page
8. **The sandbox dashboard you opened earlier acts as your "logged in" session**
9. Click **"Allow"** to authorize
10. You'll be redirected back to SunnyBudget
11. The integration should now be connected!

## Why Do I Need to Open the Sandbox Dashboard?

Square Sandbox doesn't let you log in directly on the OAuth page like production does. Instead:
- The sandbox dashboard acts as your "logged in" session
- When you click "Connect Square", Square checks if you have an active sandbox session
- If the dashboard is open, it recognizes you're "logged in" and allows the OAuth flow

## Testing Your Integration

Once connected:

1. **Create Test Data in Sandbox:**
   - In the Sandbox Dashboard, you can create test locations, items, and process test transactions
   - Go to **"Items"** to add test products
   - Go to **"Transactions"** to create test sales

2. **Sync Data:**
   - In SunnyBudget, go to **Settings → Integrations**
   - Click **"Sync All Data"** or sync specific types
   - View synced data in the **"Square Data"** tab

3. **View Test Transactions:**
   - All data synced will be test data from your sandbox account
   - No real money or real transactions are involved

## Troubleshooting

### "Redirected to login page"
- **Solution:** Make sure you've opened the Sandbox Dashboard before clicking "Connect Square"
- The dashboard must be open in a browser tab when you initiate OAuth

### "Invalid redirect URI"
- Make sure the redirect URI in `.env.local` matches exactly what's in Square Dashboard
- Check for `http://` vs `https://` and trailing slashes

### "Application credentials not configured"
- Verify `SQUARE_APPLICATION_ID` and `SQUARE_APPLICATION_SECRET` are set
- Make sure you're using **Sandbox** credentials, not production ones
- Restart your dev server after adding environment variables

### "Authorization failed"
- Make sure you've authorized the test account in the OAuth section
- Verify all required permissions are checked
- Try disconnecting and reconnecting

## Switching to Production

When ready to use a real Square account:

1. Get your **Production** Application ID and Secret (not sandbox)
2. Update `.env.local`:
   ```env
   SQUARE_APPLICATION_ID=your_production_app_id
   SQUARE_APPLICATION_SECRET=your_production_app_secret
   SQUARE_USE_SANDBOX=false
   ```
3. Update the redirect URI in Square Dashboard to your production domain
4. Restart your server
5. Connect using your real Square account

## Need Help?

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square Sandbox Guide](https://developer.squareup.com/docs/devtools/sandbox/overview)
- [Square Developer Forums](https://developer.squareup.com/forums)



