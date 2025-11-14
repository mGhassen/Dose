import { z } from "zod";
import { toast } from "@kit/hooks/use-toast";

/**
 * Validates data against a Zod schema and handles errors
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param showToast - Whether to show toast notifications for errors (default: true)
 * @returns Object with success boolean and validated data or error
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  showToast = true
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (!result.success) {
    if (showToast) {
      const firstError = result.error.issues[0];
      toast({
        title: "Validation Error",
        description: firstError?.message || "Please check your input",
        variant: "destructive",
      });
    }
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * Validates form data and returns formatted errors for form fields
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with isValid boolean and field errors map
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: T;
} {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((err) => {
      const path = err.path.join(".");
      errors[path] = err.message;
    });

    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: {},
    data: result.data,
  };
}

/**
 * Gets all error messages from a Zod error
 */
export function getErrorMessages(error: z.ZodError): string[] {
  return error.issues.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
    return `${path}${err.message}`;
  });
}

/**
 * Gets the first error message from a Zod error
 */
export function getFirstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Validation failed";
}

