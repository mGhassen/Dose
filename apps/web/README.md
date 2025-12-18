# Dose Web Application

Next.js 15 web application for Dose.

## Environment Setup

1. Copy the environment template:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` with your values

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm start
```

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations
- `src/mocks/` - Mock Service Worker setup
- `messages/` - Internationalization files
- `public/` - Static assets

