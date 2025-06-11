import { formatDateForStorage } from './dateUtils';

/**
 * Formats API responses with consistent date handling
 * @param data - Response data to format
 * @returns Formatted response with dates as ISO strings
 */
export const formatResponse = (data: any): any => {
  try {
    // Convert Dates to ISO strings
    if (data instanceof Date) {
      return formatDateForStorage(data);
    }
    if (Array.isArray(data)) {
      return data.map(item => formatResponse(item));
    }
    if (typeof data === 'object' && data !== null) {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, formatResponse(value)])
      );
    }
    return data;
  } catch (error) {
    console.error('Error formatting response:', error);
    return data; // Fallback to original data if formatting fails
  }
};

/**
 * Express response formatter middleware
 * Wraps res.json() to ensure consistent date formatting
 */
export const responseFormatter = () => {
  return (_req: any, res: any, next: any) => {
    const originalJson = res.json;
    res.json = function(data: any) {
      originalJson.call(this, formatResponse(data));
    };
    next();
  };
};
