import { ErrorMessageDictionary } from '@/shared/types/errors';
import { AddressErrorKind } from '../../domain/entities/AddressError';

/**
 * Arabic error messages for Addresses domain (FR-002).
 */
export const addressesArabicErrorMessages: ErrorMessageDictionary<AddressErrorKind> = {
  address_not_found: 'العنوان المطلوب غير موجود أو تم حذفه.',
  validation_failed: 'يرجى التأكد من صحة بيانات العنوان والتفاصيل المدخلة.',
  unauthorized: 'يرجى تسجيل الدخول للوصول إلى عناوينك وإدارتها.',
  network_error: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.',
  unexpected: 'حدث خطأ غير متوقع أثناء معالجة العنوان، حاول مرة أخرى.',
};

/**
 * Returns a user-facing Arabic message for an AddressErrorKind.
 */
export function getAddressErrorMessage(kind: AddressErrorKind): string {
  return addressesArabicErrorMessages[kind] ?? addressesArabicErrorMessages.unexpected;
}
