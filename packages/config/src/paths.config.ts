import { z } from 'zod';

// Define the type first
export interface MenuItem {
  title: string;
  url: string;
  icon?: string;
  translationKey?: string;
  isActive?: boolean;
  items?: MenuItem[];
}

// Define the recursive schema
export const MenuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    title: z.string(),
    url: z.string(),
    icon: z.string().optional(),
    translationKey: z.string().optional(),
    isActive: z.boolean().optional(),
    items: z.array(MenuItemSchema).optional(),
  })
);

export const NavigationConfigSchema = z.object({
  navMain: z.array(MenuItemSchema),
  navSecondary: z.array(MenuItemSchema),
});

export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;

export const pathsConfig: NavigationConfig = {
  navMain: [
    {
      title: "dashboard",
      url: "/dashboard",
      icon: "Home",
      isActive: true,
      translationKey: "dashboard"
    },
    {
      title: "inputs",
      url: "#",
      icon: "Database",
      translationKey: "inputs",
      items: [
        {
          title: "sales",
          url: "/sales",
          translationKey: "sales"
        },
      ]
    },
    {
      title: "outputs",
      url: "#",
      icon: "Database",
      translationKey: "outputs",
      items: [
        {
          title: "expenses",
          url: "/expenses",
          translationKey: "expenses"
        },
        {
          title: "subscriptions",
          url: "/subscriptions",
          translationKey: "subscriptions"
        },
        {
          title: "personnel",
          url: "/personnel",
          translationKey: "personnel"
        },
        {
          title: "loans",
          url: "/loans",
          translationKey: "loans"
        },
        {
          title: "leasing",
          url: "/leasing",
          translationKey: "leasing"
        },
        {
          title: "investments",
          url: "/investments",
          translationKey: "investments"
        },
      ]
    },
    {
      title: "payments",
      url: "#",
      icon: "CreditCard",
      translationKey: "payments",
      items: [
        {
          title: "input-payments",
          url: "/payments/input",
          translationKey: "inputPayments"
        },
        {
          title: "output-payments",
          url: "/payments/output",
          translationKey: "outputPayments"
        },
      ]
    },
    {
      title: "financial-results",
      url: "#",
      icon: "TrendingUp",
      translationKey: "financialResults",
      items: [
        {
          title: "profit-loss",
          url: "/profit-loss",
          translationKey: "profitLoss"
        },
        {
          title: "cash-flow",
          url: "/cash-flow",
          translationKey: "cashFlow"
        },
        {
          title: "balance-sheet",
          url: "/balance-sheet",
          translationKey: "balanceSheet"
        },
        {
          title: "working-capital",
          url: "/working-capital",
          translationKey: "workingCapital"
        },
        {
          title: "financial-plan",
          url: "/financial-plan",
          translationKey: "financialPlan"
        },
      ]
    },
    {
      title: "analytics",
      url: "#",
      icon: "BarChart3",
      translationKey: "analytics",
      items: [
        {
          title: "expenses-analytics",
          url: "/analytics/expenses",
          translationKey: "expensesAnalytics"
        },
        {
          title: "sales-analytics",
          url: "/analytics/sales",
          translationKey: "salesAnalytics"
        },
        {
          title: "personnel-analytics",
          url: "/analytics/personnel",
          translationKey: "personnelAnalytics"
        },
        {
          title: "loans-analytics",
          url: "/analytics/loans",
          translationKey: "loansAnalytics"
        },
        {
          title: "leasing-analytics",
          url: "/analytics/leasing",
          translationKey: "leasingAnalytics"
        },
        {
          title: "investments-analytics",
          url: "/analytics/investments",
          translationKey: "investmentsAnalytics"
        },
      ]
    },
    {
      title: "budgeting",
      url: "#",
      icon: "FileSpreadsheet",
      translationKey: "budgeting",
      items: [
        {
          title: "budget-projections",
          url: "/budget-projections",
          translationKey: "budgetProjections"
        },
        {
          title: "budgets",
          url: "/budgets",
          translationKey: "budgets"
        },
      ]
    },
    {
      title: "inventory",
      url: "#",
      icon: "Package",
      translationKey: "inventory",
      items: [
        {
          title: "ingredients",
          url: "/ingredients",
          translationKey: "ingredients"
        },
        {
          title: "recipes",
          url: "/recipes",
          translationKey: "recipes"
        },
        {
          title: "suppliers",
          url: "/inventory-suppliers",
          translationKey: "suppliers"
        },
        {
          title: "supplier-catalogs",
          url: "/supplier-catalogs",
          translationKey: "supplierCatalogs"
        },
        {
          title: "supplier-orders",
          url: "/supplier-orders",
          translationKey: "supplierOrders"
        },
        {
          title: "stock-levels",
          url: "/stock-levels",
          translationKey: "stockLevels"
        },
        {
          title: "stock-movements",
          url: "/stock-movements",
          translationKey: "stockMovements"
        },
        {
          title: "expiry-dates",
          url: "/expiry-dates",
          translationKey: "expiryDates"
        },
      ]
    },
    {
      title: "settings",
      url: "#",
      icon: "Settings",
      translationKey: "settings",
      items: [
        {
          title: "users",
          url: "/users",
          translationKey: "users"
        },
        {
          title: "variables",
          url: "/variables",
          translationKey: "variables"
        },
        {
          title: "vendors",
          url: "/vendors",
          translationKey: "vendors"
        },
        {
          title: "items",
          url: "/items",
          translationKey: "items"
        },
        {
          title: "metadata-enums",
          url: "/metadata-enums",
          translationKey: "metadataEnums"
        },
      ]
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: "AlertTriangle"
    },
    {
      title: "Documentation",
      url: "#",
      icon: "Settings"
    }
  ]
};

// Export individual parts for convenience
export const { navMain, navSecondary } = pathsConfig;

// Helper function to get all paths recursively
export const getAllPaths = (items: MenuItem[] = navMain): string[] => {
  const paths: string[] = [];
  
  items.forEach(item => {
    if (item.url !== "#") {
      paths.push(item.url);
    }
    if (item.items) {
      paths.push(...getAllPaths(item.items));
    }
  });
  
  return paths;
};

// Helper function to find menu item by path
export const findMenuItemByPath = (path: string, items: MenuItem[] = navMain): MenuItem | null => {
  for (const item of items) {
    if (item.url === path) {
      return item;
    }
    if (item.items) {
      const found = findMenuItemByPath(path, item.items);
      if (found) return found;
    }
  }
  return null;
};

// Validation function
export const validatePathsConfig = (config: unknown): NavigationConfig => {
  return NavigationConfigSchema.parse(config);
};

// Safe parsing function that returns a default config if validation fails
export const safeParsePathsConfig = (config: unknown): NavigationConfig => {
  const result = NavigationConfigSchema.safeParse(config);
  if (result.success) {
    return result.data;
  }
  console.warn('Invalid paths config, using default:', result.error);
  return pathsConfig;
};
