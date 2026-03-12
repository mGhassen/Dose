"use client";

/**
 * React hook for dynamic date formatting that respects user preferences
 * This hook provides reactive date formatting functions that automatically
 * update when user settings change.
 */

import { useMemo } from 'react';
import { getUserSettings } from '@kit/lib/user-settings';

// Helper function to convert date format string to Intl.DateTimeFormat options
function getDateFormatOptions(format: string, includeTime = false) {
  const baseOptions = {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    ...(includeTime && {
      hour: '2-digit' as const,
      minute: '2-digit' as const
    })
  };

  // Handle different date formats
  switch (format) {
    case 'MM/DD/YYYY':
      return { ...baseOptions };
    case 'DD/MM/YYYY':
      return { ...baseOptions };
    case 'YYYY-MM-DD':
      return { ...baseOptions };
    case 'DD-MM-YYYY':
      return { ...baseOptions };
    case 'MM-DD-YYYY':
      return { ...baseOptions };
    case 'DD.MM.YYYY':
      return { ...baseOptions };
    case 'MM.DD.YYYY':
      return { ...baseOptions };
    case 'DD MMM YYYY':
      return {
        ...baseOptions,
        month: 'short' as const
      };
    case 'MMM DD, YYYY':
      return {
        ...baseOptions,
        month: 'short' as const
      };
    case 'DD MMMM YYYY':
      return {
        ...baseOptions,
        month: 'long' as const
      };
    case 'MMMM DD, YYYY':
      return {
        ...baseOptions,
        month: 'long' as const
      };
    default:
      return baseOptions;
  }
}

function formatDateWithUserFormat(date: Date, format: string, locale: string, timeZone: string): string {
  const options = getDateFormatOptions(format);
  const opts = { ...options, timeZone };
  return date.toLocaleDateString(locale, opts);
}

export function useDateFormat() {
  // Get settings directly (platform-agnostic)
  const settings = getUserSettings();
  const isLoading = false; // Settings are synchronous when using localStorage

  // Create reactive formatting functions that use current settings
  const formatDate = useMemo(() => {
    return (date: string | Date | null | undefined): string => {
      if (!date) {
        return 'N/A';
      }
      
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      // Use default format during SSR or when settings are loading
      if (typeof window === 'undefined' || isLoading) {
        return dateObj.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      
      try {
        const locale = settings.formattingLocale ?? 'fr-FR';
        const cleanedTimezone = settings.timezone.replace(/^(for|to|in)/, '').trim();
        return formatDateWithUserFormat(dateObj, settings.dateFormat, locale, cleanedTimezone);
      } catch (error) {
        // Fallback to consistent format if settings can't be loaded
        return dateObj.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    };
  }, [settings.formattingLocale, settings.timezone, settings.dateFormat, isLoading]);

  // Simplified other format functions - they can be enhanced later if needed
  const formatDateTime = formatDate;
  const formatTime = formatDate;
  const formatShortDate = formatDate;
  const formatLongDate = formatDate;
  const formatCalendarDate = formatDate;
  const formatDateRange = (startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string => {
    if (!startDate || !endDate) return 'N/A';
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return {
    formatDate,
    formatDateTime,
    formatTime,
    formatShortDate,
    formatLongDate,
    formatCalendarDate,
    formatDateRange,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    language: settings.language,
    formattingLocale: settings.formattingLocale ?? 'fr-FR',
    timezone: settings.timezone,
    preferences: {
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      language: settings.language,
      formattingLocale: settings.formattingLocale ?? 'fr-FR',
      timezone: settings.timezone
    }
  };
}
