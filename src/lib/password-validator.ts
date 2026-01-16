/**
 * Password strength validation utility
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  errorsAr: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
    errorsAr.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    errorsAr.push('كلمة المرور يجب أن تحتوي على حرف كبير');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    errorsAr.push('كلمة المرور يجب أن تحتوي على حرف صغير');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
    errorsAr.push('كلمة المرور يجب أن تحتوي على رقم');
  }

  return {
    valid: errors.length === 0,
    errors,
    errorsAr,
  };
}
