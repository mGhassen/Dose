# Migration Configuration Guide

## Overview

During migration from MSW (mocks) to real API, you can control per-functionality which system is used.

## Configuration Location

Create or edit `.env.local` file in the project root.

## How to Configure

For each functionality you want to migrate to the real API, set **both** environment variables:

```bash
# Server-side configuration
MIGRATION_USE_API_<FUNCTIONALITY>=true

# Client-side configuration (MSW handlers)
NEXT_PUBLIC_MIGRATION_USE_API_<FUNCTIONALITY>=true
```

## Example: Events uses API, Users uses MSW

```bash
# Events → Real API
MIGRATION_USE_API_EVENTS=true
NEXT_PUBLIC_MIGRATION_USE_API_EVENTS=true

# Users → MSW (default, no config needed)
# Simply don't set these variables, or explicitly set to false:
# MIGRATION_USE_API_USERS=false
# NEXT_PUBLIC_MIGRATION_USE_API_USERS=false
```

## Available Functionalities

All functionalities use MSW by default. To switch to API, set both env vars to `true`:

- `events`
- `users`
- `actiontypes`
- `actionreftypes`
- `actionreferences`
- `actions`
- `acts`
- `anomalies`
- `checklists`
- `locomotives`
- `locomotivemodels`
- `locations`
- `locations`
- `locationlevels`
- `objects`
- `operationtypes`
- `operations`
- `procedures`
- `questions`
- `responses`
- `issues`
- `assetitems`
- `assetmodels`
- `enums`
- `profiles`
- `settings`
- `auth`

## How It Works

1. **MSW Handlers (Client-side)**: 
   - Check `NEXT_PUBLIC_MIGRATION_USE_API_<FUNCTIONALITY>`
   - If `true` → Handler is NOT registered → Request goes to API route
   - If `false` or unset → Handler IS registered → Request intercepted by MSW

2. **API Routes (Server-side)**:
   - Check `MIGRATION_USE_API_<FUNCTIONALITY>`
   - If `true` → Proxy request to backend
   - If `false` → Return error (should be handled by MSW)

## Migration Strategy

1. Start with one functionality (e.g., `events`)
2. Set both environment variables to `true`
3. Test thoroughly
4. Move to next functionality
5. Repeat until all migrated

## Troubleshooting

**Problem**: MSW still handling requests even after setting env vars
- **Solution**: Ensure you set the `NEXT_PUBLIC_` prefix version
- Restart dev server after changing env vars

**Problem**: API route returns 503 error
- **Solution**: Ensure both env vars are set (server + client)
- Check that backend API is running and accessible

**Problem**: Some functionalities work, others don't
- **Solution**: Check each functionality has both env vars set if using API


