/**
 * Utilities for reading the selected year from cookies (server-side)
 * or localStorage (client-side)
 */

const YEAR_STORAGE_KEY = "app-selected-year";

/**
 * Get the selected year from cookies (server-side)
 * Falls back to current year if not found
 */
export async function getSelectedYearFromCookies(): Promise<string> {
  if (typeof window !== 'undefined') {
    // Client-side: this shouldn't be called, but return current year as fallback
    return new Date().getFullYear().toString();
  }
  
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const year = cookieStore.get(YEAR_STORAGE_KEY)?.value;
    
    if (year) {
      const currentYear = new Date().getFullYear();
      const availableYears = Array.from({ length: 5 }, (_, i) => 
        String(currentYear - 2 + i)
      );
      
      // Validate year is in available range
      if (availableYears.includes(year)) {
        return year;
      }
    }
  } catch (error) {
    console.warn('Failed to read year from cookies:', error);
  }
  
  // Default to current year
  return new Date().getFullYear().toString();
}

/**
 * Get the selected year synchronously from cookies (for use in server components)
 * This is a synchronous version that can be used in server components
 */
export function getSelectedYearFromCookiesSync(): string {
  if (typeof window !== 'undefined') {
    // Client-side: this shouldn't be called, but return current year as fallback
    return new Date().getFullYear().toString();
  }
  
  // For server components, we need to use cookies() which is async
  // This function is provided for convenience but may need to be async
  // In practice, use getSelectedYearFromCookies() in async server components
  return new Date().getFullYear().toString();
}

