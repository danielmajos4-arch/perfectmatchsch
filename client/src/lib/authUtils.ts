/**
 * Auth Utilities for PWA-safe authentication operations
 * 
 * These utilities help handle network issues gracefully in PWA/offline mode
 * by adding timeout wrappers around async operations that might hang.
 */

// Default timeout for auth operations (10 seconds)
export const AUTH_OPERATION_TIMEOUT_MS = 10000;

// Error types for better handling
export enum AuthErrorType {
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',
  NETWORK = 'NETWORK',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Wraps a promise with a timeout to prevent indefinite hanging
 * Useful for Supabase auth calls that may hang in PWA/offline mode
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @param operationName - Name of the operation for error messages
 * @returns The resolved value or throws a timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = AUTH_OPERATION_TIMEOUT_MS,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  // Check if we're offline before even trying
  if (isLikelyOffline()) {
    throw new AuthError(
      'You appear to be offline. Please check your internet connection.',
      AuthErrorType.OFFLINE
    );
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AuthError(
        `${operationName} timed out. This could mean the server is unreachable or your Supabase project may be paused.`,
        AuthErrorType.TIMEOUT
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Custom AuthError class for better error handling
 */
export class AuthError extends Error {
  type: AuthErrorType;

  constructor(message: string, type: AuthErrorType = AuthErrorType.UNKNOWN) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
  }
}

/**
 * Check if we're likely offline
 * Note: navigator.onLine can be unreliable, so this is just a hint
 */
export function isLikelyOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Classify the type of auth error
 */
export function classifyAuthError(error: unknown): AuthErrorType {
  if (error instanceof AuthError) {
    return error.type;
  }

  if (!(error instanceof Error)) {
    return AuthErrorType.UNKNOWN;
  }

  const message = error.message.toLowerCase();

  // Timeout errors
  if (message.includes('timed out') || message.includes('timeout') || message.includes('aborted')) {
    return AuthErrorType.TIMEOUT;
  }

  // Network/offline errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('net::err') ||
    message.includes('offline')
  ) {
    return isLikelyOffline() ? AuthErrorType.OFFLINE : AuthErrorType.NETWORK;
  }

  // Invalid credentials
  if (
    message.includes('invalid login') ||
    message.includes('invalid credentials') ||
    message.includes('wrong password') ||
    message.includes('user not found') ||
    message.includes('invalid email')
  ) {
    return AuthErrorType.INVALID_CREDENTIALS;
  }

  // User already exists - check for various Supabase error patterns
  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered') ||
    message.includes('email address is already registered') ||
    message.includes('user with this email already exists') ||
    message.includes('duplicate key value') ||
    (message.includes('email') && message.includes('already') && message.includes('registered'))
  ) {
    return AuthErrorType.USER_EXISTS;
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return AuthErrorType.RATE_LIMITED;
  }

  // Server errors
  if (message.includes('500') || message.includes('server error') || message.includes('internal error')) {
    return AuthErrorType.SERVER_ERROR;
  }

  return AuthErrorType.UNKNOWN;
}

/**
 * Get a user-friendly error message for auth errors
 */
export function getAuthErrorMessage(error: unknown): string {
  const errorType = classifyAuthError(error);

  switch (errorType) {
    case AuthErrorType.TIMEOUT:
      return 'Request timed out. The server may be unreachable, or your Supabase project may need to be resumed. Please try again.';

    case AuthErrorType.OFFLINE:
      return 'You appear to be offline. Please check your internet connection and try again.';

    case AuthErrorType.NETWORK:
      return 'Network error. Please check your internet connection and try again.';

    case AuthErrorType.INVALID_CREDENTIALS:
      return 'Invalid email or password. Please check your credentials and try again.';

    case AuthErrorType.USER_EXISTS:
      return 'An account with this email already exists. Please sign in instead.';

    case AuthErrorType.RATE_LIMITED:
      return 'Too many attempts. Please wait a few minutes before trying again.';

    case AuthErrorType.SERVER_ERROR:
      return 'Server error. Please try again later or contact support if the issue persists.';

    case AuthErrorType.UNKNOWN:
    default:
      // Return the original error message if it's informative
      if (error instanceof Error && error.message && error.message.length < 200) {
        return error.message;
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if the error suggests the Supabase project might be paused
 */
export function mightBeSupabasePaused(error: unknown): boolean {
  const errorType = classifyAuthError(error);
  return errorType === AuthErrorType.TIMEOUT || errorType === AuthErrorType.NETWORK;
}

