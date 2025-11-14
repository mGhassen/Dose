import { z } from 'zod';

// Define the type first
export interface MenuItem {
  title: string;
  url: string;
  icon: string;
  translationKey?: string;
  isActive?: boolean;
  items?: MenuItem[];
}

// Define the recursive schema
export const MenuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    title: z.string(),
    url: z.string(),
    icon: z.string(),
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
      title: "expenses",
      url: "/expenses",
      icon: "Receipt",
      translationKey: "expenses"
    },
    {
      title: "sales",
      url: "/sales",
      icon: "TrendingUp",
      translationKey: "sales"
    },
    {
      title: "personnel",
      url: "/personnel",
      icon: "Briefcase",
      translationKey: "personnel"
    },
    {
      title: "loans",
      url: "/loans",
      icon: "CreditCard",
      translationKey: "loans"
    },
    {
      title: "leasing",
      url: "/leasing",
      icon: "Building2",
      translationKey: "leasing"
    },
    {
      title: "investments",
      url: "/investments",
      icon: "PiggyBank",
      translationKey: "investments"
    },
    {
      title: "variables",
      url: "/variables",
      icon: "Hash",
      translationKey: "variables"
    },
    {
      title: "cash-flow",
      url: "/cash-flow",
      icon: "Wallet",
      translationKey: "cashFlow"
    },
    {
      title: "profit-loss",
      url: "/profit-loss",
      icon: "BarChart3",
      translationKey: "profitLoss"
    },
    {
      title: "balance-sheet",
      url: "/balance-sheet",
      icon: "FileText",
      translationKey: "balanceSheet"
    },
    {
      title: "working-capital",
      url: "/working-capital",
      icon: "Calculator",
      translationKey: "workingCapital"
    },
    {
      title: "financial-plan",
      url: "/financial-plan",
      icon: "Target",
      translationKey: "financialPlan"
    },
    {
      title: "users",
      url: "/users",
      icon: "Users",
      translationKey: "users"
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
