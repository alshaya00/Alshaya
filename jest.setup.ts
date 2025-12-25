import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useParams() {
    return {};
  },
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({ ...data, ...init })),
    next: jest.fn(),
    redirect: jest.fn(),
    rewrite: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(() => []),
    };
  },
  headers() {
    return new Headers();
  },
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma = require('./src/__tests__/utils/prisma-mock').prismaMock;
  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
};

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
  } as Response)
);

const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (
      message.includes('Warning: ReactDOM.render') ||
      message.includes('Warning: An update to') ||
      message.includes('act(...)') ||
      message.includes('Not implemented: navigation')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (message.includes('React.createFactory')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

export const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

export function mockFetchResponse<T>(data: T, options: Partial<Response> = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
    ...options,
  } as Response);
}

export function mockFetchError(status: number = 500, message: string = 'Server Error') {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
    headers: new Headers(),
    status,
    statusText: message,
  } as Response);
}

export function mockFetchNetworkError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
}

export async function waitForNextTick() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

export async function flushPromises() {
  await new Promise(resolve => setImmediate(resolve));
}
