import { Prisma } from '@prisma/client';

export { Prisma };

// Create a mock Prisma client for build time when Prisma isn't fully initialized
function createMockPrismaClient() {
  const mockHandler = {
    get(_target: unknown, prop: string) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      if (prop === '$transaction') {
        return (fn: (tx: unknown) => Promise<unknown>) => fn(createMockPrismaClient());
      }
      // Return a mock model with common Prisma operations
      return {
        findMany: () => Promise.resolve([]),
        findFirst: () => Promise.resolve(null),
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}),
        update: () => Promise.resolve({}),
        delete: () => Promise.resolve({}),
        deleteMany: () => Promise.resolve({ count: 0 }),
        count: () => Promise.resolve(0),
        upsert: () => Promise.resolve({}),
      };
    },
  };
  return new Proxy({}, mockHandler);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

try {
  // Dynamic import to avoid build-time errors
  const { PrismaClient } = require('@prisma/client');

  const globalForPrisma = globalThis as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any | undefined;
  };

  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (error) {
  console.warn('Prisma client not initialized. Using mock client for build.');
  prisma = createMockPrismaClient();
}

export { prisma };
export default prisma;
