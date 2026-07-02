// lib/errorHandler.ts
import { ToastType } from "@/components/ui/Toast";

interface ErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export async function getErrorMessage(response: Response): Promise<{
  message: string;
  type: ToastType;
}> {
  try {
    const data = await response.json();
    
    // Handle Django REST Framework validation errors
    if (typeof data === 'object' && data !== null) {
      const errors: string[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          errors.push(`${key}: ${value.join(', ')}`);
        } else if (typeof value === 'string') {
          errors.push(`${key}: ${value}`);
        } else if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            if (Array.isArray(nestedValue)) {
              errors.push(`${key}.${nestedKey}: ${nestedValue.join(', ')}`);
            }
          });
        }
      });
      
      if (errors.length > 0) {
        return { 
          message: errors.join('; '), 
          type: response.status >= 500 ? "error" : "warning" 
        };
      }
      
      if (data.detail) return { message: data.detail, type: "error" };
      if (data.message) return { message: data.message, type: "error" };
      if (data.error) return { message: data.error, type: "error" };
      
      return { 
        message: JSON.stringify(data), 
        type: response.status >= 500 ? "error" : "warning" 
      };
    }
    
    return { 
      message: response.statusText || `Error ${response.status}`, 
      type: response.status >= 500 ? "error" : "warning" 
    };
  } catch {
    return { 
      message: `Error ${response.status}: ${response.statusText}`, 
      type: response.status >= 500 ? "error" : "warning" 
    };
  }
}

// Helper for API calls
export async function handleApiError(error: unknown): Promise<{
  message: string;
  type: ToastType;
}> {
  if (error instanceof Response) {
    return getErrorMessage(error);
  }
  
  if (error instanceof Error) {
    return { message: error.message, type: "error" };
  }
  
  return { message: "An unexpected error occurred", type: "error" };
}