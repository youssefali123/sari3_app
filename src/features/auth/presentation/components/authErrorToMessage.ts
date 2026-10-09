import { AuthErrorType } from '../../domain/repositories/AuthRepository';

/**
 * Maps domain auth error kinds to user-facing inline messages
 * (Quickstart Scenario 7 — every predictable failure gets a specific message).
 */
export function authErrorToMessage(error: AuthErrorType): string {
  switch (error.kind) {
    case 'invalid_credentials':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'email_already_registered':
      return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
    case 'weak_password':
      return 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.';
    case 'email_not_confirmed':
      return 'يرجى تأكيد بريدك الإلكتروني أولاً عبر الرابط المرسل إليك.';
    case 'invalid_confirmation_code':
      return 'رمز التأكيد غير صحيح أو انتهت صلاحيته. يرجى المحاولة مجدداً.';
    case 'network_error':
      return 'تعذر الاتصال بالإنترنت. يرجى التحقق من الشبكة والمحاولة مجدداً.';
    case 'unknown':
      return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.';
  }
}
