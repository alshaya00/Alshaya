// Unit Tests for Validation Schemas
import {
  loginSchema,
  registerSchema,
  createMemberSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  validateInput,
  formatZodErrors,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(emailSchema.safeParse('invalid').success).toBe(false);
      expect(emailSchema.safeParse('test@').success).toBe(false);
      expect(emailSchema.safeParse('@domain.com').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      expect(passwordSchema.safeParse('Password123').success).toBe(true);
      expect(passwordSchema.safeParse('MyStr0ngP@ss').success).toBe(true);
    });

    it('should reject passwords without uppercase', () => {
      const result = passwordSchema.safeParse('password123');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('PasswordABC');
      expect(result.success).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1');
      expect(result.success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      expect(phoneSchema.safeParse('+966500000000').success).toBe(true);
      expect(phoneSchema.safeParse('0500000000').success).toBe(true);
      expect(phoneSchema.safeParse('+1 (555) 123-4567').success).toBe(true);
    });

    it('should accept empty strings (optional)', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(phoneSchema.safeParse('abc').success).toBe(false);
      expect(phoneSchema.safeParse('123').success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
    });

    it('should default rememberMe to false', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(false);
      }
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        nameArabic: 'محمد أحمد',
        nameEnglish: 'Mohammed Ahmed',
        phone: '+966500000000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        nameArabic: 'محمد',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createMemberSchema', () => {
    it('should accept valid member data', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        birthYear: 1990,
        status: 'Living',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const result = createMemberSchema.safeParse({
        birthYear: 1990,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid gender', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Other',
      });
      expect(result.success).toBe(false);
    });

    it('should reject birth year in the future', () => {
      const futureYear = new Date().getFullYear() + 1;
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        birthYear: futureYear,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields as null', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        fatherId: null,
        birthYear: null,
        phone: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('validateInput helper', () => {
    it('should return success true for valid input', () => {
      const result = validateInput(emailSchema, 'test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should return success false for invalid input', () => {
      const result = validateInput(emailSchema, 'invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('formatZodErrors helper', () => {
    it('should format errors correctly', () => {
      const result = loginSchema.safeParse({ email: 'invalid' });
      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted).toHaveProperty('email');
        expect(formatted).toHaveProperty('password');
      }
    });
  });
});
