import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts empty strings to null for UUID fields to avoid PostgreSQL errors
 */
export function sanitizeUuid(uuid: string | undefined | null): string | null {
  if (!uuid || uuid.trim() === '') {
    return null;
  }
  return uuid;
}

/**
 * Sanitizes an object containing UUID fields by converting empty strings to null
 */
export function sanitizeUuidFields<T extends Record<string, any>>(
  obj: T,
  uuidFields: (keyof T)[]
): T {
  const sanitized = { ...obj };

  for (const field of uuidFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeUuid(sanitized[field] as string) as T[keyof T];
    }
  }

  return sanitized;
}

