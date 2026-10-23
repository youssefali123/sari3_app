import { ErrorMessageDictionary, SharedErrorKind } from '@/shared/types/errors';

/**
 * Centralized Arabic Error Messages for shared errors.
 * No inline error strings in presentation components (FR-002).
 */
export const sharedArabicErrorMessages: ErrorMessageDictionary<SharedErrorKind> = {
  network_error: 'لا يتوفر اتصال بالإنترنت، يرجى التحقق من اتصالك والمحاولة مجدداً.',
  session_expired: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.',
  permission_denied: 'ليس لديك صلاحية للوصول إلى هذا المحتوى أو تنفيذ هذا الإجراء.',
  not_found: 'العنصر المطلوب غير موجود أو تم حذفه.',
  unexpected: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى لاحقاً.',
};

/**
 * Standard offline title & message used across data screens.
 */
export const sharedOfflineMessages = {
  title: 'لا يتوفر اتصال بالإنترنت',
  message: 'يرجى التحقق من اتصالك بالشبكة وإعادة المحاولة لتحديث البيانات.',
  retryAction: 'إعادة المحاولة',
  homeAction: 'العودة للرئيسية',
};

/**
 * Returns a user-friendly Arabic error message for shared error kinds.
 */
export function getSharedErrorMessage(kind: SharedErrorKind): string {
  return sharedArabicErrorMessages[kind] ?? sharedArabicErrorMessages.unexpected;
}
