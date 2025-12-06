# Square POS Integration Setup Guide

This guide will walk you through connecting your Square POS account to SunnyBudget.

## Prerequisites

- A Square Developer account
- A Square business account (or sandbox account for testing)
- Access to your Square Developer Dashboard

## Step 1: Create a Square Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Sign in with your Square account
3. Click **"Create Application"**
4. Fill in the application details:
   - **Application Name**: SunnyBudget Integration (or your preferred name)
   - **Description**: Integration for syncing POS data with SunnyBudget
   - **Category**: Select an appropriate category
5. Click **"Create Application"**

## Step 2: Configure OAuth Settings

1. In your Square application dashboard, go to **"OAuth"** in the left sidebar
2. Under **"Redirect URL"**, add your redirect URI:
   - **For Development**: `http://localhost:3000/api/integrations/oauth/square/callback`
   - **For Production**: `https://yourdomain.com/api/integrations/oauth/square/callback`
3. Click **"Save"**

## Step 3: Get Your Application Credentials

1. In your Square application dashboard, go to **"Credentials"**
2. You'll see:
   - **Application ID** (Application ID)
   - **Application Secret** (Application Secret)
3. Copy both values - you'll need them in the next step

## Step 4: Configure Environment Variables

1. Open your `.env.local` file (or create it if it doesn't exist) in `apps/web/`
2. Add the following variables:

```env
# Square Integration
SQUARE_APPLICATION_ID=your_application_id_here
SQUARE_APPLICATION_SECRET=your_application_secret_here
SQUARE_REDIRECT_URI=http://localhost:3000/api/integrations/oauth/square/callback
```

**Important Notes:**
- Replace `your_application_id_here` with your actual Application ID
- Replace `your_application_secret_here` with your actual Application Secret
- For production, update `SQUARE_REDIRECT_URI` to your production domain
- Never commit `.env.local` to version control (it's already in `.gitignore`)

## Step 5: Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
# or
pnpm dev
```

## Step 6: Connect Square in the Application

1. Navigate to **Settings** → **Integrations** in your SunnyBudget application
2. You'll see the **Square POS** integration card
3. Click **"Connect Square"** button
4. You'll be redirected to Square's authorization page
5. Sign in with your Square account
6. Review the permissions requested:
   - **MERCHANT_PROFILE_READ**: Read merchant profile information
   - **PAYMENTS_READ**: Read payment transactions
   - **ORDERS_READ**: Read order information
   - **ITEMS_READ**: Read catalog items
7. Click **"Allow"** to authorize the connection
8. You'll be redirected back to SunnyBudget
9. The integration status should now show **"Connected"**

## Step 7: Sync Data

Once connected, you can sync data from Square:

1. In the **Square POS** integration card, you'll see sync buttons:
   - **Sync All Data**: Syncs everything (orders, payments, catalog, locations)
   - **Sync Orders**: Syncs only orders
   - **Sync Payments**: Syncs only payments
   - **Sync Catalog**: Syncs only catalog items
2. Click any sync button to start syncing
3. The sync status will update in real-time
4. View synced data in the **"Square Data"** tab

## Using Square Sandbox (Testing)

For testing without a real Square account, you can use Square's Sandbox environment:

### Step 1: Create a Sandbox Test Account

1. Go to [Square Developer Console](https://developer.squareup.com/console)
2. Navigate to **"Sandbox Test Accounts"** in the left sidebar
3. Click **"+ New sandbox test account"**
4. Provide a name (e.g., "SunnyBudget Test") and select your country
5. Click **"Create"**

### Step 2: Authorize Your Test Account

1. In your Square application dashboard, go to **"OAuth"** section
2. Scroll down to **"Sandbox Test Accounts"** section
3. Click **"Authorize test account"**
4. Select the test account you just created
5. Choose the necessary permissions (same as production)
6. Click **"Save"**

This will generate an access token for your test account. **Important:** For sandbox OAuth flow, you'll need to use this pre-authorized token instead of going through the OAuth redirect flow.

### Step 3: Use Sandbox Credentials

1. In Square Developer Dashboard, go to your application
2. Switch to **"Sandbox"** environment (toggle in the top right)
3. Go to **"Credentials"** - you'll see different Application ID and Secret for sandbox
4. Copy the **Sandbox Application ID** and **Sandbox Application Secret**
5. Update your `.env.local`:

```env
SQUARE_APPLICATION_ID=your_sandbox_application_id
SQUARE_APPLICATION_SECRET=your_sandbox_application_secret
SQUARE_REDIRECT_URI=http://localhost:3000/api/integrations/oauth/square/callback
SQUARE_USE_SANDBOX=true
```

### Step 4: Open Sandbox Dashboard Before OAuth

**Important:** Before clicking "Connect Square" in your app:

1. In Square Developer Console, go to **"Sandbox Test Accounts"**
2. Click **"Open"** next to your test account
3. This opens the Sandbox Square Dashboard in a new tab - **keep it open**
4. Now go back to your app and click "Connect Square"
5. The OAuth flow should work with the sandbox account

### Alternative: Direct Sandbox Token (Easier for Testing)

Instead of OAuth flow, you can directly use the sandbox access token:

1. After authorizing your test account in Step 2, copy the **Access Token** shown
2. You can manually create an integration in your database with this token
3. Or modify the OAuth callback to accept a sandbox token directly

### Sandbox vs Production URLs

- **Sandbox OAuth**: `https://connect.squareupsandbox.com/oauth2/authorize`
- **Sandbox API**: `https://connect.squareupsandbox.com/v2/...`
- **Production OAuth**: `https://connect.squareup.com/oauth2/authorize`
- **Production API**: `https://connect.squareup.com/v2/...`

The code will automatically use sandbox URLs if `SQUARE_USE_SANDBOX=true` is set.

## Troubleshooting

### "Square application credentials not configured"
- Make sure you've added `SQUARE_APPLICATION_ID` and `SQUARE_APPLICATION_SECRET` to your `.env.local`
- Restart your development server after adding environment variables

### "Invalid redirect URI"
- Make sure the redirect URI in your `.env.local` matches exactly what's configured in Square Dashboard
- Check for trailing slashes or protocol mismatches (http vs https)

### "Connection Failed"
- Verify your Application ID and Secret are correct
- Check that your Square application is active in the Square Dashboard
- Ensure you're using the correct environment (sandbox vs production)

### "Token exchange failed"
- This usually means the authorization code has expired (they expire quickly)
- Try disconnecting and reconnecting the integration

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials**: Your `.env.local` file should never be committed to version control
2. **Use environment variables**: Always use environment variables, never hardcode credentials
3. **Rotate secrets**: If you suspect your Application Secret is compromised, regenerate it in Square Dashboard
4. **Production setup**: For production, use secure environment variable management (e.g., Vercel Environment Variables, AWS Secrets Manager)

## What Data Gets Synced?

When you sync with Square, the following data is fetched:

- **Locations**: All your Square business locations
- **Orders**: Transaction orders with line items, totals, and customer information
- **Payments**: Payment transactions with amounts, payment methods, and status
- **Catalog**: Items, variations, categories, and pricing information

## Next Steps

After connecting Square:

1. **Initial Sync**: Run a full sync to import all existing data
2. **View Data**: Check the "Square Data" tab to see your synced information
3. **Automate**: Set up automatic syncing (coming soon)
4. **Map Data**: Map Square items to your SunnyBudget items (coming soon)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Check the server logs for detailed error information
3. Verify your Square application is properly configured
4. Ensure all environment variables are set correctly

