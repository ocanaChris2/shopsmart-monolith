/**
 * Utility functions for consistent date handling across the application
 */

/**
 * Formats a Date object or ISO string for storage
 * @param date - Date object or ISO string
 * @returns ISO string representation of the date
 * @throws {Error} If input is not a valid Date or ISO string
 */
export const formatDateForStorage = (date: Date | string): string => {
  if (typeof date === 'string') {
    // Validate it's a proper ISO string
    if (isNaN(Date.parse(date))) {
      throw new Error('Invalid date string format');
    }
    return date;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object');
  }
  return date.toISOString();
};

/**
 * Parses a date string from storage into a Date object
 * @param dateStr - ISO date string
 * @returns Date object
 * @throws {Error} If input is not a valid ISO date string
 */
export const parseDateFromStorage = (dateStr: string): Date => {
  if (typeof dateStr !== 'string') {
    throw new Error('Date string must be a string');
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string format');
  }
  return date;
};

/**
 * Checks if two dates are equal regardless of their type (Date or string)
 * @param date1 - First date (Date or string)
 * @param date2 - Second date (Date or string)
 * @returns boolean indicating if dates represent the same moment
 */
export const datesAreEqual = (date1: Date | string, date2: Date | string): boolean => {
  try {
    const d1 = typeof date1 === 'string' ? parseDateFromStorage(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseDateFromStorage(date2) : date2;
    return d1.getTime() === d2.getTime();
  } catch {
    return false;
  }
};

/**
 * Custom JSON stringifier that preserves Date objects
 * @param data - Data to stringify
 * @returns JSON string
 */
export const stringifyWithDates = (data: any): string => {
  return JSON.stringify(data, (_, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
};

/**
 * Custom JSON parser that converts Date strings back to Date objects
 * @param json - JSON string to parse
 * @returns Parsed data with Date objects restored
 */
export const parseWithDates = (json: string): any => {
  return JSON.parse(json, (_, value) => {
    if (value?.__type === 'Date') {
      return new Date(value.value);
    }
    // Detect ISO date strings (e.g., "2025-06-10T07:41:35.705Z")
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {}
    }
    return value;
  });
};
