import * as React from 'react';
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  withAuth?: boolean;
  initialRouterState?: {
    pathname?: string;
    searchParams?: Record<string, string>;
  };
}

export function createWrapper(options: { queryClient?: QueryClient; withAuth?: boolean } = {}) {
  const { queryClient = createTestQueryClient(), withAuth = true } = options;

  return function Wrapper({ children }: WrapperProps): ReactElement {
    if (withAuth) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      );
    }

    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & { queryClient: QueryClient; user: ReturnType<typeof userEvent.setup> } {
  const { queryClient = createTestQueryClient(), withAuth = true, ...renderOptions } = options;
  const user = userEvent.setup();

  const Wrapper = createWrapper({ queryClient, withAuth });

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
    user,
  };
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: WrapperProps): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
}

interface MockAuthUser {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_LEADER' | 'MEMBER' | 'GUEST';
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
  linkedMemberId?: string;
  assignedBranch?: string;
}

export const mockUsers: Record<string, MockAuthUser> = {
  superAdmin: {
    id: 'user-super-admin',
    email: 'admin@alshaye.com',
    nameArabic: 'مدير النظام',
    nameEnglish: 'System Admin',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  },
  admin: {
    id: 'user-admin',
    email: 'moderator@alshaye.com',
    nameArabic: 'مشرف',
    nameEnglish: 'Moderator',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  branchLeader: {
    id: 'user-branch-leader',
    email: 'leader@alshaye.com',
    nameArabic: 'قائد الفرع',
    nameEnglish: 'Branch Leader',
    role: 'BRANCH_LEADER',
    status: 'ACTIVE',
    assignedBranch: 'فرع محمد',
  },
  member: {
    id: 'user-member',
    email: 'member@alshaye.com',
    nameArabic: 'عضو',
    nameEnglish: 'Member',
    role: 'MEMBER',
    status: 'ACTIVE',
    linkedMemberId: 'P010',
  },
  guest: {
    id: 'user-guest',
    email: 'guest@alshaye.com',
    nameArabic: 'زائر',
    nameEnglish: 'Guest',
    role: 'GUEST',
    status: 'ACTIVE',
  },
  pendingUser: {
    id: 'user-pending',
    email: 'pending@alshaye.com',
    nameArabic: 'مستخدم معلق',
    nameEnglish: 'Pending User',
    role: 'MEMBER',
    status: 'PENDING',
  },
};

export function mockAuthenticatedUser(user: MockAuthUser = mockUsers.member) {
  const mockSession = {
    user: {
      ...user,
      permissions: [],
    },
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('alshaye_session', JSON.stringify(mockSession));
  }

  return mockSession;
}

export function clearMockAuth(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('alshaye_session');
    window.sessionStorage.removeItem('alshaye_session');
  }
}

export async function waitForLoadingToFinish(): Promise<void> {
  await waitFor(() => {
    const loadingElements = screen.queryAllByTestId('loading');
    expect(loadingElements.length).toBe(0);
  });
}

export async function waitForElementToBeRemoved(element: Element | null): Promise<void> {
  if (element) {
    await waitFor(() => {
      expect(element).not.toBeInTheDocument();
    });
  }
}

export function createMockApiResponse<T>(data: T, options: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response;
}

export function mockApiCall<T>(data: T, options: { ok?: boolean; status?: number } = {}): Response {
  const response = createMockApiResponse(data, options);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response);
  return response;
}

export function mockApiError(message: string, status: number = 500): Response {
  const response = createMockApiResponse({ error: message, message }, { ok: false, status });
  (global.fetch as jest.Mock).mockResolvedValueOnce(response);
  return response;
}

export async function fillForm(fields: Record<string, string>): Promise<void> {
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'));
    await user.clear(input);
    await user.type(input, value);
  }
}

export async function clickButton(text: string | RegExp): Promise<HTMLElement> {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: text });
  await user.click(button);
  return button;
}

export async function selectOption(label: string | RegExp, optionText: string): Promise<HTMLElement> {
  const user = userEvent.setup();
  const select = screen.getByLabelText(label);
  await user.selectOptions(select, optionText);
  return select;
}

export function expectToBeInDocument(text: string | RegExp): void {
  expect(screen.getByText(text)).toBeInTheDocument();
}

export function expectNotToBeInDocument(text: string | RegExp): void {
  expect(screen.queryByText(text)).not.toBeInTheDocument();
}

export { render, screen, waitFor, userEvent };
