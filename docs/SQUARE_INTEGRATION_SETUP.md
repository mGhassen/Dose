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

For testing without a real Square account:

1. In Square Developer Dashboard, go to **"Sandbox"**
2. Create a test location
3. Use the sandbox credentials (they'll have a different Application ID/Secret)
4. The OAuth flow will work the same way, but with test data

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

