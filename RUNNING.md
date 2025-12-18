# How to Run Each Part of Dose

Quick reference guide for running web, mobile, and backend applications.

## 📋 Prerequisites

Before running any part, ensure you have:
- **Node.js 18+** (for web and mobile)
- **npm 8+** or **pnpm**
- **.NET SDK 8.0+** (for backend)
- **Docker Desktop** (for backend with Docker)

---

## 🌐 Web Application (Next.js)

### First Time Setup
```bash
# From root directory (using pnpm - recommended)
pnpm install

# OR using npm
npm install

# Or navigate to web app
cd apps/web
pnpm install  # or npm install
```

### Development Mode
```bash
# From root directory
pnpm dev:web
# OR: npm run dev:web

# OR from apps/web directory
cd apps/web
pnpm dev  # or npm run dev
```

**Access:** http://localhost:3000

### Production Build
```bash
# From root
npm run build:web
npm run start:web  # Note: add this script if needed

# OR from apps/web
cd apps/web
npm run build
npm start
```

---

## 📱 Mobile Application (Expo)

### First Time Setup
```bash
# Dependencies are installed with root pnpm install (or npm install)
# Or navigate to mobile app
cd apps/mobile
pnpm install  # or npm install
```

### Development Mode
```bash
# From root directory
pnpm dev:mobile
# OR: npm run dev:mobile

# OR from apps/mobile directory
cd apps/mobile
pnpm start  # or npm start
```

This opens Expo DevTools. You can then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone
- Press `w` for web browser

### Platform-Specific Commands
```bash
cd apps/mobile

# iOS only
npm run ios

# Android only
npm run android

# Web only
npm run web
```

---

## 🔧 Backend (.NET API)

### Option 1: Docker (Recommended)

#### First Time Setup
```bash
cd apps/backend
docker-compose up --build
```

This will:
- Build the .NET API
- Start SQL Server container
- Run the API on port 5001

#### Running After Initial Setup
```bash
cd apps/backend
docker-compose up
```

#### Stop Services
```bash
docker-compose down
```

**Access:**
- **API:** http://localhost:5001
- **Swagger UI:** http://localhost:5001/swagger/index.html
- **SQL Server:** localhost:1433

### Option 2: .NET CLI (Local Development)

#### First Time Setup
```bash
cd apps/backend
dotnet restore
dotnet build
```

#### Running with .NET CLI
```bash
cd apps/backend
dotnet run --project Dose.API
```

**Access:**
- **API:** http://localhost:5000 (default)
- **Swagger UI:** http://localhost:5000/swagger/index.html

**Note:** You'll need SQL Server running separately if not using Docker.

---

## 🚀 Running Everything Together

### Terminal 1: Backend
```bash
cd apps/backend
docker-compose up
```

### Terminal 2: Web
```bash
npm run dev:web
```

### Terminal 3: Mobile (optional)
```bash
npm run dev:mobile
```

---

## 📝 Common Commands

### Install All Dependencies
```bash
# From root - installs web and mobile dependencies
pnpm install
# OR: npm install
```

### Clean Build Artifacts
```bash
# Web
cd apps/web
npm run clean

# Backend
cd apps/backend
dotnet clean
```

### Check Status
```bash
# Verify all workspaces are set up
npm list --workspaces --depth=0
```

---

## 🐛 Troubleshooting

### Web App Not Starting
- Check if port 3000 is already in use
- Run `npm install` from `apps/web`
- Clear `.next` folder: `cd apps/web && npm run clean`

### Mobile App Issues
- Clear Expo cache: `npx expo start -c`
- **pnpm + Expo issues:** If you get module not found errors with expo packages:
  ```bash
  # CRITICAL: Must use node-linker=hoisted in .npmrc
  # Then reinstall with proper hoisting
  rm -rf node_modules apps/*/node_modules pnpm-lock.yaml
  pnpm install
  ```
  Note: `.npmrc` is configured with `node-linker=hoisted` for Expo compatibility
- Reinstall dependencies: `cd apps/mobile && rm -rf node_modules && pnpm install`

### Backend Issues
- Ensure Docker is running
- Check if ports 5001 or 1433 are in use
- Reset Docker containers: `docker-compose down -v && docker-compose up --build`

### Port Conflicts
- **Web:** 3000
- **Backend (Docker):** 5001 (API), 1433 (SQL)
- **Backend (.NET CLI):** 5000 (default)
- Change ports in respective config files if needed

