type MockFn = jest.Mock;

type MockModel = {
  findMany: MockFn;
  findFirst: MockFn;
  findUnique: MockFn;
  create: MockFn;
  update: MockFn;
  upsert: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  updateMany: MockFn;
  createMany: MockFn;
  count: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
};

function createMockModel(): MockModel {
  return {
    findMany: jest.fn().mockResolvedValue([] as unknown[]),
    findFirst: jest.fn().mockResolvedValue(null as unknown),
    findUnique: jest.fn().mockResolvedValue(null as unknown),
    create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => 
      Promise.resolve({ id: 'mock-id', ...args.data })
    ),
    update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => 
      Promise.resolve({ id: 'mock-id', ...args.data })
    ),
    upsert: jest.fn().mockImplementation((args: { create: Record<string, unknown> }) => 
      Promise.resolve({ id: 'mock-id', ...args.create })
    ),
    delete: jest.fn().mockResolvedValue({ id: 'mock-id' } as unknown),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 } as unknown),
    updateMany: jest.fn().mockResolvedValue({ count: 0 } as unknown),
    createMany: jest.fn().mockResolvedValue({ count: 0 } as unknown),
    count: jest.fn().mockResolvedValue(0 as unknown),
    aggregate: jest.fn().mockResolvedValue({} as unknown),
    groupBy: jest.fn().mockResolvedValue([] as unknown[]),
  };
}

export const prismaMock = {
  familyMember: createMockModel(),
  user: createMockModel(),
  session: createMockModel(),
  changeHistory: createMockModel(),
  snapshot: createMockModel(),
  duplicateFlag: createMockModel(),
  invite: createMockModel(),
  accessRequest: createMockModel(),
  passwordReset: createMockModel(),
  emailVerification: createMockModel(),
  permissionMatrix: createMockModel(),
  userPermissionOverride: createMockModel(),
  siteSettings: createMockModel(),
  privacySettings: createMockModel(),
  systemConfig: createMockModel(),
  featureFlag: createMockModel(),
  activityLog: createMockModel(),
  notification: createMockModel(),
  apiKey: createMockModel(),
  auditLog: createMockModel(),
  searchHistory: createMockModel(),
  pendingMember: createMockModel(),
  branchLink: createMockModel(),
  breastfeedingRelationship: createMockModel(),
  memberPhoto: createMockModel(),
  broadcast: createMockModel(),
  broadcastRecipient: createMockModel(),
  journal: createMockModel(),
  familyGathering: createMockModel(),
  gatheringRsvp: createMockModel(),
  pendingImage: createMockModel(),

  $connect: jest.fn().mockResolvedValue(undefined as unknown),
  $disconnect: jest.fn().mockResolvedValue(undefined as unknown),
  $transaction: jest.fn().mockImplementation(async <T>(fn: ((tx: typeof prismaMock) => Promise<T>) | Promise<T>[]): Promise<T | unknown[]> => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return Promise.all(fn);
  }),
  $queryRaw: jest.fn().mockResolvedValue([] as unknown[]),
  $executeRaw: jest.fn().mockResolvedValue(0 as unknown),
  $queryRawUnsafe: jest.fn().mockResolvedValue([] as unknown[]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(0 as unknown),
};

export function resetPrismaMock(): void {
  Object.values(prismaMock).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value as Record<string, unknown>).forEach((method) => {
        if (typeof method === 'function' && 'mockClear' in method) {
          (method as MockFn).mockClear();
        }
      });
    } else if (typeof value === 'function' && 'mockClear' in value) {
      (value as MockFn).mockClear();
    }
  });
}

export function mockPrismaFindMany<T>(model: keyof typeof prismaMock, data: T[]): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'findMany' in modelMock) {
    modelMock.findMany.mockResolvedValue(data);
  }
}

export function mockPrismaFindUnique<T>(model: keyof typeof prismaMock, data: T | null): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'findUnique' in modelMock) {
    modelMock.findUnique.mockResolvedValue(data);
  }
}

export function mockPrismaFindFirst<T>(model: keyof typeof prismaMock, data: T | null): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'findFirst' in modelMock) {
    modelMock.findFirst.mockResolvedValue(data);
  }
}

export function mockPrismaCreate<T>(model: keyof typeof prismaMock, data: T): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'create' in modelMock) {
    modelMock.create.mockResolvedValue(data);
  }
}

export function mockPrismaUpdate<T>(model: keyof typeof prismaMock, data: T): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'update' in modelMock) {
    modelMock.update.mockResolvedValue(data);
  }
}

export function mockPrismaCount(model: keyof typeof prismaMock, count: number): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && 'count' in modelMock) {
    modelMock.count.mockResolvedValue(count);
  }
}

export function mockPrismaError(model: keyof typeof prismaMock, method: keyof MockModel, error: Error): void {
  const modelMock = prismaMock[model] as MockModel;
  if (modelMock && method in modelMock) {
    modelMock[method].mockRejectedValue(error);
  }
}

export function mockTransaction<T>(result: T): void {
  prismaMock.$transaction.mockResolvedValue(result as unknown);
}

export function mockTransactionError(error: Error): void {
  prismaMock.$transaction.mockRejectedValue(error);
}

export type { MockModel };
export default prismaMock;
