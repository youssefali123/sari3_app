import { ErrorMessageDictionary } from '@/shared/types/errors';
import { OrderErrorKind } from '../../domain/entities/OrderError';

/**
 * Arabic error messages for the Orders domain (FR-002).
 * Each message describes what happened and suggests the next action.
 */
export const ordersArabicErrorMessages: ErrorMessageDictionary<OrderErrorKind> = {
  auth_required: 'يرجى تسجيل الدخول لمتابعة الطلب.',
  only_customers_can_place_orders: 'حسابات السائقين لا يمكنها تقديم طلبات طعام.',
  missing_idempotency_key: 'تعذر التحقق من صحة الطلب، حاول مرة أخرى.',
  store_not_found: 'المتجر المطلوب غير موجود.',
  store_closed: 'المتجر مغلق حالياً ولا يستقبل طلبات جديدة.',
  address_not_found: 'عنوان التوصيل المحدد غير صالح أو تم حذفه.',
  product_unavailable: 'أحد المنتجات في سلتك لم يعد متوفراً حالياً.',
  product_variant_required: 'يرجى تحديد تفاصيل وحجم المنتج.',
  addon_unavailable: 'أحد الإضافات المحددة لم تعد متوفرة.',
  coupon_invalid: 'رمز الكوبون غير صحيح.',
  coupon_expired: 'انتهت صلاحية هذا الكوبون.',
  coupon_store_restricted: 'هذا الكوبون غير صالح لهذا المتجر.',
  coupon_min_order_not_met: 'قيمة الطلب أقل من الحد الأدنى لتفعيل الكوبون.',
  coupon_usage_limit_reached: 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون.',
  duplicate_idempotency: 'تم إرسال هذا الطلب بالفعل، يرجى مراجعة قائمة طلباتك.',
  order_not_found: 'الطلب غير موجود.',
  order_cannot_be_cancelled: 'لا يمكن إلغاء الطلب في مرحلته الحالية.',
  order_state_changed: 'تغيرت حالة الطلب، يرجى تحديث الصفحة.',
  unauthorized: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  network_error: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.',
  unexpected: 'حدث خطأ غير متوقع أثناء معالجة الطلب، حاول مرة أخرى.',
};

/**
 * Returns a user-facing Arabic message for an OrderErrorKind.
 */
export function getOrderErrorMessage(kind: OrderErrorKind): string {
  return ordersArabicErrorMessages[kind] ?? ordersArabicErrorMessages.unexpected;
}
