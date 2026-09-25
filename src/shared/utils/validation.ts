/**
 * Basic email validation.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Minimum password length check.
 */
export function isValidPassword(password: string, minLength = 6): boolean {
  return password.length >= minLength;
}

/**
 * Checks that a required string field is not empty after trimming.
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}
