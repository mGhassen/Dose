/**
 * Extracts error message from backend error response
 */
export function extractErrorMessage(error: any, defaultMessage: string): string {
  if (error?.data) {
    // Handle double-encoded JSON errors
    if (typeof error.data === 'string') {
      try {
        const parsed = JSON.parse(error.data);
        if (parsed.detail) return parsed.detail;
        if (parsed.title) return parsed.title;
      } catch {
        // If parsing fails, try to extract from error.data.error
        if (error.data.error) {
          try {
            const parsed = JSON.parse(error.data.error);
            if (parsed.detail) return parsed.detail;
            if (parsed.title) return parsed.title;
          } catch {
            return error.data.error || error.data;
          }
        }
      }
    } else if (error.data.detail) {
      return error.data.detail;
    } else if (error.data.title) {
      return error.data.title;
    } else if (error.data.error) {
      return error.data.error;
    } else if (error.data.message) {
      return error.data.message;
    }
  } else if (error?.message) {
    return error.message;
  }
  
  return defaultMessage;
}

