"use client";

/**
 * React hook for dynamic date formatting that respects user preferences
 * This hook provides reactive date formatting functions that automatically
 * update when user settings change.
 */

import { useMemo } from 'react';
import { getUserSettings } from '@smartlogbook/lib/user-settings';

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

// Helper function to format date according to user's format preference
function formatDateWithUserFormat(date: Date, format: string, locale: string, timeZone: string): string {
  const options = getDateFormatOptions(format);
  
  // For formats with different separators, we need to manually format
  switch (format) {
    case 'DD/MM/YYYY':
      return date.toLocaleDateString(locale, { ...options, timeZone });
    case 'MM/DD/YYYY':
      return date.toLocaleDateString('en-US', { ...options, timeZone });
    case 'YYYY-MM-DD':
      return date.toLocaleDateString('sv-SE', { ...options, timeZone });
    case 'DD-MM-YYYY':
      return date.toLocaleDateString('en-GB', { ...options, timeZone });
    case 'MM-DD-YYYY':
      return date.toLocaleDateString('en-US', { ...options, timeZone });
    case 'DD.MM.YYYY':
      return date.toLocaleDateString('de-DE', { ...options, timeZone });
    case 'MM.DD.YYYY':
      return date.toLocaleDateString('en-US', { ...options, timeZone });
    case 'DD MMM YYYY':
      return date.toLocaleDateString(locale, { ...options, timeZone });
    case 'MMM DD, YYYY':
      return date.toLocaleDateString('en-US', { ...options, timeZone });
    case 'DD MMMM YYYY':
      return date.toLocaleDateString(locale, { ...options, timeZone });
    case 'MMMM DD, YYYY':
      return date.toLocaleDateString('en-US', { ...options, timeZone });
    default:
      return date.toLocaleDateString(locale, { ...options, timeZone });
  }
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
        // Use the current settings from the hook context
        const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
        const cleanedTimezone = settings.timezone.replace(/^(for|to|in)/, '').trim();
        
        // Apply the user's date format preference
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
  }, [settings.language, settings.timezone, settings.dateFormat, isLoading]);

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
    timezone: settings.timezone,
    preferences: {
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      language: settings.language,
      timezone: settings.timezone
    }
  };
}
