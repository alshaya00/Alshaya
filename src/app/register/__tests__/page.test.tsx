import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, mockApiCall, mockApiError, clearMockAuth } from '@/__tests__/utils/test-utils';
import RegisterPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMockAuth();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  describe('Initial Render - Path Selection', () => {
    it('renders the path selection screen initially', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/انضم إلى العائلة/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/كيف تود الانضمام لشجرة آل شايع/i)).toBeInTheDocument();
    });

    it('renders all three join paths', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/لدي دعوة/i)).toBeInTheDocument();
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
        expect(screen.getByText(/أتصفح فقط/i)).toBeInTheDocument();
      });
    });

    it('renders English subtitles for paths', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/I have an invitation/i)).toBeInTheDocument();
        expect(screen.getByText(/I'm a family member/i)).toBeInTheDocument();
        expect(screen.getByText(/Just browsing/i)).toBeInTheDocument();
      });
    });

    it('renders trust badges section', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/خصوصيتك محمية/i)).toBeInTheDocument();
        expect(screen.getByText(/فقط أفراد العائلة/i)).toBeInTheDocument();
        expect(screen.getByText(/لا مشاركة للبيانات/i)).toBeInTheDocument();
        expect(screen.getByText(/تحكم كامل بمعلوماتك/i)).toBeInTheDocument();
        expect(screen.getByText(/إدارة موثوقة/i)).toBeInTheDocument();
      });
    });

    it('renders login link for existing users', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/لديك حساب بالفعل/i)).toBeInTheDocument();
      });
      
      const loginLinks = screen.getAllByRole('link', { name: /تسجيل الدخول/i });
      expect(loginLinks.length).toBeGreaterThan(0);
    });

    it('renders header with logo', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText('🌳')).toBeInTheDocument();
        expect(screen.getByText('آل شايع')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions - Path Selection', () => {
    it('redirects to invite page when clicking invitation path', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/لدي دعوة/i)).toBeInTheDocument();
      });
      
      const invitePath = screen.getByText(/لدي دعوة/i).closest('button');
      await user.click(invitePath!);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/invite');
      });
    });

    it('shows registration form when clicking family member path', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByText(/طلب الانضمام للعائلة/i)).toBeInTheDocument();
        expect(screen.getByText(/سيتم مراجعة طلبك من قبل إدارة العائلة/i)).toBeInTheDocument();
      });
    });

    it('redirects to tree page when clicking browse path', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أتصفح فقط/i)).toBeInTheDocument();
      });
      
      const browsePath = screen.getByText(/أتصفح فقط/i).closest('button');
      await user.click(browsePath!);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/tree');
      });
    });
  });

  describe('Registration Form Render', () => {
    beforeEach(async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
    });

    it('renders family tree search field', async () => {
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ابحث بالاسم الأول أو اسم العائلة/i)).toBeInTheDocument();
      });
    });

    it('renders contact info section', async () => {
      await waitFor(() => {
        expect(screen.getByText(/معلومات التواصل/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/\+966/i)).toBeInTheDocument();
      });
    });

    it('renders account info section', async () => {
      await waitFor(() => {
        expect(screen.getByText(/معلومات الحساب/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
    });

    it('renders password fields', async () => {
      await waitFor(() => {
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        expect(passwordInputs.length).toBe(2);
      });
    });

    it('renders back button', async () => {
      await waitFor(() => {
        expect(screen.getByText(/رجوع/i)).toBeInTheDocument();
      });
    });

    it('renders submit button', async () => {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /تقديم طلب الانضمام/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('email field has correct type attribute', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('example@email.com');
        expect(emailInput).toHaveAttribute('type', 'email');
      });
    });

    it('password fields have correct type attribute', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        expect(passwordInputs.length).toBe(2);
        expect(passwordInputs[0]).toHaveAttribute('type', 'password');
        expect(passwordInputs[1]).toHaveAttribute('type', 'password');
      });
    });

    it('phone field has correct type attribute', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        const phoneInput = screen.getByPlaceholderText(/\+966/i);
        expect(phoneInput).toHaveAttribute('type', 'tel');
      });
    });

    it('shows password requirements hint', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByText(/8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم/i)).toBeInTheDocument();
      });
    });

    it('shows required field markers', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        const requiredMarkers = screen.getAllByText('*');
        expect(requiredMarkers.length).toBeGreaterThan(0);
      });
    });

    it('allows user input in form fields', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      await user.type(emailInput, 'test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
      
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      await user.type(phoneInput, '+966512345678');
      expect(phoneInput).toHaveValue('+966512345678');
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          requestId: 'REQ-12345',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }));
      });
    });

    it('shows success message after registration', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          requestId: 'REQ-12345',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/تم تقديم طلبك بنجاح!/i)).toBeInTheDocument();
      });
    });

    it('displays request ID on success', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          requestId: 'REQ-12345',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('REQ-12345')).toBeInTheDocument();
        expect(screen.getByText(/رقم الطلب/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, requestId: 'REQ-12345' }),
        }), 1000))
      );
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/جاري إرسال الطلب/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, requestId: 'REQ-12345' }),
        }), 1000))
      );
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /جاري إرسال الطلب/i });
        expect(loadingButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on registration failure', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          messageAr: 'البريد الإلكتروني مستخدم بالفعل',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/البريد الإلكتروني مستخدم بالفعل/i)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى./i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('allows going back from registration form', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByText(/رجوع/i)).toBeInTheDocument();
      });
      
      const backButton = screen.getByText(/رجوع/i).closest('button');
      await user.click(backButton!);
      
      await waitFor(() => {
        expect(screen.getByText(/انضم إلى العائلة/i)).toBeInTheDocument();
      });
    });

    it('shows login link on success page', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          requestId: 'REQ-12345',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /العودة لتسجيل الدخول/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /الصفحة الرئيسية/i })).toBeInTheDocument();
      });
    });
  });

  describe('Arabic Text Rendering', () => {
    it('renders all Arabic labels correctly on path selection', async () => {
      renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/انضم إلى العائلة/i)).toBeInTheDocument();
        expect(screen.getByText(/كيف تود الانضمام لشجرة آل شايع/i)).toBeInTheDocument();
        expect(screen.getByText(/لدي دعوة/i)).toBeInTheDocument();
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
        expect(screen.getByText(/أتصفح فقط/i)).toBeInTheDocument();
      });
    });

    it('renders all Arabic labels correctly on registration form', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /طلب الانضمام للعائلة/i })).toBeInTheDocument();
      });
      
      expect(screen.getByText(/معلومات التواصل/i)).toBeInTheDocument();
      expect(screen.getByText(/معلومات الحساب/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2);
    });

    it('renders RTL direction on registration form', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        const rtlContainer = document.querySelector('[dir="rtl"]');
        expect(rtlContainer).toBeInTheDocument();
      });
    });

    it('renders success message in Arabic', async () => {
      const { user } = renderWithProviders(<RegisterPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/أنا من العائلة/i)).toBeInTheDocument();
      });
      
      const familyPath = screen.getByText(/أنا من العائلة/i).closest('button');
      await user.click(familyPath!);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText('example@email.com');
      const phoneInput = screen.getByPlaceholderText(/\+966/i);
      const nameArabicInput = screen.getByPlaceholderText(/أحمد محمد آل شايع/i);
      const claimedRelationInput = screen.getByPlaceholderText(/ابن محمد أحمد آل شايع/i);
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(phoneInput, '+966512345678');
      await user.type(nameArabicInput, 'محمد أحمد آل شايع');
      await user.type(claimedRelationInput, 'ابن أحمد محمد');
      await user.type(passwordInputs[0], 'Password123');
      await user.type(passwordInputs[1], 'Password123');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          requestId: 'REQ-12345',
        }),
      });
      
      const submitButton = screen.getByRole('button', { name: /تقديم طلب الانضمام/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/تم تقديم طلبك بنجاح!/i)).toBeInTheDocument();
        expect(screen.getByText(/شكراً لك على طلب الانضمام لشجرة عائلة آل شايع/i)).toBeInTheDocument();
      });
    });
  });
});
