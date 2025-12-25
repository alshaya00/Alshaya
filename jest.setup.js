// Jest setup file
import '@testing-library/jest-dom';

// Polyfill for Request and Response if not available (for API route tests)
if (typeof Request === 'undefined') {
  class MockRequest {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Headers(options.headers || {});
      this._body = options.body;
    }
    async json() {
      return JSON.parse(this._body);
    }
    async text() {
      return this._body;
    }
  }
  global.Request = MockRequest;
}

if (typeof Response === 'undefined') {
  class MockResponse {
    constructor(body, options = {}) {
      this._body = body;
      this.status = options.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Headers(options.headers || {});
    }
    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      return this._body;
    }
    async text() {
      if (typeof this._body === 'string') {
        return this._body;
      }
      return JSON.stringify(this._body);
    }
  }
  global.Response = MockResponse;
}

// Polyfill for Headers if not available
if (typeof Headers === 'undefined') {
  class MockHeaders {
    constructor(init = {}) {
      this._headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      }
    }
    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }
    set(name, value) {
      this._headers.set(name.toLowerCase(), value);
    }
    has(name) {
      return this._headers.has(name.toLowerCase());
    }
  }
  global.Headers = MockHeaders;
}

// Polyfill for FormData if not available
if (typeof FormData === 'undefined') {
  class MockFormData {
    constructor() {
      this._data = new Map();
    }
    append(key, value) {
      this._data.set(key, value);
    }
    get(key) {
      return this._data.get(key);
    }
    entries() {
      return this._data.entries();
    }
  }
  global.FormData = MockFormData;
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({ ...data, ...init })),
    next: jest.fn(),
    redirect: jest.fn(),
    rewrite: jest.fn(),
  },
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
  },
  headers() {
    return new Headers();
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
