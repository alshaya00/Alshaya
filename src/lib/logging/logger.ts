/**
 * Centralized Logging Service for Al-Shaye Family Tree Application
 * Provides structured logging with different log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Environment-based log level threshold
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'info' in production, 'debug' in development
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Format error for logging
 */
function formatError(error: Error): LogEntry['error'] {
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

/**
 * Output log entry to appropriate destination
 * In production, this could send to external logging service
 */
function outputLog(entry: LogEntry): void {
  // In production, we'd send to external logging service
  // For now, use structured console output
  const logFn = entry.level === 'error' ? console.error :
                entry.level === 'warn' ? console.warn :
                entry.level === 'debug' ? console.debug :
                console.log;

  // In production, output JSON for structured logging
  if (process.env.NODE_ENV === 'production') {
    logFn(JSON.stringify(entry));
  } else {
    // In development, use readable format
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    logFn(prefix, entry.message, entry.context || '', entry.error || '');
  }
}

/**
 * Main logger object
 */
export const logger = {
  /**
   * Log debug message - for detailed debugging information
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, context);
    outputLog(entry);
  },

  /**
   * Log info message - for general information
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, context);
    outputLog(entry);
  },

  /**
   * Log warning message - for potential issues
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, context);
    outputLog(entry);
  },

  /**
   * Log error message - for errors and exceptions
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const errorObj = error instanceof Error ? error : undefined;
    const entry = createLogEntry('error', message, context, errorObj);
    outputLog(entry);
  },

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    userId?: string
  ): void {
    this.info('API Request', {
      method,
      path,
      statusCode,
      durationMs,
      userId,
    });
  },

  /**
   * Log authentication event
   */
  auth(
    event: 'login' | 'logout' | 'register' | 'password_reset' | '2fa_setup' | '2fa_verify',
    success: boolean,
    userId?: string,
    details?: LogContext
  ): void {
    const level = success ? 'info' : 'warn';
    this[level](`Auth: ${event}`, {
      event,
      success,
      userId,
      ...details,
    });
  },

  /**
   * Log security event
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this[level](`Security: ${event}`, {
      event,
      severity,
      ...details,
    });
  },

  /**
   * Log database operation
   */
  db(
    operation: string,
    table: string,
    success: boolean,
    durationMs?: number,
    details?: LogContext
  ): void {
    const level = success ? 'debug' : 'error';
    this[level](`DB: ${operation} on ${table}`, {
      operation,
      table,
      success,
      durationMs,
      ...details,
    });
  },
};

export default logger;
