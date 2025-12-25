import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateToken,
  generateInviteCode,
  generateSessionToken,
} from '@/lib/auth/password';

import {
  hasPermission,
  getPermissionsForRole,
  canActOnBranch,
  getAssignableRoles,
  canModifyRole,
  validatePermissionMatrix,
  mergePermissionMatrix,
  serializePermissionMatrix,
  parsePermissionMatrix,
  diffPermissionMatrices,
  createPermissionChecker,
  setPermissionMatrixCache,
  clearPermissionMatrixCache,
  getPermissionMatrix,
} from '@/lib/auth/permissions';

import {
  DEFAULT_PERMISSION_MATRIX,
  USER_ROLES,
  PERMISSION_KEYS,
} from '@/lib/auth/types';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Arabic passwords', async () => {
      const password = 'كلمةالمرور123ABC';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const password = 'P@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
    });

    it('should handle empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });

    it('should reject case variations', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('testpassword123', hash);
      expect(isValid).toBe(false);
    });

    it('should verify Arabic passwords', async () => {
      const password = 'كلمةالمرور123ABC';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject similar but different passwords', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('TestPassword123 ', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid passwords with special characters', () => {
      const result = validatePassword('P@ssw0rd!');
      expect(result.valid).toBe(true);
    });

    it('should reject passwords too short', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.en.includes('8 characters'))).toBe(true);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.en.includes('uppercase'))).toBe(true);
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.en.includes('lowercase'))).toBe(true);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('PasswordABC');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.en.includes('number'))).toBe(true);
    });

    it('should collect all errors for invalid password', () => {
      const result = validatePassword('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should respect custom min length', () => {
      const result = validatePassword('Password123', 15);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.en.includes('15 characters'))).toBe(true);
    });

    it('should return bilingual error messages', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty('en');
      expect(result.errors[0]).toHaveProperty('ar');
      expect(result.errors[0].ar).toContain('أحرف');
    });
  });

  describe('generateToken', () => {
    it('should generate token of default length', () => {
      const token = generateToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(32);
    });

    it('should generate token of custom length', () => {
      const token = generateToken(64);
      expect(token.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should only contain alphanumeric characters', () => {
      const token = generateToken(100);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should handle length of 1', () => {
      const token = generateToken(1);
      expect(token.length).toBe(1);
    });
  });

  describe('generateInviteCode', () => {
    it('should generate code in correct format', () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^ALSHAYE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100);
    });

    it('should not contain confusing characters (I, O, 0, 1)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        const randomPart = code.replace('ALSHAYE-', '').replace('-', '');
        expect(randomPart).not.toMatch(/[IO01]/);
      }
    });
  });

  describe('generateSessionToken', () => {
    it('should generate 64 character token', () => {
      const token = generateSessionToken();
      expect(token.length).toBe(64);
    });

    it('should generate unique session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });
});

describe('Permission Utilities', () => {
  beforeEach(() => {
    clearPermissionMatrixCache();
  });

  describe('hasPermission', () => {
    it('should return true for allowed permissions', () => {
      expect(hasPermission('SUPER_ADMIN', 'delete_member')).toBe(true);
      expect(hasPermission('MEMBER', 'view_family_tree')).toBe(true);
    });

    it('should return false for disallowed permissions', () => {
      expect(hasPermission('GUEST', 'delete_member')).toBe(false);
      expect(hasPermission('MEMBER', 'delete_member')).toBe(false);
    });

    it('should use custom matrix when provided', () => {
      const customMatrix = { ...DEFAULT_PERMISSION_MATRIX };
      customMatrix.GUEST = { ...customMatrix.GUEST, delete_member: true };
      expect(hasPermission('GUEST', 'delete_member', customMatrix)).toBe(true);
    });

    it('should return false for invalid role', () => {
      expect(hasPermission('INVALID_ROLE' as any, 'view_family_tree')).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return all permissions for SUPER_ADMIN', () => {
      const permissions = getPermissionsForRole('SUPER_ADMIN');
      expect(permissions.delete_member).toBe(true);
      expect(permissions.manage_permission_matrix).toBe(true);
    });

    it('should return limited permissions for GUEST', () => {
      const permissions = getPermissionsForRole('GUEST');
      expect(permissions.view_family_tree).toBe(true);
      expect(permissions.delete_member).toBe(false);
    });

    it('should return empty object for invalid role', () => {
      const permissions = getPermissionsForRole('INVALID' as any);
      expect(Object.keys(permissions)).toHaveLength(0);
    });
  });

  describe('canActOnBranch', () => {
    it('should allow SUPER_ADMIN on any branch', () => {
      expect(canActOnBranch('SUPER_ADMIN', null, 'branch1', 'add_member')).toBe(true);
      expect(canActOnBranch('SUPER_ADMIN', 'branch1', 'branch2', 'add_member')).toBe(true);
    });

    it('should allow ADMIN on any branch', () => {
      expect(canActOnBranch('ADMIN', null, 'branch1', 'add_member')).toBe(true);
    });

    it('should allow BRANCH_LEADER only on their branch', () => {
      expect(canActOnBranch('BRANCH_LEADER', 'branch1', 'branch1', 'add_member')).toBe(true);
      expect(canActOnBranch('BRANCH_LEADER', 'branch1', 'branch2', 'add_member')).toBe(false);
    });

    it('should deny BRANCH_LEADER with no assigned branch', () => {
      expect(canActOnBranch('BRANCH_LEADER', null, 'branch1', 'add_member')).toBe(false);
    });

    it('should deny BRANCH_LEADER on null target branch', () => {
      expect(canActOnBranch('BRANCH_LEADER', 'branch1', null, 'add_member')).toBe(false);
    });

    it('should check permission for MEMBER', () => {
      expect(canActOnBranch('MEMBER', null, 'branch1', 'view_family_tree')).toBe(true);
      expect(canActOnBranch('MEMBER', null, 'branch1', 'delete_member')).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('SUPER_ADMIN can assign all roles', () => {
      const roles = getAssignableRoles('SUPER_ADMIN');
      expect(roles).toEqual(USER_ROLES);
    });

    it('ADMIN cannot assign SUPER_ADMIN', () => {
      const roles = getAssignableRoles('ADMIN');
      expect(roles).not.toContain('SUPER_ADMIN');
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('MEMBER');
    });

    it('BRANCH_LEADER can only assign MEMBER', () => {
      const roles = getAssignableRoles('BRANCH_LEADER');
      expect(roles).toEqual(['MEMBER']);
    });

    it('MEMBER cannot assign any roles', () => {
      const roles = getAssignableRoles('MEMBER');
      expect(roles).toHaveLength(0);
    });

    it('GUEST cannot assign any roles', () => {
      const roles = getAssignableRoles('GUEST');
      expect(roles).toHaveLength(0);
    });
  });

  describe('canModifyRole', () => {
    it('SUPER_ADMIN can modify any role', () => {
      expect(canModifyRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
      expect(canModifyRole('SUPER_ADMIN', 'GUEST')).toBe(true);
    });

    it('ADMIN cannot modify SUPER_ADMIN', () => {
      expect(canModifyRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(canModifyRole('ADMIN', 'ADMIN')).toBe(true);
    });

    it('BRANCH_LEADER can only modify MEMBER', () => {
      expect(canModifyRole('BRANCH_LEADER', 'MEMBER')).toBe(true);
      expect(canModifyRole('BRANCH_LEADER', 'ADMIN')).toBe(false);
    });
  });

  describe('validatePermissionMatrix', () => {
    it('should validate correct matrix', () => {
      const result = validatePermissionMatrix(DEFAULT_PERMISSION_MATRIX);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null matrix', () => {
      const result = validatePermissionMatrix(null);
      expect(result.valid).toBe(false);
    });

    it('should reject non-object', () => {
      const result = validatePermissionMatrix('string');
      expect(result.valid).toBe(false);
    });

    it('should report missing roles', () => {
      const incomplete = { SUPER_ADMIN: DEFAULT_PERMISSION_MATRIX.SUPER_ADMIN };
      const result = validatePermissionMatrix(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing role'))).toBe(true);
    });

    it('should report missing permissions', () => {
      const incomplete = {
        ...DEFAULT_PERMISSION_MATRIX,
        GUEST: { view_family_tree: true },
      };
      const result = validatePermissionMatrix(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing or invalid permission'))).toBe(true);
    });
  });

  describe('mergePermissionMatrix', () => {
    it('should merge partial updates', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true },
      });
      expect(merged.GUEST.view_member_profiles).toBe(true);
      expect(merged.GUEST.view_family_tree).toBe(true);
    });

    it('should preserve unchanged values', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {});
      expect(merged).toEqual(DEFAULT_PERMISSION_MATRIX);
    });

    it('should handle multiple role updates', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true },
        MEMBER: { delete_member: true },
      });
      expect(merged.GUEST.view_member_profiles).toBe(true);
      expect(merged.MEMBER.delete_member).toBe(true);
    });
  });

  describe('serializePermissionMatrix / parsePermissionMatrix', () => {
    it('should serialize and parse correctly', () => {
      const serialized = serializePermissionMatrix(DEFAULT_PERMISSION_MATRIX);
      expect(typeof serialized).toBe('string');

      const parsed = parsePermissionMatrix(serialized);
      expect(parsed).toEqual(DEFAULT_PERMISSION_MATRIX);
    });

    it('should return null for invalid JSON', () => {
      const parsed = parsePermissionMatrix('invalid json');
      expect(parsed).toBeNull();
    });

    it('should return null for invalid matrix structure', () => {
      const parsed = parsePermissionMatrix('{"invalid": "structure"}');
      expect(parsed).toBeNull();
    });
  });

  describe('diffPermissionMatrices', () => {
    it('should return empty array for identical matrices', () => {
      const diff = diffPermissionMatrices(DEFAULT_PERMISSION_MATRIX, DEFAULT_PERMISSION_MATRIX);
      expect(diff).toHaveLength(0);
    });

    it('should detect permission changes', () => {
      const modified = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true },
      });
      const diff = diffPermissionMatrices(DEFAULT_PERMISSION_MATRIX, modified);
      expect(diff).toHaveLength(1);
      expect(diff[0]).toEqual({
        role: 'GUEST',
        permission: 'view_member_profiles',
        oldValue: false,
        newValue: true,
      });
    });

    it('should detect multiple changes', () => {
      const modified = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true, view_analytics: true },
      });
      const diff = diffPermissionMatrices(DEFAULT_PERMISSION_MATRIX, modified);
      expect(diff.length).toBeGreaterThan(1);
    });
  });

  describe('createPermissionChecker', () => {
    it('should create checker for SUPER_ADMIN', () => {
      const checker = createPermissionChecker('SUPER_ADMIN');
      expect(checker('delete_member')).toBe(true);
      expect(checker('manage_permission_matrix')).toBe(true);
    });

    it('should create checker for GUEST', () => {
      const checker = createPermissionChecker('GUEST');
      expect(checker('view_family_tree')).toBe(true);
      expect(checker('delete_member')).toBe(false);
    });

    it('should respect branch restrictions for BRANCH_LEADER', () => {
      const checker = createPermissionChecker('BRANCH_LEADER', 'branch1');
      expect(checker('add_member', 'branch1')).toBe(true);
      expect(checker('add_member', 'branch2')).toBe(false);
    });

    it('should apply permission overrides', () => {
      const checker = createPermissionChecker('GUEST', null, { delete_member: true });
      expect(checker('delete_member')).toBe(true);
    });

    it('should not restrict non-branch permissions', () => {
      const checker = createPermissionChecker('BRANCH_LEADER', 'branch1');
      expect(checker('view_family_tree', 'branch2')).toBe(true);
    });
  });

  describe('Permission Matrix Cache', () => {
    it('should use default matrix when cache is empty', () => {
      clearPermissionMatrixCache();
      const matrix = getPermissionMatrix();
      expect(matrix).toEqual(DEFAULT_PERMISSION_MATRIX);
    });

    it('should use cached matrix when set', () => {
      const customMatrix = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true },
      });
      setPermissionMatrixCache(customMatrix);
      const matrix = getPermissionMatrix();
      expect(matrix.GUEST.view_member_profiles).toBe(true);
    });

    it('should clear cache correctly', () => {
      const customMatrix = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        GUEST: { view_member_profiles: true },
      });
      setPermissionMatrixCache(customMatrix);
      clearPermissionMatrixCache();
      const matrix = getPermissionMatrix();
      expect(matrix.GUEST.view_member_profiles).toBe(false);
    });
  });
});
