

export type NetworkErrorCode =
  | 'fetch_failed'
  | 'timeout'
  | 'rate_limited'
  | 'auth_failed'
  | 'not_found'
  | 'server_error'
  | 'unknown';

export class NetworkError extends Error {
  constructor(
    public code: NetworkErrorCode,
    message: string,
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function classifyError(error: any): NetworkError {
  if (error instanceof NetworkError) {
    return error;
  }

  const message = error?.message || String(error);

  if (message.includes('fetch') || message.includes('network')) {
    return new NetworkError('fetch_failed', 'Network connection failed. Please check your internet connection.', undefined, true);
  }

  if (message.includes('timeout')) {
    return new NetworkError('timeout', 'Request timed out. Please try again.', undefined, true);
  }

  if (error?.status === 429 || message.includes('rate limit')) {
    return new NetworkError('rate_limited', 'Too many requests. Please wait a moment and try again.', 429, true);
  }

  if (error?.status === 401 || error?.status === 403) {
    return new NetworkError('auth_failed', 'Authentication failed. Please log in again.', error.status, false);
  }

  if (error?.status === 404) {
    return new NetworkError('not_found', 'Resource not found.', 404, false);
  }

  if (error?.status && error.status >= 500) {
    return new NetworkError('server_error', 'Server error. Please try again later.', error.status, true);
  }

  return new NetworkError('unknown', error?.message || 'An unexpected error occurred.', undefined, true);
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  }
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
  } = options || {};

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const networkError = classifyError(error);

      if (!networkError.retryable || attempt === maxAttempts - 1) {
        throw networkError;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError || new Error('Operation failed after max attempts');
}

export function isRetryableError(error: any): boolean {
  const networkError = classifyError(error);
  return networkError.retryable;
}

export function getErrorMessage(error: any): string {
  if (error instanceof NetworkError) {
    return error.message;
  }
  const classified = classifyError(error);
  return classified.message;
}
