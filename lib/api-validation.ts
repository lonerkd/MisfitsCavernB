// API request validation and sanitization

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'url' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  enum?: any[];
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateField(value: any, rule: ValidationRule): { valid: boolean; error?: string } {
  // Check required
  if (rule.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: 'This field is required' };
  }

  if (!rule.required && (value === null || value === undefined || value === '')) {
    return { valid: true };
  }

  // Check type
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `Expected string, got ${typeof value}` };
      }
      if (rule.minLength && value.length < rule.minLength) {
        return { valid: false, error: `Minimum length is ${rule.minLength}` };
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return { valid: false, error: `Maximum length is ${rule.maxLength}` };
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return { valid: false, error: 'Invalid format' };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Expected number' };
      }
      if (rule.min !== undefined && value < rule.min) {
        return { valid: false, error: `Minimum value is ${rule.min}` };
      }
      if (rule.max !== undefined && value > rule.max) {
        return { valid: false, error: `Maximum value is ${rule.max}` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Expected boolean' };
      }
      break;

    case 'email':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string' };
      }
      if (!validateEmail(value)) {
        return { valid: false, error: 'Invalid email address' };
      }
      break;

    case 'uuid':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string' };
      }
      if (!validateUUID(value)) {
        return { valid: false, error: 'Invalid UUID format' };
      }
      break;

    case 'url':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string' };
      }
      if (!validateURL(value)) {
        return { valid: false, error: 'Invalid URL' };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: 'Expected object' };
      }
      break;
  }

  // Check enum
  if (rule.enum && !rule.enum.includes(value)) {
    return { valid: false, error: `Must be one of: ${rule.enum.join(', ')}` };
  }

  return { valid: true };
}

export function validateRequest(
  data: any,
  schema: Record<string, ValidationRule>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const result = validateField(data?.[field], rule);
    if (!result.valid && result.error) {
      errors[field] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}
