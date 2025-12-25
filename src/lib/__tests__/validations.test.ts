// Unit Tests for Validation Schemas
import {
  loginSchema,
  registerSchema,
  createMemberSchema,
  updateMemberSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  arabicNameSchema,
  englishNameSchema,
  idSchema,
  genderSchema,
  memberStatusSchema,
  userRoleSchema,
  userStatusSchema,
  createInviteSchema,
  accessRequestSchema,
  searchQuerySchema,
  paginationSchema,
  memberQuerySchema,
  passwordResetSchema,
  createSnapshotSchema,
  validateInput,
  formatZodErrors,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
      expect(emailSchema.safeParse('user+tag@example.org').success).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(emailSchema.safeParse('invalid').success).toBe(false);
      expect(emailSchema.safeParse('test@').success).toBe(false);
      expect(emailSchema.safeParse('@domain.com').success).toBe(false);
      expect(emailSchema.safeParse('test@.com').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(emailSchema.safeParse('test @example.com').success).toBe(false);
      expect(emailSchema.safeParse(' test@example.com').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      expect(passwordSchema.safeParse('Password123').success).toBe(true);
      expect(passwordSchema.safeParse('MyStr0ngP@ss').success).toBe(true);
      expect(passwordSchema.safeParse('Aa1aaaaa').success).toBe(true);
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

    it('should accept passwords with special characters', () => {
      expect(passwordSchema.safeParse('P@$$w0rd!#').success).toBe(true);
    });

    it('should accept long passwords', () => {
      expect(passwordSchema.safeParse('VeryLongPassword123WithManyCharacters').success).toBe(true);
    });
  });

  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      expect(phoneSchema.safeParse('+966500000000').success).toBe(true);
      expect(phoneSchema.safeParse('0500000000').success).toBe(true);
      expect(phoneSchema.safeParse('+1 (555) 123-4567').success).toBe(true);
      expect(phoneSchema.safeParse('00966500000000').success).toBe(true);
    });

    it('should accept empty strings (optional)', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(phoneSchema.safeParse('abc').success).toBe(false);
      expect(phoneSchema.safeParse('123').success).toBe(false);
      expect(phoneSchema.safeParse('12345').success).toBe(false);
    });

    it('should accept international formats', () => {
      expect(phoneSchema.safeParse('+44 20 7946 0958').success).toBe(true);
      expect(phoneSchema.safeParse('+971-50-123-4567').success).toBe(true);
    });
  });

  describe('arabicNameSchema', () => {
    it('should accept valid Arabic names', () => {
      expect(arabicNameSchema.safeParse('محمد').success).toBe(true);
      expect(arabicNameSchema.safeParse('عبدالله بن محمد').success).toBe(true);
      expect(arabicNameSchema.safeParse('أحمد آل شايع').success).toBe(true);
    });

    it('should accept names with Arabic diacritics', () => {
      expect(arabicNameSchema.safeParse('مُحَمَّد').success).toBe(true);
    });

    it('should reject English names', () => {
      expect(arabicNameSchema.safeParse('Mohammed').success).toBe(false);
    });

    it('should reject mixed Arabic/English', () => {
      expect(arabicNameSchema.safeParse('محمد Ahmed').success).toBe(false);
    });

    it('should reject single character names', () => {
      expect(arabicNameSchema.safeParse('م').success).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(arabicNameSchema.safeParse('').success).toBe(false);
    });

    it('should accept names with spaces', () => {
      expect(arabicNameSchema.safeParse('عبد الرحمن بن سعد').success).toBe(true);
    });
  });

  describe('englishNameSchema', () => {
    it('should accept valid English names', () => {
      expect(englishNameSchema.safeParse('Mohammed').success).toBe(true);
      expect(englishNameSchema.safeParse('John Doe').success).toBe(true);
    });

    it('should accept empty strings (optional)', () => {
      expect(englishNameSchema.safeParse('').success).toBe(true);
    });

    it('should reject Arabic names', () => {
      expect(englishNameSchema.safeParse('محمد').success).toBe(false);
    });

    it('should reject names with numbers', () => {
      expect(englishNameSchema.safeParse('John123').success).toBe(false);
    });

    it('should reject single character', () => {
      expect(englishNameSchema.safeParse('J').success).toBe(false);
    });
  });

  describe('idSchema', () => {
    it('should accept valid IDs', () => {
      expect(idSchema.safeParse('1').success).toBe(true);
      expect(idSchema.safeParse('abc-123').success).toBe(true);
      expect(idSchema.safeParse('uuid-like-string').success).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(idSchema.safeParse('').success).toBe(false);
    });
  });

  describe('genderSchema', () => {
    it('should accept valid genders', () => {
      expect(genderSchema.safeParse('Male').success).toBe(true);
      expect(genderSchema.safeParse('Female').success).toBe(true);
    });

    it('should reject invalid genders', () => {
      expect(genderSchema.safeParse('Other').success).toBe(false);
      expect(genderSchema.safeParse('male').success).toBe(false);
      expect(genderSchema.safeParse('').success).toBe(false);
    });
  });

  describe('memberStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(memberStatusSchema.safeParse('Living').success).toBe(true);
      expect(memberStatusSchema.safeParse('Deceased').success).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(memberStatusSchema.safeParse('Unknown').success).toBe(false);
      expect(memberStatusSchema.safeParse('living').success).toBe(false);
    });
  });

  describe('userRoleSchema', () => {
    it('should accept all valid roles', () => {
      expect(userRoleSchema.safeParse('SUPER_ADMIN').success).toBe(true);
      expect(userRoleSchema.safeParse('ADMIN').success).toBe(true);
      expect(userRoleSchema.safeParse('BRANCH_LEADER').success).toBe(true);
      expect(userRoleSchema.safeParse('MEMBER').success).toBe(true);
      expect(userRoleSchema.safeParse('GUEST').success).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(userRoleSchema.safeParse('SUPERADMIN').success).toBe(false);
      expect(userRoleSchema.safeParse('admin').success).toBe(false);
      expect(userRoleSchema.safeParse('USER').success).toBe(false);
    });
  });

  describe('userStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(userStatusSchema.safeParse('PENDING').success).toBe(true);
      expect(userStatusSchema.safeParse('ACTIVE').success).toBe(true);
      expect(userStatusSchema.safeParse('DISABLED').success).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(userStatusSchema.safeParse('INACTIVE').success).toBe(false);
      expect(userStatusSchema.safeParse('active').success).toBe(false);
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

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
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

    it('should accept minimal registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        nameArabic: 'محمد',
      });
      expect(result.success).toBe(true);
    });

    it('should accept registration with Arabic full name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        nameArabic: 'عبدالرحمن بن محمد آل شايع',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short Arabic name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        nameArabic: 'م',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('passwordResetSchema', () => {
    it('should accept valid password reset data', () => {
      const result = passwordResetSchema.safeParse({
        token: 'valid-token-123',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = passwordResetSchema.safeParse({
        token: 'valid-token-123',
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('should reject empty token', () => {
      const result = passwordResetSchema.safeParse({
        token: '',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
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

    it('should accept full Arabic name with complex characters', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'عبدالله',
        fatherName: 'محمد',
        grandfatherName: 'عبدالرحمن',
        gender: 'Male',
        fullNameAr: 'عبدالله بن محمد بن عبدالرحمن آل شايع',
      });
      expect(result.success).toBe(true);
    });

    it('should accept deceased member with death year', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'شايع',
        gender: 'Male',
        status: 'Deceased',
        birthYear: 1920,
        deathYear: 1995,
      });
      expect(result.success).toBe(true);
    });

    it('should reject birth year before 1800', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        birthYear: 1700,
      });
      expect(result.success).toBe(false);
    });

    it('should set default family name', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.familyName).toBe('آل شايع');
      }
    });

    it('should accept valid email for member', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        email: 'member@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty email', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد',
        gender: 'Male',
        email: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateMemberSchema', () => {
    it('should require id for update', () => {
      const result = updateMemberSchema.safeParse({
        firstName: 'محمد',
      });
      expect(result.success).toBe(false);
    });

    it('should accept partial updates with id', () => {
      const result = updateMemberSchema.safeParse({
        id: '123',
        firstName: 'عبدالله',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with only id', () => {
      const result = updateMemberSchema.safeParse({
        id: '123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createInviteSchema', () => {
    it('should accept valid invite data', () => {
      const result = createInviteSchema.safeParse({
        email: 'invitee@example.com',
        role: 'MEMBER',
      });
      expect(result.success).toBe(true);
    });

    it('should default role to MEMBER', () => {
      const result = createInviteSchema.safeParse({
        email: 'invitee@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('MEMBER');
      }
    });

    it('should accept invite with branch', () => {
      const result = createInviteSchema.safeParse({
        email: 'invitee@example.com',
        role: 'BRANCH_LEADER',
        branch: 'فرع عبدالله',
      });
      expect(result.success).toBe(true);
    });

    it('should limit message length', () => {
      const result = createInviteSchema.safeParse({
        email: 'invitee@example.com',
        message: 'a'.repeat(600),
      });
      expect(result.success).toBe(false);
    });

    it('should default expiresInDays to 7', () => {
      const result = createInviteSchema.safeParse({
        email: 'invitee@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresInDays).toBe(7);
      }
    });
  });

  describe('accessRequestSchema', () => {
    it('should accept valid access request', () => {
      const result = accessRequestSchema.safeParse({
        email: 'requester@example.com',
        nameArabic: 'محمد أحمد',
        claimedRelation: 'أنا ابن عبدالله بن محمد آل شايع',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short claimed relation', () => {
      const result = accessRequestSchema.safeParse({
        email: 'requester@example.com',
        nameArabic: 'محمد',
        claimedRelation: 'ابن',
      });
      expect(result.success).toBe(false);
    });

    it('should accept request with relationship type', () => {
      const result = accessRequestSchema.safeParse({
        email: 'requester@example.com',
        nameArabic: 'محمد',
        claimedRelation: 'أنا ابن عم من الجيل الرابع',
        relationshipType: 'GRANDCHILD',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('searchQuerySchema', () => {
    it('should accept valid search query', () => {
      const result = searchQuerySchema.safeParse({
        q: 'محمد',
      });
      expect(result.success).toBe(true);
    });

    it('should default type to members', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('members');
      }
    });

    it('should reject empty query', () => {
      const result = searchQuerySchema.safeParse({
        q: '',
      });
      expect(result.success).toBe(false);
    });

    it('should limit results', () => {
      const result = searchQuerySchema.safeParse({
        q: 'test',
        limit: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination', () => {
      const result = paginationSchema.safeParse({
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject page 0', () => {
      const result = paginationSchema.safeParse({
        page: 0,
        limit: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({
        page: 1,
        limit: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.safeParse({
        page: '5',
        limit: '20',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('memberQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = memberQuerySchema.safeParse({
        page: 1,
        limit: 20,
        gender: 'Male',
        status: 'Living',
      });
      expect(result.success).toBe(true);
    });

    it('should accept search parameter with Arabic', () => {
      const result = memberQuerySchema.safeParse({
        search: 'محمد آل شايع',
      });
      expect(result.success).toBe(true);
    });

    it('should validate generation range', () => {
      const result = memberQuerySchema.safeParse({
        generation: 25,
      });
      expect(result.success).toBe(false);
    });

    it('should default sortBy to firstName', () => {
      const result = memberQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('firstName');
        expect(result.data.sortOrder).toBe('asc');
      }
    });
  });

  describe('createSnapshotSchema', () => {
    it('should accept valid snapshot data', () => {
      const result = createSnapshotSchema.safeParse({
        name: 'نسخة احتياطية ديسمبر 2025',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createSnapshotSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject long name', () => {
      const result = createSnapshotSchema.safeParse({
        name: 'a'.repeat(150),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional description', () => {
      const result = createSnapshotSchema.safeParse({
        name: 'Backup',
        description: 'Monthly backup with all member data',
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

    it('should return errors object for invalid input', () => {
      const result = validateInput(emailSchema, 'invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should work with complex schemas', () => {
      const result = validateInput(createMemberSchema, {
        firstName: 'محمد',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
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

    it('should format nested errors', () => {
      const result = createMemberSchema.safeParse({});
      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted).toHaveProperty('firstName');
        expect(formatted).toHaveProperty('gender');
      }
    });

    it('should use dot notation for nested paths', () => {
      const result = loginSchema.safeParse({});
      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(Object.keys(formatted)).toContain('email');
        expect(Object.keys(formatted)).toContain('password');
      }
    });
  });

  describe('Arabic Text Edge Cases', () => {
    it('should handle Arabic numerals in names', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'محمد٢',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
    });

    it('should handle Arabic with tashkeel', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'مُحَمَّد',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
    });

    it('should handle long Arabic names', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'عبدالله بن محمد بن عبدالرحمن بن عبدالعزيز',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
    });

    it('should handle hamza variations', () => {
      const result = createMemberSchema.safeParse({
        firstName: 'أحمد إبراهيم آمنة',
        gender: 'Male',
      });
      expect(result.success).toBe(true);
    });

    it('should search with Arabic keywords', () => {
      const result = searchQuerySchema.safeParse({
        q: 'آل شايع',
      });
      expect(result.success).toBe(true);
    });
  });
});
