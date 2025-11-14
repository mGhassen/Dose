# Fix: MSW Still Handling Events Despite Config

## The Problem
You set `NEXT_PUBLIC_MIGRATION_USE_API_EVENTS=true` but events still use MSW.

## Root Causes
1. **Next.js bundles env vars at start** - Must restart server
2. **MSW Service Worker caches handlers** - Must clear browser cache

## Solution (Do ALL steps):

### Step 1: Stop and Clear Next.js Cache
```bash
# Stop your dev server (Ctrl+C)
rm -rf .next
npm run dev
```

### Step 2: Clear Browser MSW Service Worker
1. Open DevTools (F12)
2. Go to **Application** tab
3. Under **Service Workers**, click **Unregister** for any MSW workers
4. Under **Storage**, click **Clear site data**

### Step 3: Hard Reload
- Right-click refresh button → **"Empty Cache and Hard Reload"**
- OR: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Step 4: Verify in Console
After reload, check browser console for:
```
[MSW Config Check] events:
  - Env key: NEXT_PUBLIC_MIGRATION_USE_API_EVENTS
  - Env value: true
  - Parsed useAPI: true
  - Should use MSW: false

[MSW Handler Registration] events shouldUseMSW=false

MSW Browser Setup:
- Events handlers included: false  ← Should be FALSE
```

### Step 5: Verify Network Tab
1. Open Network tab
2. Load events page
3. Find `/api/events` request
4. Should NOT have "Mocked" badge
5. Response should come from real backend, not mock data

## If Still Not Working

### Check .env.local format:
```bash
# Must be EXACTLY this (no spaces, no quotes):
MIGRATION_USE_API_EVENTS=true
NEXT_PUBLIC_MIGRATION_USE_API_EVENTS=true
```

### Verify env vars are loaded:
Add this temporarily to see if Next.js sees them:
```typescript
console.log('Env check:', {
  MIGRATION_USE_API_EVENTS: process.env.MIGRATION_USE_API_EVENTS,
  NEXT_PUBLIC_MIGRATION_USE_API_EVENTS: process.env.NEXT_PUBLIC_MIGRATION_USE_API_EVENTS
});
```

### Nuclear Option:
```bash
# Complete reset
rm -rf .next node_modules/.cache
npm run dev
# Then clear ALL browser data for localhost:3000
```

