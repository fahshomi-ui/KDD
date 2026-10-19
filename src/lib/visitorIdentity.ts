import { supabase } from '@/integrations/supabase/client';

/**
 * توحيد رقم الهاتف الكويتي لصيغة قياسية (8 أرقام محلية)
 * يحذف المسافات/الشُرَط/الأقواس/الزائد، ويُسقط 00 و+ و965.
 * إذا لم يكن الإدخال هاتفاً (إيميل أو فارغ) يعيد نصاً مُقصوصاً.
 */
export const normalizePhone = (raw?: string | null): string => {
  if (!raw) return '';
  let p = String(raw).replace(/[\s\-()._]/g, '').trim();
  if (!p) return '';
  // إيميل؟ ارجعه كما هو (لاستخدام stock_alerts بنوع email)
  if (/[a-zA-Z@]/.test(p)) return p;
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('965') && p.length > 8) p = p.slice(3);
  return p;
};

/** يُرجع معرّف جلسة الزائر الحالية (payment_sessions.id) إن وُجد. */
export const getVisitorSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem('visitor_session_id'); } catch { return null; }
};

/**
 * مزامنة هوية الزائر مع جلسة التصفّح في payment_sessions.
 *
 * مهم: الاسم الوحيد المعتمد لعرض الزائر في لوحة التحكم هو الاسم
 * الذي يدخله في صفحة Checkout. لذلك هذه الدالة تُزامن الهاتف فقط
 * (لربط رسائل/طلبات/اشتراكات/تقييمات/تنبيهات الزائر ببطاقته)،
 * ولا تُحدّث customer_name إطلاقاً من باقي النماذج.
 *
 * صفحة Checkout تكتب customer_name مباشرة على payment_sessions
 * عبر useEffect الخاص بها — لا تستخدم هذه الدالة لذلك.
 */
export const syncVisitorIdentity = async (
  identity: { name?: string | null; phone?: string | null; email?: string | null },
) => {
  try {
    if (typeof window === 'undefined') return;
    const id = sessionStorage.getItem('visitor_session_id');
    if (!id) return;
    const phone = normalizePhone(identity.phone);
    const email = (identity.email || '').trim().toLowerCase();
    if (!phone && !email) return;

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (phone) patch.customer_phone = phone;

    // الإيميل يُحفظ داخل metadata (لربط تنبيهات المخزون بنوع email ببطاقة الزائر)
    if (email) {
      const { data } = await supabase
        .from('payment_sessions')
        .select('metadata')
        .eq('id', id)
        .maybeSingle();
      const meta = ((data as any)?.metadata as Record<string, any>) || {};
      patch.metadata = { ...meta, email };
    }

    await supabase.from('payment_sessions').update(patch as any).eq('id', id);
  } catch {
    // silent — لا نوقف تجربة المستخدم بسبب فشل المزامنة
  }
};
