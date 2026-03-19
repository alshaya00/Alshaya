export function logError(error: unknown, context?: Record<string, unknown>) {
  console.error('[APP_ERROR]', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export function logWarning(message: string, context?: Record<string, unknown>) {
  console.warn('[APP_WARN]', { message, ...context, timestamp: new Date().toISOString() });
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.info('[APP_INFO]', { message, ...context });
  }
}
