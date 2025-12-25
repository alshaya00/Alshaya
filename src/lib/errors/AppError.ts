/**
 * Custom Error Classes for Al-Shaye Family Tree Application
 * Provides structured error handling across the application
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR';

/**
 * Base application error class
 * Provides structured error information for consistent error handling
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Convert error to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string>;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: Record<string, string> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Authentication error - thrown when user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

/**
 * Authorization error - thrown when user lacks permission
 */
export class AuthorizationError extends AppError {
  public readonly requiredPermission?: string;

  constructor(
    message: string = 'Insufficient permissions',
    requiredPermission?: string
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, { requiredPermission });
    this.requiredPermission = requiredPermission;
  }
}

/**
 * Not found error - thrown when a resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    message: string = 'Resource not found',
    resourceType?: string,
    resourceId?: string
  ) {
    super(message, 'NOT_FOUND_ERROR', 404, true, { resourceType, resourceId });
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Conflict error - thrown when an operation conflicts with existing data
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource already exists',
    details?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT_ERROR', 409, true, details);
  }
}

/**
 * Rate limit error - thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = 'Too many requests',
    retryAfter: number = 60
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error - thrown when a database operation fails
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: Record<string, unknown>
  ) {
    super(message, 'DATABASE_ERROR', 500, true, details);
  }
}

/**
 * External service error - thrown when an external API call fails
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(
    message: string = 'External service error',
    service: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, true, { service, ...details });
    this.service = service;
  }
}

/**
 * Check if an error is an operational AppError
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      500,
      false,
      { originalError: error.name }
    );
  }

  return new AppError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    500,
    false
  );
}
