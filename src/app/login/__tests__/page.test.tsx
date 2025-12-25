import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockApiCall, mockApiError, clearMockAuth } from '@/__tests__/utils/test-utils';
import LoginPage from '../page';

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMockAuth();
    mockSearchParams.delete('error');
  });

  describe('Initial Render', () => {
    it('renders login form with all required elements', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /تسجيل الدخول/i })).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
    });

    it('renders Arabic text correctly with RTL direction', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        const container = screen.getByText(/مرحباً بك في شجرة عائلة آل شايع/i).closest('div');
        expect(container).toBeInTheDocument();
      });
      
      const rtlContainer = document.querySelector('[dir="rtl"]');
      expect(rtlContainer).toBeInTheDocument();
    });

    it('renders navigation links correctly', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /آل شايع/i })).toBeInTheDocument();
        const registerLinks = screen.getAllByRole('link', { name: /طلب الانضمام/i });
        expect(registerLinks.length).toBeGreaterThan(0);
      });
    });

    it('renders remember me checkbox', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/تذكرني/i)).toBeInTheDocument();
      });
    });

    it('renders forgot password link', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /نسيت كلمة المرور/i })).toBeInTheDocument();
      });
    });

    it('renders OAuth login buttons', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /الدخول عبر Google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /الدخول عبر GitHub/i })).toBeInTheDocument();
      });
    });

    it('renders invite code link', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /استخدام رمز الدعوة/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('email field is required', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
        expect(emailInput).toHaveAttribute('required');
      });
    });

    it('password field is required', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/كلمة المرور/i);
        expect(passwordInput).toHaveAttribute('required');
      });
    });

    it('email input accepts email type', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
        expect(emailInput).toHaveAttribute('type', 'email');
      });
    });

    it('password input is of password type', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/كلمة المرور/i);
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });
  });

  describe('User Interactions', () => {
    it('allows user to type email', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('allows user to type password', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();
      });
      
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      await user.type(passwordInput, 'testPassword123');
      
      expect(passwordInput).toHaveValue('testPassword123');
    });

    it('allows user to toggle remember me checkbox', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/تذكرني/i)).toBeInTheDocument();
      });
      
      const checkbox = screen.getByLabelText(/تذكرني/i);
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('submits login form with correct data', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      mockApiCall({
        success: true,
        user: { id: '1', email: 'test@example.com', role: 'MEMBER', status: 'ACTIVE', nameArabic: 'اختبار' },
        token: 'mock-token',
        expiresAt: futureDate.toISOString(),
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }));
      });
    });

    it('redirects to home page on successful login for regular user', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      mockApiCall({
        success: true,
        user: { id: '1', email: 'test@example.com', role: 'MEMBER', status: 'ACTIVE', nameArabic: 'اختبار' },
        token: 'mock-token',
        expiresAt: futureDate.toISOString(),
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('redirects to admin page on successful login for admin user', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      mockApiCall({
        success: true,
        user: { id: '1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE', nameArabic: 'مدير' },
        token: 'mock-token',
        expiresAt: futureDate.toISOString(),
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner during form submission', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            user: { id: '1', role: 'MEMBER', status: 'ACTIVE', nameArabic: 'test' }, 
            token: 'test',
            expiresAt: futureDate.toISOString(),
          }),
        }), 1000))
      );
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/جاري تسجيل الدخول/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            user: { id: '1', role: 'MEMBER', status: 'ACTIVE', nameArabic: 'test' }, 
            token: 'test',
            expiresAt: futureDate.toISOString(),
          }),
        }), 1000))
      );
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /جاري تسجيل الدخول/i });
        expect(loadingButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on login failure', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      mockApiCall({
        success: false,
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      }, { ok: false, status: 401 });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/البريد الإلكتروني أو كلمة المرور غير صحيحة/i)).toBeInTheDocument();
      });
    });

    it('displays remaining attempts on rate limit', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      mockApiCall({
        success: false,
        error: 'Too many attempts. 3 attempts remaining.',
        messageAr: 'Too many attempts. 3 attempts remaining.',
      }, { ok: false, status: 429 });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/المحاولات المتبقية: 3/i)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('shows OAuth error from URL params', async () => {
      mockSearchParams.set('error', 'oauth_failed');
      
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/فشل تسجيل الدخول عبر الحساب الخارجي/i)).toBeInTheDocument();
      });
    });

    it('shows account pending error from URL params', async () => {
      mockSearchParams.set('error', 'account_pending');
      
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/حسابك بانتظار الموافقة/i)).toBeInTheDocument();
      });
    });

    it('shows account disabled error from URL params', async () => {
      mockSearchParams.set('error', 'account_disabled');
      
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/تم تعطيل حسابك/i)).toBeInTheDocument();
      });
    });
  });

  describe('Two-Factor Authentication', () => {
    it('shows 2FA form when required', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      mockApiCall({
        success: false,
        requires2FA: true,
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/المصادقة الثنائية/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });
    });

    it('allows toggling backup code mode', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      mockApiCall({
        success: false,
        requires2FA: true,
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/المصادقة الثنائية/i)).toBeInTheDocument();
      });
      
      const backupCodeCheckbox = screen.getByLabelText(/استخدام رمز الاسترداد/i);
      await user.click(backupCodeCheckbox);
      
      expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
    });

    it('allows going back from 2FA form', async () => {
      const { user } = renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
      
      mockApiCall({
        success: false,
        requires2FA: true,
      });
      
      const emailInput = screen.getByLabelText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByLabelText(/كلمة المرور/i);
      const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/المصادقة الثنائية/i)).toBeInTheDocument();
      });
      
      const backButton = screen.getByRole('button', { name: /رجوع/i });
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      });
    });
  });

  describe('Arabic Text Rendering', () => {
    it('renders all Arabic labels correctly', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /تسجيل الدخول/i })).toBeInTheDocument();
      });
      
      expect(screen.getByText(/مرحباً بك في شجرة عائلة آل شايع/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/تذكرني/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /نسيت كلمة المرور/i })).toBeInTheDocument();
    });

    it('renders footer text in Arabic', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /تسجيل الدخول/i })).toBeInTheDocument();
      });
      
      expect(screen.getByText(/شجرة عائلة آل شايع - نحفظ إرثنا، نربط أجيالنا/i)).toBeInTheDocument();
    });

    it('renders registration prompt in Arabic', async () => {
      renderWithProviders(<LoginPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /تسجيل الدخول/i })).toBeInTheDocument();
      });
      
      expect(screen.getByText(/ليس لديك حساب/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /طلب الانضمام للعائلة/i })).toBeInTheDocument();
    });
  });
});
