import { z } from 'zod';

const production = process.env.NODE_ENV === 'production';

function getBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'string') {
    return value === 'true';
  }
  return defaultValue;
}

const AppConfigSchema = z
  .object({
    name: z
      .string()
      .min(1, `Please provide the variable NEXT_PUBLIC_PRODUCT_NAME`),
    title: z
      .string()
      .min(1, `Please provide the variable NEXT_PUBLIC_SITE_TITLE`),
    description: z.string(`Please provide the variable NEXT_PUBLIC_SITE_DESCRIPTION`),
    url: z
      .string(`Please provide the variable NEXT_PUBLIC_SITE_URL`)
      .url(`You are deploying a production build but have entered a NEXT_PUBLIC_SITE_URL variable using http instead of https. It is very likely that you have set the incorrect URL. The build will now fail to prevent you from from deploying a faulty configuration. Please provide the variable NEXT_PUBLIC_SITE_URL with a valid URL, such as: 'https://example.com'`),
    locale: z
      .string(`Please provide the variable NEXT_PUBLIC_DEFAULT_LOCALE`)
      .default('en'),
    theme: z.enum(['light', 'dark', 'system']),
    production: z.boolean(),
    themeColor: z.string(),
    themeColorDark: z.string(),
    apiUrl: z
      .string(`Please provide the variable NEXT_PUBLIC_API_URL`)
      .url(),
    features: z.object({
      darkMode: z.boolean().default(true),
      multiLanguage: z.boolean().default(true),
      analytics: z.boolean().default(false),
      notifications: z.boolean().default(true),
      export: z.boolean().default(true),
      bulkActions: z.boolean().default(true),
      manageLinks: z.boolean().default(true),
    }),
    limits: z.object({
      maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
      maxUploadFiles: z.number().default(5),
      maxTableRows: z.number().default(1000),
      sessionTimeout: z.number().default(30 * 60 * 1000), // 30 minutes
    }),
    ui: z.object({
      sidebarCollapsed: z.boolean().default(false),
      tablePageSize: z.number().default(25),
      enableAnimations: z.boolean().default(true),
    }),
  })
  .refine(
    (schema) => {
      const isCI = process.env.NEXT_PUBLIC_CI;

      if (isCI ?? !schema.production) {
        return true;
      }

      return !schema.url.startsWith('http:');
    },
    {
      message: `Please provide a valid HTTPS URL. Set the variable NEXT_PUBLIC_SITE_URL with a valid URL, such as: 'https://example.com'`,
      path: ['url'],
    },
  )
  .refine(
    (schema) => {
      return schema.themeColor !== schema.themeColorDark;
    },
    {
      message: `Please provide different theme colors for light and dark themes.`,
      path: ['themeColor'],
    },
  );

const appConfig = AppConfigSchema.parse({
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'SmartLogBook',
  title: process.env.NEXT_PUBLIC_SITE_TITLE || 'SmartLogBook Console',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Railway maintenance management console',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
  theme: (process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE as 'light' | 'dark' | 'system') || 'system',
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || '#0f172a',
  themeColorDark: process.env.NEXT_PUBLIC_THEME_COLOR_DARK || '#f1f5f9',
  production,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  features: {
    darkMode: true,
    multiLanguage: true,
    analytics: false,
    notifications: true,
    export: true,
    bulkActions: true,
    manageLinks: getBoolean(
      process.env.NEXT_PUBLIC_ENABLE_MANAGE_LINKS,
      true,
    ),
  },
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxUploadFiles: 5,
    maxTableRows: 1000,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },
  ui: {
    sidebarCollapsed: false,
    tablePageSize: 25,
    enableAnimations: true,
  },
});

export default appConfig;