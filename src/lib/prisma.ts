import { PrismaClient, Prisma } from '@prisma/client';

export { Prisma };

// Type for the Prisma client - using Record to allow dynamic model access
type PrismaClientType = PrismaClient & Record<string, unknown>;

// Create a mock Prisma client for build time when Prisma isn't fully initialized
function createMockPrismaClient(): PrismaClientType {
  const mockModel = {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    count: () => Promise.resolve(0),
    upsert: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    createMany: () => Promise.resolve({ count: 0 }),
    aggregate: () => Promise.resolve({}),
    groupBy: () => Promise.resolve([]),
  };

  const mockHandler = {
    get(_target: unknown, prop: string) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      if (prop === '$transaction') {
        return (fn: (tx: unknown) => Promise<unknown>) => fn(createMockPrismaClient());
      }
      if (prop === '$queryRaw' || prop === '$executeRaw') {
        return () => Promise.resolve([]);
      }
      // Return mock model for any property access
      return mockModel;
    },
  };
  return new Proxy({}, mockHandler) as PrismaClientType;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

let prisma: PrismaClientType;

try {
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    }) as PrismaClientType;

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (error) {
  console.warn('Prisma client not initialized. Using mock client for build.');
  prisma = createMockPrismaClient();
}

export { prisma };
export default prisma;
