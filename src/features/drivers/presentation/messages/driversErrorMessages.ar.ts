import { ErrorMessageDictionary } from '@/shared/types/errors';
import { DriverErrorKind } from '../../domain/entities/DriverError';

/**
 * Arabic error messages for Driver fulfillment operations (FR-002).
 */
export const driversArabicErrorMessages: ErrorMessageDictionary<DriverErrorKind> = {
  driver_already_has_active_order: 'لديك طلب نشط بالفعل قيد التنفيذ، يرجى إكماله أولاً.',
  user_not_a_driver: 'هذا الحساب غير مسجل كسائق معتمد في النظام.',
  driver_id_mismatch: 'تعذر التحقق من هوية السائق، يرجى إعادة تسجيل الدخول.',
  order_not_found_or_not_assigned: 'الطلب غير موجود أو لم يعد مسنداً إليك.',
  invalid_status_transition: 'لا يمكن تحديث حالة الطلب في مرحلته الحالية.',
  pool_unauthorized: 'فقط السائقون المعتمدون يمكنهم استعراض قائمة الطلبات المتاحة.',
  history_unauthorized: 'فقط السائقون المعتمدون يمكنهم استعراض سجل التوصيل.',
  claim_conflict: 'تم قبول هذا الطلب من كابتن آخر.',
  network_error: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.',
  unexpected: 'حدث خطأ غير متوقع أثناء معالجة الطلب، حاول مرة أخرى.',
};

/**
 * Returns a user-facing Arabic message for a DriverErrorKind.
 */
export function getDriverErrorMessage(kind: DriverErrorKind): string {
  return driversArabicErrorMessages[kind] ?? driversArabicErrorMessages.unexpected;
}
