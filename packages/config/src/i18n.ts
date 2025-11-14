import { getRequestConfig } from 'next-intl/server';

// Shared i18n configuration
export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'fr' as const;
export type Locale = typeof locales[number];

// This is Next.js specific and should be imported in web app's i18n config
// For web app, create a wrapper that uses this:
export const createI18nConfig = () => {
  return getRequestConfig(async () => {
    // Dynamic import to avoid issues in non-Next.js environments
    const { cookies } = await import('next/headers');
    
    // Get locale from cookie
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
    
    // Validate locale
    const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

    // Import messages based on locale - using explicit imports for webpack
    let messages;
    if (validLocale === 'en') {
      messages = (await import('../messages/en.json')).default;
    } else {
      messages = (await import('../messages/fr.json')).default;
    }

    return {
      locale: validLocale,
      messages
    };
  });
};
