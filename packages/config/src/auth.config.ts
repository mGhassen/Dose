import { z } from 'zod';

// Authentication Configuration Schema
export const AuthConfigSchema = z.object({
  provider: z.enum(['supabase', 'auth0', 'firebase', 'custom']).default('supabase'),
  enabled: z.boolean().default(true),
  session: z.object({
    strategy: z.enum(['jwt', 'database', 'hybrid']).default('jwt'),
    maxAge: z.number().default(7 * 24 * 60 * 60 * 1000), // 7 days
    updateAge: z.number().default(24 * 60 * 60 * 1000), // 24 hours
    secure: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
  }),
  password: z.object({
    minLength: z.number().default(8),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(true),
    maxAttempts: z.number().default(5),
    lockoutDuration: z.number().default(15 * 60 * 1000), // 15 minutes
  }),
  mfa: z.object({
    enabled: z.boolean().default(false),
    methods: z.array(z.enum(['totp', 'sms', 'email'])).default(['totp']),
    required: z.boolean().default(false),
  }),
  oauth: z.object({
    providers: z.array(z.enum(['google', 'github', 'microsoft', 'apple'])).default([]),
    redirectUrl: z.string().url().optional(),
  }),
  permissions: z.object({
    defaultRole: z.string().default('user'),
    roles: z.array(z.string()).default(['admin', 'manager', 'user', 'guest']),
    permissions: z.array(z.string()).default([
      'read:dashboard',
      'read:checklists',
      'read:locomotives',
      'read:objects',
      'read:actions',
      'read:acts',
      'read:procedures',
      'read:questions',
      'read:responses',
      'read:issues',
      'read:operations',
      'read:users',
      'read:anomalies',
      'read:configurations',
    ]),
  }),
  security: z.object({
    rateLimit: z.object({
      enabled: z.boolean().default(true),
      maxRequests: z.number().default(100),
      windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    }),
    csrf: z.object({
      enabled: z.boolean().default(true),
      tokenLength: z.number().default(32),
    }),
    headers: z.object({
      hsts: z.boolean().default(true),
      xssProtection: z.boolean().default(true),
      contentSecurityPolicy: z.boolean().default(true),
    }),
  }),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// Default auth configuration
export const authConfig: AuthConfig = {
  provider: 'supabase',
  enabled: true,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    updateAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
  mfa: {
    enabled: false,
    methods: ['totp'],
    required: false,
  },
  oauth: {
    providers: [],
    redirectUrl: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URL,
  },
  permissions: {
    defaultRole: 'user',
    roles: ['admin', 'manager', 'user', 'guest'],
    permissions: [
      'read:dashboard',
      'read:checklists',
      'read:locomotives',
      'read:objects',
      'read:actions',
      'read:acts',
      'read:procedures',
      'read:questions',
      'read:responses',
      'read:issues',
      'read:operations',
      'read:users',
      'read:anomalies',
      'read:configurations',
    ],
  },
  security: {
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    csrf: {
      enabled: true,
      tokenLength: 32,
    },
    headers: {
      hsts: true,
      xssProtection: true,
      contentSecurityPolicy: true,
    },
  },
};

// Validation function
export const validateAuthConfig = (config: unknown): AuthConfig => {
  return AuthConfigSchema.parse(config);
};

// Safe parsing function
export const safeParseAuthConfig = (config: unknown): AuthConfig => {
  const result = AuthConfigSchema.safeParse(config);
  if (result.success) {
    return result.data;
  }
  console.warn('Invalid auth config, using default:', result.error);
  return authConfig;
};

// Helper functions
export const isAuthEnabled = (): boolean => {
  return authConfig.enabled;
};

export const getSessionConfig = () => {
  return authConfig.session;
};

export const getPasswordConfig = () => {
  return authConfig.password;
};

export const isMfaEnabled = (): boolean => {
  return authConfig.mfa.enabled;
};

export const getOAuthProviders = (): string[] => {
  return authConfig.oauth.providers;
};

export const hasPermission = (permission: string, userPermissions: string[]): boolean => {
  return userPermissions.includes(permission) || userPermissions.includes('admin');
};

export const getDefaultRole = (): string => {
  return authConfig.permissions.defaultRole;
};
