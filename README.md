# ☀️ SunnyLife (Internal: Dose)

**SunnyLife** is a professional-grade financial management and budgeting system designed specifically for the restaurant industry. It transforms complex financial data from Excel workbooks into a centralized, intelligent ecosystem for real-time decision-making and forecasting.

## 🚀 Key Features

*   **Financial Intelligence**: Automated generation of **Profit & Loss** (CR), **Balance Sheets** (Bilan), and **Financial Plans**.
*   **Operational Tracking**: Manage **Sales** (on-site, delivery, catering), **Expenses**, and **Leasing** payments.
*   **Workforce Management**: Track **Personnel** salaries and automated employer charge calculations.
*   **Asset Management**: Automated **Loan Amortization** schedules and **Investment Depreciation** tracking.
*   **Cash Flow & BFR**: Real-time **Cash Flow** monitoring and **Working Capital (BFR)** analysis.
*   **Advanced Analytics**: High-performance dashboards powered by **Recharts** for trend visualization.

## 🏗️ Architecture & Philosophy

The project is built as a modular **pnpm monorepo** designed for scalability and code reuse.

### The Stack
- **Framework**: Next.js 15 (App Router) + React 19.
- **Database**: Supabase (PostgreSQL) for persistence.
- **UI**: shadcn/ui + Tailwind CSS.
- **State Management**: React Query (TanStack Query) + React Hook Form + Zod.
- **Mocking**: MSW (Mock Service Worker) for network-level interception.

### Core Philosophy
- **Logic in Code, Not DB**: All financial computations and business logic reside in **TypeScript API Routes**. The database is used strictly for data storage.
- **Network Interception**: No mock data is ever hardcoded in API routes; development data is handled via MSW.
- **Strict Standards**: Mandatory use of the `DataTablePage` pattern for all list views (advanced filtering, bulk actions, localStorage persistence).

## 📂 Project Structure

```
dose/
├── apps/
│   └── web/             # Next.js 15 Web Application
├── packages/
│   ├── types/           # Domain-driven TypeScript interfaces
│   ├── hooks/           # Shared React Query & logic hooks
│   ├── lib/             # Supabase client & core API definitions
│   ├── ui/              # Shared UI component library (shadcn/ui)
│   ├── config/          # Shared configuration (i18n, paths, auth)
│   ├── mocks/           # MSW Handlers and mock data
│   └── shared/          # Universal utilities
└── package.json         # Root workspace configuration
```

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: 18.0.0+
- **pnpm**: 9.0.0+
- **Docker Desktop**: Required for local Supabase services.

### 2. Setup
```bash
# Install dependencies
pnpm install

# Start local Supabase stack
pnpm supabase:web start

# Run the development server
pnpm dev
```

## 📜 Development Rules
Refer to `cursor.md` for the complete guide on:
- Entity creation workflow.
- `DataTablePage` implementation rules.
- API Route patterns.
- Financial data models and calculation logic.

---
*Developed by The Sunny Side.*
