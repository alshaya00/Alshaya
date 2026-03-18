import { PrismaClient } from '@prisma/client';

// Re-export Prisma namespace for consumers that need it
export { Prisma } from '@prisma/client';

// Fail fast if DATABASE_URL is not configured.
// The old code silently returned a mock client that swallowed every query,
// masking bugs in development and production alike.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'The application cannot start without a database connection. ' +
    'Set DATABASE_URL in your .env file or environment variables.'
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
