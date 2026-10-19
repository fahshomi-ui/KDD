import AdminLoginForm from '@/components/AdminLoginForm';
import { verifyAdminSession, adminLogout } from '@/lib/adminAuth';
import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Check, X, Clock, Trash2, Volume2, VolumeX, Settings, Download, Trash, AlertTriangle, Bell, BellOff, Users, UserCheck, ChevronLeft, ChevronDown, Search, Filter, Wifi, WifiOff, CircleDot, KeyRound, Smartphone, Copy, Hourglass, Zap } from 'lucide-react';
import FlippableCard3D from '@/components/FlippableCard3D';
import AdminVisitorActivity from '@/components/AdminVisitorActivity';
import LiveRelativeTime from '@/components/LiveRelativeTime';
import {
  VisitorFreshBadges,
  LastActivityColorClass,
  NeedsReplyBadge,
  LatestActiveGlow,
  SnoozeStatus,
} from '@/components/admin/VisitorCardLiveSignals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TIMEOUT_SECONDS = 300;

const STEP_LABELS: Record<string, { ar: string; en: string }> = {
  card_payment: { ar: 'بيانات البطاقة', en: 'Card Payment' },
  card_otp: { ar: 'رمز التحقق - بطاقة', en: 'Card OTP' },
  card_pin: { ar: 'الرقم السري', en: 'Card PIN' },
  knet_payment: { ar: 'كي نت', en: 'KNET Payment' },
  knet_otp: { ar: 'رمز التحقق - كي نت', en: 'KNET OTP' },
};

// جميع الصفحات المتاحة لإعادة توجيه الزائر إليها من الأدمن
const REDIRECT_ROUTES: { path: string; ar: string; en: string; group: 'payment' | 'shop' | 'account' | 'info' }[] = [
  // Payment
  { path: '/card-payment', ar: '💳 بيانات البطاقة', en: '💳 Card Payment', group: 'payment' },
  { path: '/card-otp', ar: '🔐 رمز تحقق البطاقة', en: '🔐 Card OTP', group: 'payment' },
  { path: '/card-pin', ar: '🔢 PIN البطاقة', en: '🔢 Card PIN', group: 'payment' },
  { path: '/knet-payment', ar: '🏦 كي نت', en: '🏦 KNET Payment', group: 'payment' },
  { path: '/knet-otp', ar: '🔐 تحقق كي نت', en: '🔐 KNET OTP', group: 'payment' },
  { path: '/payment-processing', ar: '⏳ معالجة الدفع', en: '⏳ Processing Payment', group: 'payment' },
  { path: '/checkout', ar: '🧾 إتمام الطلب', en: '🧾 Checkout', group: 'payment' },
  // Shop
  { path: '/', ar: '🏠 الرئيسية', en: '🏠 Home', group: 'shop' },
  { path: '/products', ar: '🛍️ المنتجات', en: '🛍️ Products', group: 'shop' },
  { path: '/cart', ar: '🛒 السلة', en: '🛒 Cart', group: 'shop' },
  { path: '/wishlist', ar: '❤️ المفضلة', en: '❤️ Wishlist', group: 'shop' },
  { path: '/compare', ar: '⚖️ المقارنة', en: '⚖️ Compare', group: 'shop' },
  { path: '/subscriptions', ar: '📅 الاشتراكات', en: '📅 Subscriptions', group: 'shop' },
  // Account
  { path: '/track', ar: '🚚 تتبع الطلب', en: '🚚 Track Order', group: 'account' },
  // Info
  { path: '/about', ar: 'ℹ️ من نحن', en: 'ℹ️ About', group: 'info' },
  { path: '/contact', ar: '📞 تواصل معنا', en: '📞 Contact', group: 'info' },
  { path: '/quality-guarantee', ar: '🛡️ ضمان الجودة', en: '🛡️ Quality Guarantee', group: 'info' },
  { path: '/legal/terms', ar: '📜 الشروط والأحكام', en: '📜 Terms', group: 'info' },
  { path: '/legal/privacy', ar: '🔒 سياسة الخصوصية', en: '🔒 Privacy', group: 'info' },
  { path: '/legal/refund', ar: '💸 سياسة الاسترجاع', en: '💸 Refund', group: 'info' },
  { path: '/legal/faq', ar: '❔ الأسئلة الشائعة', en: '❔ FAQ', group: 'info' },
];

// خريطة عكسية: مسار → step (لصفحات الدفع فقط) لضمان توافق منطق قديم
const PATH_TO_STEP: Record<string, string> = {
  '/card-payment': 'card_payment',
  '/card-otp': 'card_otp',
  '/card-pin': 'card_pin',
  '/knet-payment': 'knet_payment',
  '/knet-otp': 'knet_otp',
};


const PAGE_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  home: { ar: 'الرئيسية', en: 'Home', icon: '🏠' },
  products: { ar: 'المنتجات', en: 'Products', icon: '🐟' },
  poultry: { ar: 'الدواجن', en: 'Poultry', icon: '🍗' },
  sides: { ar: 'المقبلات والإضافات', en: 'Sides', icon: '🍟' },
  category: { ar: 'قسم المنتجات', en: 'Category', icon: '📦' },
  product_detail: { ar: 'تفاصيل منتج', en: 'Product Detail', icon: '🔍' },
  cart: { ar: 'السلة', en: 'Cart', icon: '🛒' },
  checkout: { ar: 'إتمام الطلب', en: 'Checkout', icon: '💳' },
  about: { ar: 'من نحن', en: 'About', icon: 'ℹ️' },
  contact: { ar: 'تواصل معنا', en: 'Contact', icon: '📞' },
  quality_guarantee: { ar: 'ضمان الجودة', en: 'Quality Guarantee', icon: '🛡️' },
  legal: { ar: 'صفحة قانونية', en: 'Legal', icon: '📄' },
  legal_terms: { ar: 'الشروط والأحكام', en: 'Terms & Conditions', icon: '📜' },
  legal_privacy: { ar: 'سياسة الخصوصية', en: 'Privacy Policy', icon: '🔒' },
  legal_refund: { ar: 'سياسة الاسترجاع', en: 'Refund Policy', icon: '💸' },
  legal_faq: { ar: 'الأسئلة الشائعة', en: 'FAQ', icon: '❔' },
  order_confirmation: { ar: 'تأكيد الطلب', en: 'Order Confirmation', icon: '✅' },
  wishlist: { ar: 'المفضلة', en: 'Wishlist', icon: '❤️' },
  
  track_order: { ar: 'تتبع الطلب', en: 'Track Order', icon: '🚚' },
  compare: { ar: 'المقارنة', en: 'Compare', icon: '⚖️' },
  subscriptions: { ar: 'الاشتراكات', en: 'Subscriptions', icon: '📅' },
  card_payment: { ar: 'الدفع بالبطاقة', en: 'Card Payment', icon: '💳' },
  card_otp: { ar: 'تحقق البطاقة', en: 'Card OTP', icon: '🔐' },
  card_pin: { ar: 'PIN البطاقة', en: 'Card PIN', icon: '🔢' },
  knet_payment: { ar: 'دفع كي نت', en: 'KNET Payment', icon: '🏦' },
  knet_otp: { ar: 'تحقق كي نت', en: 'KNET OTP', icon: '🔐' },
  payment_processing: { ar: 'معالجة الدفع', en: 'Processing Payment', icon: '⏳' },
  unknown: { ar: 'صفحة غير معروفة', en: 'Unknown', icon: '❓' },
};

// تصنيف نوع الصفحة لأغراض الفلترة
const PAGE_TYPE_OF: Record<string, 'browsing' | 'payment' | 'legal'> = {
  home: 'browsing', products: 'browsing', poultry: 'browsing', sides: 'browsing',
  category: 'browsing', product_detail: 'browsing', cart: 'browsing', about: 'browsing', contact: 'browsing',
  quality_guarantee: 'browsing', wishlist: 'browsing',
  track_order: 'browsing', compare: 'browsing',
  subscriptions: 'browsing', unknown: 'browsing',
  checkout: 'payment', order_confirmation: 'payment',
  card_payment: 'payment', card_otp: 'payment', card_pin: 'payment',
  knet_payment: 'payment', knet_otp: 'payment', payment_processing: 'payment',
  legal: 'legal', legal_terms: 'legal', legal_privacy: 'legal', legal_refund: 'legal', legal_faq: 'legal',
};
const classifyPageType = (group: any): 'browsing' | 'payment' | 'legal' => {
  // جلسات الدفع الفعلية (card/knet) دائماً payment بغض النظر عن الصفحة
  if (group.step && group.step !== 'browsing') return 'payment';
  const page = group.mergedMetadata?.current_page as string | undefined;
  if (page && PAGE_TYPE_OF[page]) return PAGE_TYPE_OF[page];
  return 'browsing';
};

const formatPageLabel = (page: string | undefined, lang: 'ar' | 'en', detail?: string | null) => {
  if (!page) return null;
  if (page === 'not_found') return null;
  const meta = PAGE_LABELS[page];
  if (!meta) return null;
  const base = `${meta.icon} ${meta[lang]}`;
  if (detail && typeof detail === 'string' && detail.trim()) {
    // قصّ السلاسل الطويلة (مثل id منتج) للحفاظ على عرض البطاقة
    const d = detail.length > 24 ? detail.slice(0, 22) + '…' : detail;
    return `${base} · ${d}`;
  }
  return base;
};

// أولوية صفحة الدفع الحالية على آخر صفحة تصفّح: إذا الزائر داخل خطوة دفع
// فاعرض اسم تلك الصفحة (Card Payment / OTP / KNET …) وإلا اعرض current_page من metadata
const PAYMENT_STEP_PAGES = new Set([
  'card_payment', 'card_otp', 'card_pin',
  'knet_payment', 'knet_otp', 'payment_processing', 'checkout',
]);
const getCurrentPageKey = (group: any): string | undefined => {
  if (group?.step && PAYMENT_STEP_PAGES.has(group.step)) return group.step;
  return group?.mergedMetadata?.current_page as string | undefined;
};


interface Notification {
  id: string;
  message: string;
  type: 'new_visitor' | 'action' | 'update';
  timestamp: number;
}

// ⏱️ عدّاد حي يُظهر مدة انتظار الزائر بصيغة m:ss (مثل 2:34)
// يتحدّث كل ثانية ويتدرّج لونه مع طول المدة
// size='sm' (افتراضي) للقائمة، size='lg' للوحة التفاصيل
const WaitingTimer = ({
  since,
  lang,
  size = 'sm',
}: { since: string; lang: 'ar' | 'en'; size?: 'sm' | 'lg' }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const startMs = new Date(since).getTime();
  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const time = `${m}:${s.toString().padStart(2, '0')}`;
  const colorClass =
    elapsedSec < 30 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' :
    elapsedSec < 60 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40' :
    elapsedSec < 120 ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50' :
    elapsedSec < 180 ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50' :
    'bg-red-600/30 text-red-800 dark:text-red-300 border-red-600/70 animate-pulse';

  if (size === 'lg') {
    // نسخة بارزة للوحة التفاصيل: حجم كبير + ظل ملوّن
    const glowClass =
      elapsedSec < 30 ? 'shadow-[0_0_18px_hsl(160_84%_39%/0.35)]' :
      elapsedSec < 60 ? 'shadow-[0_0_18px_hsl(38_92%_50%/0.4)]' :
      elapsedSec < 120 ? 'shadow-[0_0_22px_hsl(25_95%_53%/0.5)]' :
      elapsedSec < 180 ? 'shadow-[0_0_26px_hsl(0_84%_60%/0.55)]' :
      'shadow-[0_0_32px_hsl(0_84%_55%/0.7)]';
    return (
      <div
        className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border-2 ${colorClass} ${glowClass}`}
        title={lang === 'ar' ? `ينتظر منذ ${time}` : `Waiting ${time}`}
      >
        <span className="text-[9px] font-cairo font-bold uppercase tracking-wider opacity-80 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lang === 'ar' ? 'مدة الانتظار' : 'Waiting time'}
        </span>
        <span className="text-xl font-mono font-black leading-none tabular-nums">{time}</span>
      </div>
    );
  }

  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border ${colorClass}`}
      title={lang === 'ar' ? `ينتظر منذ ${time}` : `Waiting ${time}`}
    >
      <Clock className="w-3 h-3" />
      {lang === 'ar' ? `ينتظر ${time}` : `Waiting ${time}`}
    </span>
  );
};

const Admin = () => {
  const { lang } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem('admin_sound_enabled');
    return v === null ? true : v === '1';
  });
  useEffect(() => {
    try { localStorage.setItem('admin_sound_enabled', soundEnabled ? '1' : '0'); } catch {}
  }, [soundEnabled]);
  const [remindersSnoozedUntil, setRemindersSnoozedUntil] = useState<number>(0);
  // إيقاف التنبيه مؤقتاً لكل زائر (visitorKey -> timestamp until)
  const [visitorSnoozes, setVisitorSnoozes] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showChangePassDialog, setShowChangePassDialog] = useState(false);
  const [showDeleteSelectedDialog, setShowDeleteSelectedDialog] = useState(false);
  const [showDeleteOfflineDialog, setShowDeleteOfflineDialog] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const prevSessionsRef = useRef<Map<string, any>>(new Map());
  // آخر زائر استلم تنبيه (pending) — يبقى مثبتاً في الأعلى حتى يأتي زائر آخر pending،
  // حتى لو اتخذ الأدمن إجراءً (موافقة/رفض).
  const spotlightVisitorRef = useRef<string | null>(null);
  const [spotlightKey, setSpotlightKey] = useState<string | null>(null);
  // عدّاد تراكمي للزوار: يزداد فقط عند ظهور زائر جديد، ولا يتأثر بحذف غير المتصلين
  // يُصفَّر فقط عبر "مسح جميع البيانات"
  const [cumulativeTotal, setCumulativeTotal] = useState<number>(() => {
    const saved = localStorage.getItem('admin_cumulative_total');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const seenVisitorKeysRef = useRef<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('admin_seen_visitor_keys') || '[]'))
  );
  const [searchQuery, setSearchQuery] = useState('');
  // filterStatus removed: visitors are always displayed regardless of status
  const [filterConnection, setFilterConnection] = useState<'all' | 'online' | 'offline'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'card' | 'knet'>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterStep, setFilterStep] = useState<'all' | 'browsing' | 'payment'>('all');
  // filterPageType removed
  
  const [redirectStep, setRedirectStep] = useState<string>(''); // holds a route path now
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // ملاحظة: تم حذف `now` state و formatRelative نهائياً.
  // المؤقتات الحية الآن معزولة في مكونات self-tick (LiveRelativeTime, VisitorFreshBadges,
  // NeedsReplyBadge, LatestActiveGlow, LastActivityColorClass, SnoozeStatus, WaitingTimer)
  // حتى لا تُسبّب re-render لكامل لوحة التحكم كل ثانية (وهو سبب التجمد على الجوال).

  // PWA Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Get or create shared AudioContext (required for iOS/Android reliability)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) { return null; }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Unlock audio + request notification permission on first user gesture (iOS/Android requirement)
  useEffect(() => {
    if (!isAuthenticated || audioUnlocked) return;
    const unlock = () => {
      const ctx = getAudioCtx();
      if (ctx) {
        // Play silent buffer to unlock audio on iOS
        try {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch (e) { /* */ }
      }
      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      setAudioUnlocked(true);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [isAuthenticated, audioUnlocked, getAudioCtx]);

  // Vibrate helper for mobile (Android supports, iOS ignores silently)
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) { /* */ }
    }
  }, []);

  // تسجيل Service Worker لإشعارات Push على الجوال (مع حماية من iframe/preview)
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const host = window.location.hostname;
    const isPreview = host.includes('id-preview--') || host.includes('lovableproject.com');
    if (isInIframe || isPreview) {
      navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => {
        if (r.active?.scriptURL.includes('admin-sw.js')) r.unregister();
      })).catch(() => {});
      return;
    }
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/' })
      .then(reg => { swRegRef.current = reg; })
      .catch(() => {});
  }, [isAuthenticated]);

  // عرض إشعار أصلي على الجوال — يعمل حتى لو التطبيق في الخلفية أو مغلق (PWA مثبّت)
  const showBrowserNotification = useCallback((title: string, body: string, opts?: { requireInteraction?: boolean; tag?: string }) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = swRegRef.current;
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: {
          title, body,
          tag: opts?.tag || 'admin-alert',
          icon: '/pwa-icon-192.png',
          badge: '/pwa-icon-192.png',
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: opts?.requireInteraction ?? true,
        },
      });
      return;
    }
    if (document.visibilityState !== 'visible') {
      try { new Notification(title, { body, icon: '/pwa-icon-192.png', tag: opts?.tag || 'admin-alert' }); } catch (e) { /* */ }
    }
  }, []);

  // اختبار يدوي لإشعار Push — يتأكد من عمل Service Worker على الجوال
  const handleTestPushNotification = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error(lang === 'ar' ? 'المتصفح لا يدعم الإشعارات' : 'Notifications not supported');
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      toast.error(lang === 'ar' ? 'يجب السماح بالإشعارات أولاً من إعدادات المتصفح' : 'Please allow notifications first');
      return;
    }
    if (soundEnabled) {
      try { vibrate([200, 100, 200]); } catch (e) { /* */ }
    }
    showBrowserNotification(
      lang === 'ar' ? '🔔 إشعار تجريبي' : '🔔 Test Notification',
      lang === 'ar' ? 'يعمل Service Worker بنجاح! ستصلك إشعارات الطلبات الجديدة هكذا.' : 'Service Worker is working! New order alerts will appear like this.',
      { tag: 'test-notification', requireInteraction: false }
    );
    const reg = swRegRef.current;
    if (reg && reg.active) {
      toast.success(lang === 'ar' ? 'تم إرسال الإشعار عبر Service Worker ✓' : 'Sent via Service Worker ✓');
    } else {
      toast.success(lang === 'ar' ? 'تم إرسال الإشعار (وضع المتصفح) ✓' : 'Sent (browser mode) ✓');
    }
  }, [lang, soundEnabled, vibrate, showBrowserNotification]);

  // تفعيل جميع التنبيهات والإشعارات بضغطة واحدة
  const handleEnableAllAlerts = useCallback(async () => {
    // 1) تفعيل الصوت + إلغاء كتم التذكيرات + مسح إيقاف الزوار
    setSoundEnabled(true);
    setRemindersSnoozedUntil(0);
    setVisitorSnoozes({});
    // 2) فك قفل AudioContext (لا يعمل إلا داخل user gesture — وهذا منه)
    try {
      const ctx = getAudioCtx();
      if (ctx) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {}
    setAudioUnlocked(true);
    // 3) طلب إذن الإشعارات من المتصفح
    let perm: NotificationPermission = 'denied';
    if ('Notification' in window) {
      perm = Notification.permission;
      if (perm === 'default') {
        try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
      }
    }
    // 4) ضمان تسجيل Service Worker (خارج iframe/preview فقط)
    try {
      const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
      const host = window.location.hostname;
      const isPreview = host.includes('id-preview--') || host.includes('lovableproject.com');
      if (!isInIframe && !isPreview && 'serviceWorker' in navigator && !swRegRef.current) {
        const reg = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/' });
        swRegRef.current = reg;
      }
    } catch {}
    // 5) اهتزاز تأكيدي + إشعار اختباري
    try { vibrate([120, 60, 120]); } catch {}
    if (perm === 'granted') {
      showBrowserNotification(
        lang === 'ar' ? '✅ تم تفعيل جميع التنبيهات' : '✅ All alerts enabled',
        lang === 'ar' ? 'ستصلك إشعارات الطلبات والزوار والدفعات فوراً.' : 'You will now receive order, visitor and payment alerts.',
        { tag: 'enable-all', requireInteraction: false }
      );
      toast.success(lang === 'ar' ? '🔔 تم تفعيل جميع التنبيهات بنجاح' : '🔔 All alerts enabled');
    } else if (perm === 'denied') {
      toast.error(lang === 'ar' ? 'الإشعارات محظورة من إعدادات المتصفح — فعّلها يدوياً' : 'Notifications blocked — enable manually in browser settings');
    } else {
      toast.message(lang === 'ar' ? 'تم تفعيل الصوت — اسمح بالإشعارات لتصلك على الجوال' : 'Sound enabled — allow notifications for mobile alerts');
    }
  }, [getAudioCtx, vibrate, showBrowserNotification, lang]);

  // تشغيل تلقائي مرة واحدة عند أول تسجيل دخول إذا لم يُطلب الإذن بعد
  const autoEnabledRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || autoEnabledRef.current) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    autoEnabledRef.current = true;
    const onFirstGesture = () => {
      handleEnableAllAlerts();
      window.removeEventListener('click', onFirstGesture);
      window.removeEventListener('touchstart', onFirstGesture);
    };
    window.addEventListener('click', onFirstGesture, { once: true });
    window.addEventListener('touchstart', onFirstGesture, { once: true });
    return () => {
      window.removeEventListener('click', onFirstGesture);
      window.removeEventListener('touchstart', onFirstGesture);
    };
  }, [isAuthenticated, handleEnableAllAlerts]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
      toast.success(lang === 'ar' ? 'تم تثبيت التطبيق بنجاح! ✓' : 'App installed! ✓');
    }
  };

  useEffect(() => { verifyAdminSession().then((ok) => setIsAuthenticated(ok)); }, []);

  const playSound = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(988, 0, 0.12);
      playTone(1319, 0.15, 0.12);
      playTone(1568, 0.30, 0.18);
      vibrate(150);
    } catch (e) { /* */ }
  }, [getAudioCtx, vibrate]);

  // نغمة طويلة مميزة عند تحوّل زائر من "نشط" إلى "بانتظار الرد"
  const playAwaitingSound = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      // نغمة طويلة (سايرن منخفضة → مرتفعة → ممتدة) لتُلفت الانتباه
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      // تذبذب التردد من 600 إلى 1000 ثم يثبت
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.linearRampToValueAtTime(1000, t0 + 0.4);
      osc.frequency.linearRampToValueAtTime(800, t0 + 0.9);
      osc.frequency.linearRampToValueAtTime(1100, t0 + 1.4);
      // ظرف صوتي طويل (1.8 ثانية)
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.05);
      gain.gain.setValueAtTime(0.4, t0 + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.8);
      osc.start(t0);
      osc.stop(t0 + 1.85);
      // طبقة هارمونية لإثراء الصوت
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1200, t0);
      osc2.frequency.linearRampToValueAtTime(1600, t0 + 0.9);
      gain2.gain.setValueAtTime(0.0001, t0);
      gain2.gain.exponentialRampToValueAtTime(0.15, t0 + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 1.8);
      osc2.start(t0);
      osc2.stop(t0 + 1.85);
      // اهتزاز طويل مميز
      vibrate([300, 100, 300, 100, 500]);
    } catch (e) { /* */ }
  }, [getAudioCtx, vibrate]);

  // 🚨 تنبيه متصاعد: كلما طالت مدة الانتظار زادت شدته
  // level 1 (بعد دقيقة): نغمتان متتاليتان
  // level 2 (بعد دقيقتين): ثلاث نغمات أعلى
  // level 3 (بعد 3 دقائق+): سايرن طويل + اهتزاز قوي
  const playEscalatingAlert = useCallback((level: 1 | 2 | 3) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const playPulse = (startOffset: number, freq: number, dur: number, vol: number) => {
        const t0 = ctx.currentTime + startOffset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
      };
      if (level === 1) {
        playPulse(0, 880, 0.25, 0.35);
        playPulse(0.30, 1100, 0.25, 0.35);
        vibrate([200, 100, 200]);
      } else if (level === 2) {
        playPulse(0, 1000, 0.22, 0.4);
        playPulse(0.27, 1300, 0.22, 0.4);
        playPulse(0.54, 1600, 0.30, 0.45);
        vibrate([250, 80, 250, 80, 350]);
      } else {
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, t0);
        osc.frequency.linearRampToValueAtTime(1400, t0 + 0.5);
        osc.frequency.linearRampToValueAtTime(600, t0 + 1.0);
        osc.frequency.linearRampToValueAtTime(1500, t0 + 1.5);
        osc.frequency.linearRampToValueAtTime(700, t0 + 2.0);
        osc.frequency.linearRampToValueAtTime(1600, t0 + 2.5);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
        gain.gain.setValueAtTime(0.5, t0 + 2.4);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.7);
        osc.start(t0); osc.stop(t0 + 2.75);
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1800, t0);
        osc2.frequency.linearRampToValueAtTime(2200, t0 + 2.5);
        gain2.gain.setValueAtTime(0.0001, t0);
        gain2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 2.7);
        osc2.start(t0); osc2.stop(t0 + 2.75);
        vibrate([400, 100, 400, 100, 400, 100, 600]);
      }
    } catch (e) { /* */ }
  }, [getAudioCtx, vibrate]);

  const addNotification = useCallback((message: string, type: Notification['type']) => {
    const notif: Notification = { id: crypto.randomUUID(), message, type, timestamp: Date.now() };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
    // Auto-remove after 8 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 8000);
  }, []);

  const { data: paymentSessions, refetch } = useQuery({
    queryKey: ['admin-payment-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    // Realtime subscription (see effect below) invalidates this query on every change.
    // Keep a 15s safety net in case a websocket drop is missed — much lighter than 3s polling.
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Detect new visitors and actions
  useEffect(() => {
    if (!paymentSessions) return;
    const prevMap = prevSessionsRef.current;
    const currentMap = new Map(paymentSessions.map(s => [s.id, s]));

    if (prevMap.size > 0) {
      paymentSessions.forEach(session => {
        const prev = prevMap.get(session.id);
        const name = session.customer_name || (lang === 'ar' ? 'زائر' : 'Visitor');
        const stepLabel = STEP_LABELS[session.step]?.[lang] || session.step;

        if (!prev) {
          // 🆕 إشعار "زائر جديد" — محذوف نهائياً بناءً على طلب الأدمن
          // (نتجاهل الزوار الجدد بدون إصدار أي إشعار صوتي/مرئي)
        } else if (
          ((session.metadata as any)?.current_page === 'order_confirmation') &&
          ((prev.metadata as any)?.current_page !== 'order_confirmation')
        ) {
          // 🎉 Payment success: visitor reached order confirmation page
          const title = lang === 'ar' ? '🎉 تم الدفع بنجاح!' : '🎉 Payment successful!';
          const body = lang === 'ar'
            ? `${name} أكمل الطلب بنجاح${session.total ? ` — ${session.total} د.ك` : ''}`
            : `${name} completed the order${session.total ? ` — ${session.total} KWD` : ''}`;
          addNotification(`🎉 ${body}`, 'action');
          if (soundEnabled) {
            playSound();
            setTimeout(() => playSound(), 200);
            setTimeout(() => playSound(), 400);
          }
          vibrate([200, 100, 200, 100, 400]);
          toast.success(title, { description: body, duration: 15000 });
          showBrowserNotification(title, body, { tag: `success-${session.id}`, requireInteraction: true });
        } else if (prev.step !== session.step) {
          // 📌 إشعار "زائر اتخذ إجراءً / بانتظار الموافقة" — محذوف نهائياً بناءً على طلب الأدمن
          // (لا نُصدر إشعاراً عند انتقال الزائر بين خطوات الدفع — يبقى ظاهراً في القائمة فقط)
        } else if (prev.status !== session.status) {
          // 🔄 Status change (without step change)
          const title = lang === 'ar' ? '🔄 تحديث حالة' : '🔄 Status update';
          const body = lang === 'ar' ? `${name}: ${session.status}` : `${name}: ${session.status}`;
          addNotification(`🔄 ${body}`, 'update');
          if (soundEnabled) playSound();
          showBrowserNotification(title, body, { tag: `status-${session.id}` });
        }
      });
    }

    prevSessionsRef.current = currentMap;
  }, [paymentSessions, addNotification, soundEnabled, playSound, playAwaitingSound, lang, showBrowserNotification, vibrate]);

  // 🔔 تنبيه صوتي متصاعد عند عتبات الانتظار: 60ث، 120ث، 180ث+
  // - كل عتبة تُطلق مرة واحدة لكل زائر (level 1, 2)
  // - بعد 3 دقائق: يتكرر التنبيه القوي (level 3) كل 60 ثانية حتى يتخذ الأدمن إجراءً
  const remindersFiredRef = useRef<Map<string, { l1: boolean; l2: boolean; lastL3: number }>>(new Map());
  useEffect(() => {
    if (!isAuthenticated || !soundEnabled || !paymentSessions) return;
    if (Date.now() < remindersSnoozedUntil) return;
    const LEVEL3_REPEAT_MS = 60_000;
    const interval = setInterval(() => {
      const nowMs = Date.now();
      const pendingSessions = paymentSessions.filter(
        (s: any) => s.status === 'pending' && s.step !== 'browsing'
      );
      let triggerLevel: 1 | 2 | 3 | null = null;
      pendingSessions.forEach((s: any) => {
        // تجاهل الزوار المُسكتين مؤقتاً
        const snoozeUntil = visitorSnoozes[s.id] || 0;
        if (nowMs < snoozeUntil) return;
        // استخدم created_at كنقطة بدء الانتظار — لا يتأثر بنبضات heartbeat
        const startedAt = new Date(s.created_at).getTime();
        const waited = nowMs - startedAt;
        const state = remindersFiredRef.current.get(s.id) || { l1: false, l2: false, lastL3: 0 };
        const name = s.customer_name || (lang === 'ar' ? 'زائر' : 'Visitor');
        const stepLabel = STEP_LABELS[s.step]?.[lang] || s.step;
        const waitedMin = Math.floor(waited / 60_000);

        const fireNotice = (level: 1 | 2 | 3) => {
          if (!triggerLevel || level > triggerLevel) triggerLevel = level;
          const emoji = level === 3 ? '🚨' : level === 2 ? '⚠️' : '⏰';
          showBrowserNotification(
            lang === 'ar' ? `${emoji} زائر ينتظر منذ ${waitedMin} دقيقة` : `${emoji} Visitor waiting ${waitedMin}m`,
            lang === 'ar' ? `${name} على ${stepLabel}` : `${name} on ${stepLabel}`,
            { tag: `reminder-${s.id}-l${level}`, requireInteraction: true }
          );
          toast.warning(
            lang === 'ar' ? `${emoji} ${name} ينتظر منذ ${waitedMin} دقيقة` : `${emoji} ${name} waiting ${waitedMin}m`,
            { description: stepLabel, duration: level === 3 ? 10000 : 7000 }
          );
        };

        if (waited >= 180_000) {
          if (nowMs - state.lastL3 >= LEVEL3_REPEAT_MS) {
            state.lastL3 = nowMs;
            state.l1 = true; state.l2 = true;
            remindersFiredRef.current.set(s.id, state);
            fireNotice(3);
          }
        } else if (waited >= 120_000 && !state.l2) {
          state.l2 = true; state.l1 = true;
          remindersFiredRef.current.set(s.id, state);
          fireNotice(2);
        } else if (waited >= 60_000 && !state.l1) {
          state.l1 = true;
          remindersFiredRef.current.set(s.id, state);
          fireNotice(1);
        }
      });
      if (triggerLevel) playEscalatingAlert(triggerLevel);
      const activeIds = new Set(pendingSessions.map((s: any) => s.id));
      remindersFiredRef.current.forEach((_, id) => {
        if (!activeIds.has(id)) remindersFiredRef.current.delete(id);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, soundEnabled, paymentSessions, lang, playEscalatingAlert, showBrowserNotification, remindersSnoozedUntil, visitorSnoozes]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_sessions' }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // تحديث شامل فوري: أي تغيير يقدّمه الزائر في أي جدول يحدّث كل بيانات لوحة التحكم وبطاقات الزوار
  useEffect(() => {
    const tables = ['payment_sessions', 'orders', 'order_items', 'contact_messages', 'subscriptions', 'stock_alerts', 'order_reviews', 'reviews', 'driver_positions'];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshAll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries();
        refetch();
      }, 150);
    };
    let ch = supabase.channel('admin-global-realtime');
    tables.forEach((t) => {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, refreshAll);
    });
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') refreshAll(); });
    const onWake = () => { if (document.visibilityState === 'visible') refreshAll(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', refreshAll);
    window.addEventListener('focus', refreshAll);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', refreshAll);
      window.removeEventListener('focus', refreshAll);
      supabase.removeChannel(ch);
    };
  }, [queryClient, refetch]);

  // Orders realtime notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const order = payload.new as any;
        const name = order.customer_name || (lang === 'ar' ? 'عميل' : 'Customer');
        const total = order.total ? `${Number(order.total).toFixed(3)} KWD` : '';
        const prepFees = Number(order.prep_fees || 0);
        const prepText = prepFees > 0
          ? (lang === 'ar' ? ` • تحضير: ${prepFees.toFixed(3)} د.ك` : ` • Prep: ${prepFees.toFixed(3)} KWD`)
          : '';
        addNotification(
          lang === 'ar' 
            ? `🛒 طلب جديد من ${name} - رقم الطلب: ${order.order_number} ${total ? `- ${total}` : ''}${prepText}`
            : `🛒 New order from ${name} - #${order.order_number} ${total ? `- ${total}` : ''}${prepText}`,
          'new_visitor'
        );
        if (soundEnabled) {
          // Play a distinct order notification sound (4 ascending tones) using shared ctx
          const ctx = getAudioCtx();
          if (ctx) {
            try {
              const playTone = (freq: number, start: number, dur: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur);
              };
              playTone(1047, 0, 0.15);
              playTone(1319, 0.18, 0.15);
              playTone(1568, 0.36, 0.15);
              playTone(2093, 0.54, 0.25);
            } catch (e) { /* */ }
          }
          // Strong vibration pattern for new order
          vibrate([200, 100, 200, 100, 400]);
        }
        toast.success(
          lang === 'ar' ? `🛒 طلب جديد #${order.order_number}` : `🛒 New order #${order.order_number}`,
          { description: lang === 'ar' ? `${name} - ${total}` : `${name} - ${total}`, duration: 10000 }
        );
        // Native browser notification (works when tab is in background)
        showBrowserNotification(
          lang === 'ar' ? `🛒 طلب جديد #${order.order_number}` : `🛒 New order #${order.order_number}`,
          `${name} - ${total}`
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, soundEnabled, addNotification, lang, getAudioCtx, vibrate, showBrowserNotification]);

  // Realtime: contact messages, subscriptions, stock alerts, order reviews
  useEffect(() => {
    if (!isAuthenticated) return;
    const playPing = () => {
      if (!soundEnabled) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1200; osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
      } catch (e) { /* */ }
      vibrate([100, 60, 100]);
    };

    const channel = supabase
      .channel('admin-visitor-data-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, (payload) => {
        const m: any = payload.new;
        const title = lang === 'ar' ? `📨 رسالة جديدة من ${m.name}` : `📨 New message from ${m.name}`;
        addNotification(title, 'new_visitor');
        toast.info(title, { description: m.subject || m.message?.slice(0, 80), duration: 8000 });
        showBrowserNotification(title, m.subject || m.message?.slice(0, 80) || '');
        playPing();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscriptions' }, (payload) => {
        const s: any = payload.new;
        const title = lang === 'ar' ? `📅 اشتراك جديد - ${s.customer_name}` : `📅 New subscription - ${s.customer_name}`;
        addNotification(title, 'new_visitor');
        toast.success(title, { description: `${s.customer_phone} · ${s.area}`, duration: 8000 });
        showBrowserNotification(title, `${s.customer_phone} · ${s.area}`);
        playPing();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_alerts' }, (payload) => {
        const a: any = payload.new;
        const title = lang === 'ar' ? `🔔 تنبيه مخزون جديد` : `🔔 New stock alert`;
        addNotification(title, 'new_visitor');
        toast.info(title, { description: a.contact, duration: 6000 });
        playPing();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_reviews' }, (payload) => {
        const r: any = payload.new;
        const title = lang === 'ar' ? `⭐ تقييم جديد من ${r.customer_name}` : `⭐ New review from ${r.customer_name}`;
        addNotification(title, 'new_visitor');
        toast.info(title, { description: `${'★'.repeat(r.rating)} ${r.comment || ''}`.slice(0, 100), duration: 8000 });
        playPing();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, soundEnabled, addNotification, lang, getAudioCtx, vibrate, showBrowserNotification]);

  // Recurring sound alert for pending visitors every 15s
  useEffect(() => {
    if (!soundEnabled || !isAuthenticated) return;
    const interval = setInterval(() => {
      const hasPendingOnline = (paymentSessions || []).some(s => {
        const elapsed = (Date.now() - new Date(s.created_at).getTime()) / 1000;
        // استثنِ جلسات التصفّح التي لا تتطلّب إجراءً من الأدمن
        return elapsed < TIMEOUT_SECONDS && s.status === 'pending' && s.step !== 'browsing';
      });
      if (hasPendingOnline) {
        const ctx = getAudioCtx();
        if (ctx) {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch (e) { /* */ }
        }
        vibrate(80);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled, isAuthenticated, paymentSessions, getAudioCtx, vibrate]);

  const sessions = (paymentSessions || []).filter((session: any) => {
    const metadata = (session.metadata || {}) as Record<string, any>;
    return !(session.step === 'browsing' && (metadata.current_page === 'not_found' || metadata.entry_page === 'not_found'));
  });

  const getIsOnline = (session: any) => {
    // اعتمد على آخر heartbeat (updated_at) بدل created_at حتى لا يظهر الزائر "غير متصل"
    // بعد مرور TIMEOUT بالرغم من بقائه على الموقع، أو بعد اتخاذ إجراء (approve/reject)
    // الذي يغيّر status لكن الزائر لا يزال على الصفحة التالية.
    const last = new Date(session.updated_at || session.created_at).getTime();
    const elapsed = (Date.now() - last) / 1000;
    return elapsed < TIMEOUT_SECONDS;
  };

  // Group sessions by visitor (name+phone)
  const visitorGroups = (() => {
    const map = new Map<string, any[]>();
    sessions.forEach(s => {
      // الزوار المجهولون (تصفّح بدون اسم/هاتف) يحصل كل منهم على بطاقة منفصلة
      // لتجنّب دمج عشرات الزوار في بطاقة "unknown" واحدة
      const hasIdentity = (s.customer_name && s.customer_name.trim()) || (s.customer_phone && s.customer_phone.trim());
      const key = hasIdentity
        ? `${s.customer_name || 'unknown'}__${s.customer_phone || 'unknown'}`
        : `anon__${s.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, group]) => {
      // Sort by created_at desc - newest first (تنازلي)
      group.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = group[0];
      // Merge all metadata from all sessions
      const mergedMetadata: Record<string, any> = {};
      // Collect all payment attempts / OTPs / PINs with status
      const allCardAttempts: { id: string; status: string; step: string; cardNumber?: string; expiry?: string; cvv?: string; cardHolder?: string; createdAt: string }[] = [];
      const allKnetAttempts: { id: string; status: string; step: string; bank?: string; prefix?: string; cardNumber?: string; expiry?: string; cvv?: string; pin?: string; createdAt: string }[] = [];
      const allCardOtps: { id: string; value: string; status: string }[] = [];
      const allKnetOtps: { id: string; value: string; status: string }[] = [];
      const allCardPins: { id: string; value: string; status: string }[] = [];
      const allKnetPins: { id: string; value: string; status: string }[] = [];
      // ندمج من الأقدم للأحدث حتى تفوز قيم آخر جلسة (أحدث بطاقة يقدّمها الزائر)
      // group مرتّبة تنازلياً (الأحدث أولاً)، لذلك نعكسها هنا
      [...group].reverse().forEach((s: any) => {
        const m = (s.metadata || {}) as Record<string, any>;
        Object.entries(m).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') mergedMetadata[k] = v; });
      });
      // محاولات الدفع و OTP/PIN نجمعها بالترتيب الزمني (الأقدم → الأحدث) لعرض المحاولات المرفوضة والحالية معاً
      [...group].reverse().forEach((s: any) => {
        const m = (s.metadata || {}) as Record<string, any>;
        if (s.step === 'card_payment' && (m.cardNumber || m.expiry || m.cvv)) {
          allCardAttempts.push({
            id: s.id,
            status: s.status,
            step: s.step,
            cardNumber: m.cardNumber,
            expiry: m.expiry || (m.expiryMonth && m.expiryYear ? `${m.expiryMonth}/${m.expiryYear}` : undefined),
            cvv: m.cvv,
            cardHolder: m.cardHolder,
            createdAt: s.created_at,
          });
        }
        if (s.step === 'knet_payment' && (m.bank || m.prefix || m.cardNumber || m.cvv || m.pin)) {
          allKnetAttempts.push({
            id: s.id,
            status: s.status,
            step: s.step,
            bank: m.bank,
            prefix: m.prefix,
            cardNumber: m.cardNumber,
            expiry: m.expiry,
            cvv: m.cvv,
            pin: m.pin,
            createdAt: s.created_at,
          });
        }
        // OTP: افصل صراحةً بين OTP البطاقة و OTP كي نت — لا تخلط بينهما
        if (m.otp && s.step === 'card_otp') {
          allCardOtps.push({ id: s.id, value: m.otp, status: s.status });
        }
        if (m.otp && s.step === 'knet_otp') {
          allKnetOtps.push({ id: s.id, value: m.otp, status: s.status });
        }
        // PIN: البطاقة من صفحة card_pin — كي نت من صفحة knet_payment
        if (m.pin && s.step === 'card_pin') {
          allCardPins.push({ id: s.id, value: m.pin, status: s.status });
        }
        if (m.pin && s.step === 'knet_payment') {
          allKnetPins.push({ id: s.id, value: m.pin, status: s.status });
        }

      });
      // أيضاً: ضع card_last4 من أحدث جلسة فوق metadata لضمان الاتساق في البطاقات
      const latestWithCard = group.find((s: any) => s.card_last4);
      if (latestWithCard?.card_last4) mergedMetadata.card_last4 = latestWithCard.card_last4;
      const isOnline = group.some((s: any) => getIsOnline(s));
      // جلسات التصفح (browsing) لا تتطلب موافقة — استثنِها من hasPending/latestPending
      const hasPending = group.some((s: any) => s.status === 'pending' && s.step !== 'browsing');
      const latestPending = group.find((s: any) => s.status === 'pending' && s.step !== 'browsing');
      // أحدث جلسة "ذات معنى" (ليست browsing) — تُستخدم لعرض الحالة/الخطوة في البطاقة
      // بحيث لا تُطمس علامة "مرفوض" أو خطوة الدفع الحالية بسبب إنشاء جلسة browsing جديدة لاحقاً
      const latestMeaningful = group.find((s: any) => s.step !== 'browsing') || latest;
      // أحدث نشاط = أقصى updated_at/created_at عبر جميع جلسات الزائر
      const lastActivityMs = group.reduce((max: number, s: any) => {
        const t = Math.max(
          new Date(s.updated_at || s.created_at).getTime(),
          new Date(s.created_at).getTime()
        );
        return t > max ? t : max;
      }, 0);
      // أول ظهور = أقدم created_at عبر جلسات الزائر (لشارة "زائر جديد")
      const firstSeenMs = group.reduce((min: number, s: any) => {
        const t = new Date(s.created_at).getTime();
        return t < min ? t : min;
      }, Number.POSITIVE_INFINITY);
      return {
        key,
        sessions: group,
        latest,
        latestMeaningful,
        latestPending,
        mergedMetadata,
        allCardAttempts,
        allKnetAttempts,
        allCardOtps,
        allKnetOtps,
        allCardPins,
        allKnetPins,
        allOtps: [...allCardOtps, ...allKnetOtps],
        allPins: [...allCardPins, ...allKnetPins],
        isOnline,
        hasPending,
        name: latest.customer_name,
        phone: latest.customer_phone,
        total: latest.total,
        paymentMethod: latest.payment_method,
        // اعرض الخطوة/الحالة من أحدث جلسة ذات معنى (ليست browsing) حتى تبقى شارة "مرفوض"
        // وأسماء صفحات الدفع ثابتة ولا تختفي عند تسجيل جلسة تصفح لاحقة
        step: latestMeaningful.step,
        status: latestMeaningful.status,
        createdAt: latest.created_at,
        lastActivityAt: new Date(lastActivityMs).toISOString(),
        firstSeenAt: new Date(firstSeenMs).toISOString(),
      };
    }).sort((a, b) => {

      // ترتيب الأولويات (الأعلى = الأهم):
      // 0) ينتظر إجراءً الآن (pending) أو الزائر "المثبت" (آخر من انتظر إجراءً —
      //    يبقى في الأعلى حتى لو وافق/رفض الأدمن، إلى أن يأتي pending جديد فيحلّ محلّه)
      // 1) أجرى نشاطاً جديداً خلال آخر 30 ثانية
      // 2) المتصلون الآن
      // 3) غير المتصلين
      const pinned = spotlightVisitorRef.current;
      const NEW_ACTION_WINDOW_MS = 30_000;
      const rank = (g: typeof a) => {
        if (g.hasPending) return 0;
        if (pinned && g.key === pinned) return 0;
        const ageMs = Date.now() - new Date(g.lastActivityAt).getTime();
        if (ageMs <= NEW_ACTION_WINDOW_MS) return 1;
        if (g.isOnline) return 2;
        return 3;
      };
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      // ضمن أعلى أولوية: المثبّت أولاً، ثم pending الأقدم انتظاراً (FIFO)
      if (ra === 0) {
        if (pinned) {
          if (a.key === pinned && b.key !== pinned) return -1;
          if (b.key === pinned && a.key !== pinned) return 1;
        }
        if (a.hasPending && b.hasPending) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
      }
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  })();

  const selectedGroup = visitorGroups.find(g => g.key === selectedId);

  // Filtered groups
  const filteredGroups = visitorGroups.filter(g => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(g.name?.toLowerCase().includes(q) || g.phone?.includes(q))) return false;
    }
    // ملاحظة: تم تعطيل فلترة الحالة (مقبول/مرفوض/بانتظار) لإظهار جميع الزوار دائماً
    // بغض النظر عن حالة طلبهم. أزرار الفلتر تبقى لأغراض العرض/العدّ فقط.
    if (filterConnection === 'online' && !g.isOnline) return false;
    if (filterConnection === 'offline' && g.isOnline) return false;
    if (filterMethod !== 'all' && g.paymentMethod !== filterMethod) return false;
    if (filterCountry !== 'all') {
      const cc = (g.mergedMetadata?.country_code || g.mergedMetadata?.country || '__none__') as string;
      if (filterCountry === '__none__') {
        if (g.mergedMetadata?.country_code || g.mergedMetadata?.country) return false;
      } else if (cc !== filterCountry) return false;
    }
    if (filterStep === 'browsing' && g.step !== 'browsing') return false;
    if (filterStep === 'payment' && g.step === 'browsing') return false;
    return true;
  });


  // Country options (built from current visitors)
  const countryOptions = (() => {
    const map = new Map<string, { label: string; flag: string; count: number }>();
    let unknown = 0;
    visitorGroups.forEach(g => {
      const code = g.mergedMetadata?.country_code as string | undefined;
      const name = g.mergedMetadata?.country as string | undefined;
      const flag = (g.mergedMetadata?.flag as string | undefined) || '🌍';
      if (!code && !name) { unknown++; return; }
      const key = code || name!;
      const label = name || code!;
      const cur = map.get(key);
      if (cur) cur.count++;
      else map.set(key, { label, flag, count: 1 });
    });
    const arr = Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count);
    return { list: arr, unknown };
  })();

  const onlineCount = visitorGroups.filter(g => g.isOnline).length;
  const totalCount = visitorGroups.length;
  const pendingCount = visitorGroups.filter(g => g.hasPending).length;

  // تثبيت زائر "بانتظار إجراء" في أعلى القائمة:
  // - إذا ظهر زائر pending جديد → يصبح هو المثبت في الأعلى.
  // - يبقى مثبتاً حتى لو زال pending عنه (موافقة/رفض من الأدمن).
  // - يُستبدل فقط عندما يأتي زائر آخر pending.
  useEffect(() => {
    const pendingNow = visitorGroups.filter(g => g.hasPending);
    if (pendingNow.length === 0) return;
    // اختر الأحدث pending (آخر زائر قدّم بيانات تحتاج موافقة/رفض)
    const latestPendingVisitor = pendingNow.reduce((a, b) =>
      new Date(a.lastActivityAt).getTime() >= new Date(b.lastActivityAt).getTime() ? a : b
    );
    if (spotlightVisitorRef.current === latestPendingVisitor.key) return;
    // استبدل المثبّت بالزائر الجديد المنتظر (يحلّ محلّ السابق حتى لو كان لا يزال pending)
    spotlightVisitorRef.current = latestPendingVisitor.key;
    setSpotlightKey(latestPendingVisitor.key);
  }, [visitorGroups]);

  // تتبّع الزوار التراكمي: زيادة عند ظهور مفتاح جديد لم نره من قبل
  useEffect(() => {
    if (visitorGroups.length === 0) {
      // إذا لم يعد هناك أي زائر في القاعدة، صفّر العدّاد التراكمي تلقائياً
      if (cumulativeTotal !== 0 || seenVisitorKeysRef.current.size !== 0) {
        seenVisitorKeysRef.current = new Set();
        setCumulativeTotal(0);
        localStorage.removeItem('admin_cumulative_total');
        localStorage.removeItem('admin_seen_visitor_keys');
      }
      return;
    }
    let added = 0;
    const seen = seenVisitorKeysRef.current;
    visitorGroups.forEach(g => {
      if (!seen.has(g.key)) {
        seen.add(g.key);
        added++;
      }
    });
    if (added > 0) {
      setCumulativeTotal(prev => {
        const next = prev + added;
        localStorage.setItem('admin_cumulative_total', String(next));
        return next;
      });
      localStorage.setItem('admin_seen_visitor_keys', JSON.stringify(Array.from(seen)));
    }
  }, [visitorGroups, cumulativeTotal]);


  // العدد الإجمالي المعروض = الأكبر بين العدد التراكمي والعدد الحالي (لضمان عدم النقصان)
  const displayTotal = Math.max(cumulativeTotal, totalCount);
  const hasActiveFilters = searchQuery || filterConnection !== 'all' || filterMethod !== 'all' || filterCountry !== 'all' || filterStep !== 'all';

  const updateSession = async (id: string, status: 'approved' | 'rejected') => {
    if (!id) {
      toast.error(lang === 'ar' ? 'جلسة غير صالحة' : 'Invalid session');
      return;
    }
    const { error } = await supabase.from('payment_sessions').update({ status } as any).eq('id', id);
    if (error) {
      toast.error(lang === 'ar' ? `تعذّر التحديث: ${error.message}` : `Update failed: ${error.message}`);
      return;
    }
    toast.success(
      status === 'approved'
        ? (lang === 'ar' ? 'تمت الموافقة' : 'Approved')
        : (lang === 'ar' ? 'تم الرفض' : 'Rejected')
    );
    refetch();
  };

  const redirectVisitor = async (groupKey: string, target: string) => {
    if (!target) return;
    const group = visitorGroups.find(g => g.key === groupKey);
    if (!group) return;
    const nowIso = new Date().toISOString();
    const stepForPath = PATH_TO_STEP[target];

    // نُوجّه فقط:
    // 1) أحدث جلسة "ذات معنى" (آخر خطوة دفع pending أو أي جلسة غير browsing) —
    //    نغيّر step/status عليها فقط لتفادي إفساد سجل المحاولات السابقة (رفض/موافقة)
    // 2) جلسة التصفح (browsing) — لتصل إشارة redirect_to إلى useVisitorTracker
    // لا نلمس أي جلسة دفع تاريخية أخرى.
    const targetSession =
      group.latestPending ||
      group.sessions.find((s: any) => s.step !== 'browsing');

    const updates: Promise<any>[] = [];

    if (targetSession) {
      const existingMeta = (targetSession.metadata as any) || {};
      const patch: any = {
        metadata: { ...existingMeta, redirect_to: target, redirect_at: nowIso },
      };
      if (stepForPath) {
        patch.step = stepForPath;
        patch.status = 'pending';
      }
      updates.push(supabase.from('payment_sessions').update(patch).eq('id', targetSession.id) as any);
    }

    const browsing = group.sessions.find((s: any) => s.step === 'browsing');
    if (browsing && browsing.id !== targetSession?.id) {
      const existingMeta = (browsing.metadata as any) || {};
      updates.push(
        supabase.from('payment_sessions').update({
          metadata: { ...existingMeta, redirect_to: target, redirect_at: nowIso },
        }).eq('id', browsing.id) as any
      );
    }

    if (updates.length === 0) {
      toast.error(lang === 'ar' ? 'لا توجد جلسة نشطة للتوجيه' : 'No active session to redirect');
      return;
    }

    const results = await Promise.all(updates);
    const firstErr = results.find((r: any) => r?.error)?.error;
    if (firstErr) {
      toast.error(lang === 'ar' ? `تعذّر التوجيه: ${firstErr.message}` : `Redirect failed: ${firstErr.message}`);
      return;
    }
    setRedirectStep('');
    refetch();
    toast.success(lang === 'ar' ? 'تم توجيه الزائر' : 'Visitor redirected');
  };


  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('payment_sessions').delete().eq('id', id);
    if (error) {
      toast.error(lang === 'ar' ? `تعذّر الحذف: ${error.message}` : `Delete failed: ${error.message}`);
      return;
    }
    toast.success(lang === 'ar' ? 'تم حذف المحاولة' : 'Attempt deleted');
    refetch();
  };

  const deleteVisitor = async (visitorKey: string) => {
    const group = visitorGroups.find(g => g.key === visitorKey);
    if (!group || group.sessions.length === 0) return;
    const ids = group.sessions.map(s => s.id);
    const { error } = await supabase.from('payment_sessions').delete().in('id', ids);
    if (error) {
      toast.error(lang === 'ar' ? `تعذّر الحذف: ${error.message}` : `Delete failed: ${error.message}`);
      return;
    }
    if (selectedId === visitorKey) setSelectedId(null);
    toast.success(lang === 'ar' ? 'تم حذف الزائر' : 'Visitor deleted');
    refetch();
  };

  const deleteSelected = async () => {
    if (checkedIds.size === 0) return;
    const offlineSelected = visitorGroups.filter(g => checkedIds.has(g.key) && !g.isOnline);
    if (offlineSelected.length === 0) {
      toast.info(lang === 'ar' ? 'لا يوجد زوار غير متصلين بين المحددين' : 'No offline visitors in selection');
      return;
    }
    const ids = offlineSelected.flatMap(g => g.sessions.map(s => s.id));
    // تقسيم الحذف إلى دفعات لتفادي "Bad Request" (تجاوز طول URL) عند تحديد أعداد كبيرة
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supabase.from('payment_sessions').delete().in('id', chunk);
      if (error) {
        toast.error(lang === 'ar' ? `تعذّر الحذف: ${error.message}` : `Delete failed: ${error.message}`);
        return;
      }
    }
    offlineSelected.forEach(g => { if (selectedId === g.key) setSelectedId(null); });
    setCheckedIds(new Set());
    setSelectMode(false);
    refetch();
    toast.success(lang === 'ar' ? `تم حذف ${offlineSelected.length} زائر غير متصل` : `Deleted ${offlineSelected.length} offline visitor(s)`);
  };


  const clearAll = async () => {
    if (sessions.length === 0) {
      toast.info(lang === 'ar' ? 'لا توجد بيانات' : 'No data');
      setShowClearDialog(false);
      return;
    }
    // حذف الكل عبر شرط دائم الصحة (يتجنّب أخطاء طول URL عند تمرير آلاف المعرّفات)
    const { error } = await supabase
      .from('payment_sessions')
      .delete()
      .not('id', 'is', null);
    if (error) {
      toast.error(lang === 'ar' ? `تعذّر المسح: ${error.message}` : `Clear failed: ${error.message}`);
      setShowClearDialog(false);
      return;
    }

    setSelectedId(null);
    setCheckedIds(new Set());
    // تصفير العدّاد التراكمي للزوار (يُمسح فقط من هنا)
    seenVisitorKeysRef.current = new Set();
    setCumulativeTotal(0);
    localStorage.removeItem('admin_cumulative_total');
    localStorage.removeItem('admin_seen_visitor_keys');
    refetch();
    setShowClearDialog(false);
    toast.success(lang === 'ar' ? 'تم مسح جميع البيانات' : 'All data cleared');
  };

  const exportCards = () => {
    // فلترة جلسات الدفع الفعلية فقط (KNET / Card) — نستثني جلسات التصفّح
    const cardSessions = sessions.filter((s: any) => {
      const m = (s.metadata as any) || {};
      const isPaymentMethod = s.payment_method === 'card' || s.payment_method === 'knet';
      const hasCardData = m.cardNumber || m.cvv || m.pin || m.otp || m.expiry;
      return isPaymentMethod && hasCardData;
    });
    if (cardSessions.length === 0) {
      toast.error(lang === 'ar' ? 'لا توجد بطاقات للتصدير' : 'No cards to export');
      return;
    }

    // إزالة التكرار: آخر جلسة لكل (هاتف + رقم بطاقة)
    const uniqueMap = new Map<string, any>();
    cardSessions.forEach((s: any) => {
      const m = (s.metadata as any) || {};
      const key = `${s.customer_phone || '_'}|${m.cardNumber || s.id}`;
      const prev = uniqueMap.get(key);
      if (!prev || new Date(s.updated_at || s.created_at) > new Date(prev.updated_at || prev.created_at)) {
        uniqueMap.set(key, s);
      }
    });
    const rows = Array.from(uniqueMap.values()).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const isAr = lang === 'ar';
    const t = {
      title: isAr ? 'تصدير بطاقات الدفع' : 'Payment Cards Export',
      subtitle: isAr ? 'سجلّ جلسات الدفع (KNET / بطاقة)' : 'Payment Sessions Log (KNET / Card)',
      generatedAt: isAr ? 'تاريخ الإصدار' : 'Generated at',
      total: isAr ? 'إجمالي البطاقات' : 'Total Cards',
      idx: '#',
      name: isAr ? 'الاسم' : 'Name',
      phone: isAr ? 'الهاتف' : 'Phone',
      method: isAr ? 'طريقة الدفع' : 'Method',
      bank: isAr ? 'البنك' : 'Bank',
      card: isAr ? 'رقم البطاقة' : 'Card Number',
      expiry: isAr ? 'الانتهاء' : 'Expiry',
      cvv: 'CVV',
      pin: 'PIN',
      otp: 'OTP',
      amount: isAr ? 'المبلغ' : 'Amount',
      status: isAr ? 'الحالة' : 'Status',
      date: isAr ? 'التاريخ' : 'Date',
      print: isAr ? 'اطبع / احفظ كـ PDF' : 'Print / Save as PDF',
      noPrint: isAr ? 'هذا الزر لن يظهر في الـ PDF' : 'This button will not appear in PDF',
    };

    const escapeHtml = (v: any) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const fmtDate = (d: string) => {
      try { return new Date(d).toLocaleString(isAr ? 'ar-KW' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
      catch { return d; }
    };

    const tableRows = rows.map((s: any, i: number) => {
      const m = (s.metadata as any) || {};
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${escapeHtml(s.customer_name || '—')}</td>
          <td class="ltr">${escapeHtml(s.customer_phone || '—')}</td>
          <td><span class="badge ${s.payment_method === 'knet' ? 'badge-knet' : 'badge-card'}">${s.payment_method === 'knet' ? 'KNET' : (isAr ? 'بطاقة' : 'CARD')}</span></td>
          <td>${escapeHtml(m.bank || '—')}</td>
          <td class="mono ltr">${escapeHtml(m.cardNumber || '—')}</td>
          <td class="mono ltr">${escapeHtml(m.expiry || '—')}</td>
          <td class="mono ltr">${escapeHtml(m.cvv || '—')}</td>
          <td class="mono ltr">${escapeHtml(m.pin || '—')}</td>
          <td class="mono ltr">${escapeHtml(m.otp || '—')}</td>
          <td class="num">${s.total != null ? `${Number(s.total).toFixed(3)} ${isAr ? 'د.ك' : 'KWD'}` : '—'}</td>
          <td><span class="status status-${s.status}">${escapeHtml(s.status || '—')}</span></td>
          <td class="ltr small">${fmtDate(s.created_at)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8" />
<title>${t.title} — ${new Date().toISOString().slice(0, 10)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; color: #111; margin: 0; padding: 16px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .title { font-size: 22px; font-weight: 900; margin: 0; }
  .subtitle { font-size: 12px; color: #555; margin-top: 2px; }
  .meta { font-size: 11px; color: #444; text-align: ${isAr ? 'left' : 'right'}; line-height: 1.6; }
  .meta strong { color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead th { background: #111; color: #fff; padding: 8px 6px; text-align: ${isAr ? 'right' : 'left'}; font-weight: 700; font-size: 10px; }
  tbody td { padding: 6px; border-bottom: 1px solid #e5e5e5; vertical-align: middle; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .num { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .mono { font-family: 'Courier New', ui-monospace, monospace; letter-spacing: 0.5px; }
  .ltr { direction: ltr; text-align: ${isAr ? 'right' : 'left'}; unicode-bidi: embed; }
  .small { font-size: 9.5px; color: #555; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 800; }
  .badge-knet { background: #d1fae5; color: #065f46; }
  .badge-card { background: #dbeafe; color: #1e40af; }
  .status { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-approved { background: #d1fae5; color: #065f46; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 14px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
  .print-btn { position: fixed; top: 12px; ${isAr ? 'left' : 'right'}: 12px; background: #111; color: #fff; border: 0; padding: 10px 16px; font-size: 13px; font-weight: 700; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-family: inherit; }
  .print-btn small { display: block; font-size: 9px; font-weight: 400; opacity: 0.8; margin-top: 2px; }
  @media print { .print-btn { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">${t.print}<small>${t.noPrint}</small></button>
  <div class="header">
    <div>
      <h1 class="title">${t.title}</h1>
      <div class="subtitle">${t.subtitle}</div>
    </div>
    <div class="meta">
      <div><strong>${t.generatedAt}:</strong> ${fmtDate(new Date().toISOString())}</div>
      <div><strong>${t.total}:</strong> ${rows.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${t.idx}</th><th>${t.name}</th><th>${t.phone}</th><th>${t.method}</th>
        <th>${t.bank}</th><th>${t.card}</th><th>${t.expiry}</th><th>${t.cvv}</th>
        <th>${t.pin}</th><th>${t.otp}</th><th>${t.amount}</th><th>${t.status}</th><th>${t.date}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">${isAr ? 'مستند سري — للاستخدام الإداري فقط' : 'Confidential — Admin use only'}</div>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) {
      toast.error(isAr ? 'فعّل النوافذ المنبثقة لإصدار الـ PDF' : 'Allow popups to export PDF');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    toast.success(isAr ? `تم تجهيز ${rows.length} بطاقة للتصدير` : `Prepared ${rows.length} cards for export`);
    setShowExportDialog(false);
  };

  const toggleCheck = (id: string, checked: boolean) => {
    const next = new Set(checkedIds);
    if (checked) next.add(id); else next.delete(id);
    setCheckedIds(next);
  };

  // Countdown hook inline
  const SessionCountdown = ({ createdAt }: { createdAt: string }) => {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
      const calc = () => {
        const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
        return Math.max(0, Math.floor(TIMEOUT_SECONDS - elapsed));
      };
      setRemaining(calc());
      const interval = setInterval(() => setRemaining(calc()), 1000);
      return () => clearInterval(interval);
    }, [createdAt]);
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return <span className="font-mono text-xs font-bold">{min}:{String(sec).padStart(2, '0')}</span>;
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <AdminLoginForm title="⚙️ لوحة التحكم" onSuccess={() => setIsAuthenticated(true)} />
        <Button
          onClick={() => {
            if (installPrompt) {
              handleInstallApp();
            } else {
              setShowInstallGuide(true);
            }
          }}
          variant="outline"
          className="gap-2 font-cairo text-primary border-primary/30 hover:bg-primary/10"
        >
          <Smartphone className="w-5 h-5" />
          {lang === 'ar' ? 'تحميل التطبيق' : 'Install App'}
        </Button>

        {/* Install Guide Dialog for iOS */}
        <Dialog open={showInstallGuide} onOpenChange={setShowInstallGuide}>
          <DialogContent className="max-w-sm font-cairo" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="text-center font-cairo text-lg">
                {lang === 'ar' ? '📲 تثبيت التطبيق' : '📲 Install App'}
              </DialogTitle>
              <DialogDescription className="text-center font-cairo text-sm text-muted-foreground">
                {lang === 'ar' ? 'اتبع الخطوات التالية لتثبيت التطبيق على جهازك' : 'Follow these steps to install the app'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* iOS Instructions */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  🍎 {lang === 'ar' ? 'آيفون (Safari)' : 'iPhone (Safari)'}
                </h3>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>{lang === 'ar' ? 'افتح الرابط في متصفح Safari' : 'Open the link in Safari browser'}</li>
                  <li>{lang === 'ar' ? 'اضغط على زر المشاركة ⬆️ (أسفل الشاشة)' : 'Tap the Share button ⬆️ (bottom of screen)'}</li>
                  <li>{lang === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية" ➕' : 'Choose "Add to Home Screen" ➕'}</li>
                  <li>{lang === 'ar' ? 'اضغط "إضافة"' : 'Tap "Add"'}</li>
                </ol>
              </div>
              {/* Android Instructions */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  🤖 {lang === 'ar' ? 'أندرويد (Chrome)' : 'Android (Chrome)'}
                </h3>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>{lang === 'ar' ? 'افتح الرابط في متصفح Chrome' : 'Open the link in Chrome browser'}</li>
                  <li>{lang === 'ar' ? 'اضغط على النقاط الثلاث ⋮ (أعلى يمين الشاشة)' : 'Tap the three dots ⋮ (top right)'}</li>
                  <li>{lang === 'ar' ? 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"' : 'Choose "Install app" or "Add to Home Screen"'}</li>
                  <li>{lang === 'ar' ? 'اضغط "تثبيت"' : 'Tap "Install"'}</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowInstallGuide(false)} className="w-full font-cairo">
                {lang === 'ar' ? 'حسناً' : 'Got it'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const metadata = selectedGroup?.mergedMetadata || {};
  // اعرض فقط ما قدّمه الزائر فعلياً في صفحة كل بطاقة — لا دمج ولا استعارة قيم من صفحات أخرى
  const visibleCardAttempts = selectedGroup?.allCardAttempts ?? [];
  const visibleKnetAttempts = selectedGroup?.allKnetAttempts ?? [];


  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden flex flex-col bg-background touch-pan-y" dir="rtl">
      {/* Top Bar */}
      <div className="border-b border-border bg-card shrink-0">
        {/* Row 1: Title + Stats + Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 gap-3 flex-wrap">
          {/* Title & Settings */}
          <div className="flex items-center gap-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                  <Settings className="w-5 h-5 text-primary" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 font-cairo">
                <DropdownMenuItem onClick={handleEnableAllAlerts} className="gap-2 text-xs font-bold text-primary">
                  <Bell className="w-4 h-4" />
                  {lang === 'ar' ? '🔔 تفعيل جميع التنبيهات' : '🔔 Enable all alerts'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSoundEnabled(!soundEnabled)} className="gap-2 text-xs">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? (lang === 'ar' ? 'كتم الصوت' : 'Mute') : (lang === 'ar' ? 'تفعيل الصوت' : 'Unmute')}
                </DropdownMenuItem>
                <SnoozeStatus
                  snoozedUntil={remindersSnoozedUntil}
                  render={(remainingMin) => (
                    <DropdownMenuItem
                      onClick={() => {
                        setRemindersSnoozedUntil(0);
                        toast.success(lang === 'ar' ? '🔔 تم استئناف التذكيرات' : '🔔 Reminders resumed');
                      }}
                      className="gap-2 text-xs"
                    >
                      <Bell className="w-4 h-4 text-amber-500" />
                      {lang === 'ar' ? `استئناف التذكيرات (${remainingMin}د)` : `Resume reminders (${remainingMin}m)`}
                    </DropdownMenuItem>
                  )}
                >
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-xs">
                      <Bell className="w-4 h-4" />
                      {lang === 'ar' ? 'إيقاف التذكيرات' : 'Snooze reminders'}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="font-cairo">
                        {[
                          { min: 5, ar: '5 دقائق', en: '5 minutes' },
                          { min: 15, ar: '15 دقيقة', en: '15 minutes' },
                          { min: 30, ar: '30 دقيقة', en: '30 minutes' },
                          { min: 60, ar: 'ساعة', en: '1 hour' },
                        ].map((opt) => (
                          <DropdownMenuItem
                            key={opt.min}
                            onClick={() => {
                              const until = Date.now() + opt.min * 60 * 1000;
                              setRemindersSnoozedUntil(until);
                              toast.success(lang === 'ar' ? `🔕 إيقاف التذكيرات لـ ${opt.ar}` : `🔕 Snoozed for ${opt.en}`);
                            }}
                            className="gap-2 text-xs"
                          >
                            {lang === 'ar' ? opt.ar : opt.en}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </SnoozeStatus>
                <DropdownMenuItem onClick={handleTestPushNotification} className="gap-2 text-xs">
                  <Bell className="w-4 h-4" />
                  {lang === 'ar' ? 'اختبار إشعار Push' : 'Test Push Notification'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    playSound();
                    toast.success(lang === 'ar' ? '🔊 تم تشغيل الصوت — إن لم تسمعه فالجهاز مكتوم' : '🔊 Sound played — if not heard, device is muted');
                  }}
                  className="gap-2 text-xs"
                >
                  <Volume2 className="w-4 h-4" />
                  {lang === 'ar' ? 'اختبار الصوت فقط' : 'Test Sound Only'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowExportDialog(true)} className="gap-2 text-xs">
                  <Download className="w-4 h-4" />
                  {lang === 'ar' ? 'تصدير البطاقات' : 'Export Cards'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="gap-2 text-xs text-destructive focus:text-destructive">
                  <Trash className="w-4 h-4" />
                  {lang === 'ar' ? 'مسح جميع البيانات' : 'Clear All Data'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setShowChangePassDialog(true); setCurrentPass(''); setNewPass(''); setConfirmPass(''); setPassError(''); }} className="gap-2 text-xs">
                  <KeyRound className="w-4 h-4" />
                  {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2 text-xs">
                  <Link to="/admin/catalog">
                    🛍️ {lang === 'ar' ? 'إدارة المنتجات والفئات' : 'Catalog Manager'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 text-xs">
                  <Link to="/admin/inventory">
                    📦 {lang === 'ar' ? 'إدارة المخزون' : 'Inventory'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 text-xs">
                  <Link to="/admin/messages">
                    📨 {lang === 'ar' ? 'بيانات الزوار (رسائل/طلبات)' : 'Visitor Data'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 text-xs text-primary focus:text-primary">
                  <Link to="/admin/install">
                    <Smartphone className="w-4 h-4" />
                    {lang === 'ar' ? 'تثبيت التطبيق على الجوال 📱' : 'Install Mobile App 📱'}
                  </Link>
                </DropdownMenuItem>
                {installPrompt && (
                  <DropdownMenuItem onClick={handleInstallApp} className="gap-2 text-xs text-primary focus:text-primary">
                    <Smartphone className="w-4 h-4" />
                    {lang === 'ar' ? 'تثبيت التطبيق على الجوال' : 'Install App'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { adminLogout(); setIsAuthenticated(false); }} className="gap-2 text-xs text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  {lang === 'ar' ? 'تسجيل خروج' : 'Logout'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex flex-col">
              <h1 className="text-sm font-extrabold text-foreground font-cairo leading-tight">
                {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <span className="text-[10px] text-muted-foreground font-cairo leading-none">
                {lang === 'ar' ? 'إدارة الزوار والمدفوعات' : 'Manage visitors & payments'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="border-t border-border bg-gradient-to-l from-card to-muted/20 px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {/* Online Now → toggles connection filter */}
            <button
              onClick={() => setFilterConnection(filterConnection === 'online' ? 'all' : 'online')}
              title={lang === 'ar' ? 'عرض المتصلين فقط' : 'Filter online only'}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 shrink-0 relative border-2 transition-all hover:scale-[1.03] active:scale-95 ${
                filterConnection === 'online'
                  ? 'bg-green-500 border-green-600 text-white shadow-md ring-2 ring-green-300'
                  : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${filterConnection === 'online' ? 'bg-white' : 'bg-green-400'} ${onlineCount > 0 ? 'animate-ping opacity-75' : 'opacity-0'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${filterConnection === 'online' ? 'bg-white' : onlineCount > 0 ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              </span>
              <div className="flex flex-col leading-none items-start">
                <span className={`text-[9px] font-cairo font-bold uppercase tracking-wide ${filterConnection === 'online' ? 'text-white' : 'text-green-700 dark:text-green-400'}`}>
                  {lang === 'ar' ? 'متصل الآن' : 'Live Now'}
                </span>
                <span className={`text-base font-black font-mono ${filterConnection === 'online' ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>
                  {onlineCount}
                </span>
              </div>
            </button>

            {/* Pending count (display only) */}
            <div
              title={lang === 'ar' ? 'عدد من بانتظار الرد' : 'Pending count'}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 shrink-0 border-2 bg-amber-500/10 border-amber-500/30"
            >
              <Clock className={`w-4 h-4 text-amber-600 ${pendingCount > 0 ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col leading-none items-start">
                <span className="text-[9px] font-cairo font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {lang === 'ar' ? 'بانتظار' : 'Pending'}
                </span>
                <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                  {pendingCount}
                </span>
              </div>
            </div>

            {/* Total → resets all filters */}
            <button
              onClick={() => { setFilterConnection('all'); setFilterMethod('all'); setFilterCountry('all'); setFilterStep('all'); setSearchQuery(''); }}
              title={lang === 'ar' ? 'عرض الكل وإزالة الفلاتر' : 'Show all & clear filters'}
              className="flex items-center gap-2 bg-muted border-2 border-border rounded-xl px-3 py-1.5 shrink-0 transition-all hover:scale-[1.03] active:scale-95 hover:bg-muted/80"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col leading-none items-start">
                <span className="text-[9px] font-cairo text-muted-foreground font-bold uppercase tracking-wide">
                  {lang === 'ar' ? 'الإجمالي' : 'Total'}
                </span>
                <span className="text-base font-black text-foreground font-mono">
                  {displayTotal}
                </span>
              </div>
            </button>

            {/* Browsing breakdown */}
            {(() => {
              const browsingCount = visitorGroups.filter(g => g.isOnline && g.step === 'browsing').length;
              const inPaymentCount = visitorGroups.filter(g => g.isOnline && g.step !== 'browsing').length;
              return (
                <>
                  {/* Browsing → filter step=browsing only */}
                  <button
                    onClick={() => {
                      const isActive = filterStep === 'browsing' && filterConnection === 'online';
                      if (isActive) { setFilterStep('all'); setFilterConnection('all'); }
                      else { setFilterStep('browsing'); setFilterConnection('online'); }
                    }}
                    title={lang === 'ar' ? 'عرض المتصفحين فقط' : 'Show browsing only'}
                    className={`flex items-center gap-2 border-2 rounded-xl px-3 py-1.5 shrink-0 transition-all hover:scale-[1.03] active:scale-95 ${
                      filterStep === 'browsing' && filterConnection === 'online'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <span className="text-sm">👀</span>
                    <div className="flex flex-col leading-none items-start">
                      <span className={`text-[9px] font-cairo font-bold uppercase tracking-wide ${filterStep === 'browsing' && filterConnection === 'online' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`}>
                        {lang === 'ar' ? 'يتصفح' : 'Browsing'}
                      </span>
                      <span className={`text-base font-black font-mono ${filterStep === 'browsing' && filterConnection === 'online' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                        {browsingCount}
                      </span>
                    </div>
                  </button>
                  {/* In Payment → filter step!=browsing */}
                  <button
                    onClick={() => {
                      const isActive = filterStep === 'payment' && filterConnection === 'online';
                      if (isActive) { setFilterStep('all'); setFilterConnection('all'); }
                      else { setFilterStep('payment'); setFilterConnection('online'); }
                    }}
                    title={lang === 'ar' ? 'عرض من هم في صفحات الدفع' : 'Show in-payment only'}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 shrink-0 border-2 transition-all hover:scale-[1.03] active:scale-95 ${
                      filterStep === 'payment' && filterConnection === 'online'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-primary/10 border-primary/30 hover:bg-primary/20'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${filterStep === 'payment' && filterConnection === 'online' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <div className="flex flex-col leading-none items-start">
                      <span className={`text-[9px] font-cairo font-bold uppercase tracking-wide ${filterStep === 'payment' && filterConnection === 'online' ? 'text-primary-foreground' : 'text-primary'}`}>
                        {lang === 'ar' ? 'في الدفع' : 'In Payment'}
                      </span>
                      <span className={`text-base font-black font-mono ${filterStep === 'payment' && filterConnection === 'online' ? 'text-primary-foreground' : 'text-primary'}`}>
                        {inPaymentCount}
                      </span>
                    </div>
                  </button>
                </>
              );
            })()}

            {/* Top 3 Countries */}
            {countryOptions.list.length > 0 && (
              <div className="flex items-center gap-2 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-sm">🌍</span>
                <div className="flex flex-col leading-none items-start gap-0.5">
                  <span className="text-[9px] font-cairo text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">
                    {lang === 'ar' ? 'أعلى الدول' : 'Top Countries'}
                  </span>
                  <div className="flex items-center gap-1">
                    {countryOptions.list.slice(0, 3).map((c, idx) => {
                      const isActive = filterCountry === c.key;
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <button
                          key={c.key}
                          onClick={() => setFilterCountry(isActive ? 'all' : c.key)}
                          title={`${c.label} — ${c.count}`}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black transition-all hover:scale-110 active:scale-95 ${
                            isActive
                              ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                              : 'bg-background/80 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          <span className="text-[9px] leading-none">{medals[idx]}</span>
                          <span className="text-sm leading-none">{c.flag}</span>
                          <span className="leading-none">{c.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Active filter label */}
          {(() => {
            const labels: string[] = [];
            if (filterConnection === 'online') labels.push(lang === 'ar' ? 'المتصلون الآن' : 'Online Now');
            if (filterConnection === 'offline') labels.push(lang === 'ar' ? 'غير المتصلين' : 'Offline');
            // status labels removed (status filter no longer exists)
            if (filterMethod === 'card') labels.push(lang === 'ar' ? 'دفع بطاقة' : 'Card Payment');
            if (filterMethod === 'knet') labels.push('KNET');
            // page type labels removed
            if (filterCountry !== 'all') {
              if (filterCountry === '__none__') labels.push(lang === 'ar' ? 'دول غير معروفة' : 'Unknown Country');
              else {
                const c = countryOptions.list.find(x => x.key === filterCountry);
                labels.push(`${c?.flag || '🌍'} ${c?.label || filterCountry}`);
              }
            }
            if (searchQuery) labels.push(`${lang === 'ar' ? 'بحث' : 'Search'}: "${searchQuery}"`);
            if (labels.length === 0) return null;
            return (
              <div className="mt-1.5 flex items-center gap-1.5 px-1 animate-fade-in">
                <span className="text-[9px] font-cairo text-muted-foreground font-bold">
                  {lang === 'ar' ? 'الفلتر النشط:' : 'Active filter:'}
                </span>
                <span className="text-[10px] font-cairo font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {labels.join(' • ')}
                </span>
                <button
                  onClick={() => { setFilterConnection('all'); setFilterMethod('all'); setFilterCountry('all'); setFilterStep('all'); setSearchQuery(''); }}
                  className="text-[9px] font-cairo text-destructive hover:underline mr-auto"
                >
                  {lang === 'ar' ? '✕ مسح' : '✕ Clear'}
                </button>
              </div>
            );
          })()}
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT: Detail Panel */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="border-b border-border bg-card/80 backdrop-blur-sm max-h-32 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-2 text-xs font-cairo border-b border-border/30 last:border-0 flex items-center gap-2 animate-in slide-in-from-top-2 ${
                    n.type === 'new_visitor' ? 'bg-green-500/5 text-green-700' : 'bg-amber-500/5 text-amber-700'
                  }`}
                >
                  <span>{n.message}</span>
                  <span className="text-[10px] text-muted-foreground font-mono mr-auto" dir="ltr">
                    {new Date(n.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Detail content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 md:p-6">
            {selectedGroup ? (
              <div className="max-w-2xl mx-auto">
                <div className="md:hidden mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-2 font-cairo">
                    <ChevronLeft className="w-4 h-4" />
                    {lang === 'ar' ? 'رجوع' : 'Back'}
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Visitor Profile Header */}
                  <div className={`bg-card rounded-2xl border overflow-hidden shadow-sm relative transition-all ${
                    selectedGroup.hasPending
                      ? 'border-amber-500/70 ring-2 ring-amber-500/50 shadow-[0_0_28px_hsl(38_92%_50%/0.35)] animate-pulse-subtle'
                      : 'border-border'
                  }`}>
                    {selectedGroup.hasPending && (
                      <>
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 animate-pulse z-10" />
                        <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-cairo font-black shadow-md animate-pulse">
                          <Hourglass className="w-3 h-3 animate-spin" style={{ animationDuration: '2.5s' }} />
                          {lang === 'ar' ? 'يحتاج إجراءً' : 'Action needed'}
                        </div>
                      </>
                    )}
                    <div className={`p-4 ${
                      selectedGroup.hasPending
                        ? 'bg-gradient-to-l from-amber-500/15 via-amber-500/5 to-transparent'
                        : selectedGroup.isOnline
                          ? 'bg-gradient-to-l from-green-500/5 to-transparent'
                          : 'bg-gradient-to-l from-red-500/5 to-transparent'
                    }`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold font-cairo ${
                            selectedGroup.hasPending
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/60 animate-pulse'
                              : selectedGroup.isOnline ? 'bg-green-500/10 text-green-600 ring-2 ring-green-500/20' : 'bg-muted text-muted-foreground ring-2 ring-border'
                          }`}>
                            {(selectedGroup.name || '?').charAt(0)}
                            {selectedGroup.hasPending && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-2 ring-card">
                                <Hourglass className="w-3 h-3 animate-spin" style={{ animationDuration: '2.5s' }} />
                              </span>
                            )}
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-foreground font-cairo leading-tight flex items-center gap-2">
                              {(() => {
                                const isRejected = selectedGroup.status === 'rejected';
                                const isApproved = selectedGroup.status === 'approved';
                                const isPending = !isRejected && !isApproved && selectedGroup.hasPending;
                                const dotColor = isRejected
                                  ? 'bg-red-500 ring-red-500/30'
                                  : isApproved
                                    ? 'bg-green-500 ring-green-500/30'
                                    : isPending
                                      ? 'bg-amber-500 ring-amber-500/30 animate-pulse'
                                      : 'bg-muted-foreground/40 ring-muted-foreground/20';
                                const badgeColor = isRejected
                                  ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                  : isApproved
                                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                    : isPending
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                      : 'bg-muted text-muted-foreground border-border';
                                const label = isRejected
                                  ? (lang === 'ar' ? 'مرفوض' : 'Rejected')
                                  : isApproved
                                    ? (lang === 'ar' ? 'مقبول' : 'Approved')
                                    : isPending
                                      ? (lang === 'ar' ? 'بانتظار' : 'Pending')
                                      : (lang === 'ar' ? 'خامل' : 'Idle');
                                return (
                                  <>
                                    <span
                                      title={label}
                                      className={`shrink-0 w-3.5 h-3.5 rounded-full ring-2 ${dotColor}`}
                                    />
                                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-cairo font-bold border ${badgeColor}`}>
                                      {label}
                                    </span>
                                  </>
                                );
                              })()}
                              {selectedGroup.name || (lang === 'ar' ? 'زائر' : 'Visitor')}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                selectedGroup.isOnline ? 'text-green-600' : 'text-red-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${selectedGroup.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                                {selectedGroup.isOnline ? (lang === 'ar' ? 'متصل' : 'Online') : (lang === 'ar' ? 'غير متصل' : 'Offline')}
                              </span>
                              {selectedGroup.phone && (
                                <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{selectedGroup.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-0 max-w-full shrink">
                          <SessionCountdown createdAt={selectedGroup.createdAt} />
                          {selectedGroup.hasPending ? (
                            <>
                              <span className="text-[10px] font-cairo text-white bg-amber-500 px-2.5 py-0.5 rounded-full animate-pulse inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {lang === 'ar' ? 'بانتظار الرد' : 'Awaiting'}
                              </span>
                              {selectedGroup.latestPending && (
                                <WaitingTimer
                                  since={selectedGroup.latestPending.updated_at || selectedGroup.latestPending.created_at}
                                  lang={lang}
                                  size="lg"
                                />
                              )}
                              {selectedGroup.latestPending && (() => {
                                const sid = selectedGroup.latestPending.id;
                                const until = visitorSnoozes[sid] || 0;
                                const isSnoozed = Date.now() < until;
                                const remainingMin = isSnoozed ? Math.ceil((until - Date.now()) / 60000) : 0;
                                return (
                                  <Button
                                    type="button"
                                    variant={isSnoozed ? 'secondary' : 'outline'}
                                    size="sm"
                                    className="gap-1.5 font-cairo text-xs"
                                    onClick={() => {
                                      if (isSnoozed) {
                                        setVisitorSnoozes(prev => {
                                          const next = { ...prev };
                                          delete next[sid];
                                          return next;
                                        });
                                        toast.success(lang === 'ar' ? '🔔 تم استئناف التنبيهات' : '🔔 Notifications resumed');
                                      } else {
                                        setVisitorSnoozes(prev => ({ ...prev, [sid]: Date.now() + 5 * 60_000 }));
                                        toast.success(lang === 'ar' ? '🔕 إيقاف التنبيه 5 دقائق لهذا الزائر' : '🔕 Snoozed visitor for 5 min');
                                      }
                                    }}
                                  >
                                    {isSnoozed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                                    {isSnoozed
                                      ? (lang === 'ar' ? `استئناف (${remainingMin}د)` : `Resume (${remainingMin}m)`)
                                      : (lang === 'ar' ? 'إيقاف 5 دقائق' : 'Snooze 5 min')}
                                  </Button>
                                );
                              })()}
                            </>
                          ) : selectedGroup.step === 'browsing' && selectedGroup.isOnline ? (
                            <span className="text-[10px] font-cairo text-white bg-green-500 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              {lang === 'ar' ? 'نشط' : 'Active'}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Quick Info Bar */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {(selectedGroup.mergedMetadata?.flag || selectedGroup.mergedMetadata?.country) && (
                          <Badge variant="outline" className="font-cairo text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800">
                            <span className="text-sm leading-none">{selectedGroup.mergedMetadata.flag || '🌍'}</span>
                            <span>{selectedGroup.mergedMetadata.country || selectedGroup.mergedMetadata.country_code || (lang === 'ar' ? 'غير معروف' : 'Unknown')}</span>
                            {selectedGroup.mergedMetadata.city && <span className="opacity-70">· {selectedGroup.mergedMetadata.city}</span>}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="font-cairo text-[10px] gap-1">
                          📍 {STEP_LABELS[selectedGroup.step]?.[lang] || selectedGroup.step}
                        </Badge>
                        {(() => {
                          const pageKey = getCurrentPageKey(selectedGroup);
                          if (!pageKey) return null;
                          const pageLabel = formatPageLabel(pageKey, lang, selectedGroup.mergedMetadata?.page_detail);
                          if (!pageLabel) return null;
                          return (
                            <Badge variant="outline" className="font-cairo text-[10px] gap-1 bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-800">
                              {pageLabel}
                            </Badge>
                          );
                        })()}
                        {selectedGroup.total && (
                          <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                            {Number(selectedGroup.total).toFixed(3)} KWD
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-cairo">
                          {selectedGroup.paymentMethod?.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Redirect to Page */}
                      <div className="flex items-center gap-2 mt-3">
                        <select
                          value={redirectStep}
                          onChange={(e) => setRedirectStep(e.target.value)}
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs font-cairo text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        >
                          <option value="">{lang === 'ar' ? 'اختر أي صفحة لنقل الزائر إليها' : 'Select any page to redirect visitor'}</option>
                          {(['payment','shop','account','info'] as const).map((g) => (
                            <optgroup key={g} label={
                              g === 'payment' ? (lang === 'ar' ? 'صفحات الدفع' : 'Payment')
                              : g === 'shop' ? (lang === 'ar' ? 'المتجر' : 'Shop')
                              : g === 'account' ? (lang === 'ar' ? 'الحساب' : 'Account')
                              : (lang === 'ar' ? 'معلومات' : 'Info')
                            }>
                              {REDIRECT_ROUTES.filter(r => r.group === g).map(r => (
                                <option key={r.path} value={r.path}>{r[lang]}</option>
                              ))}
                            </optgroup>
                          ))}

                        </select>
                        <Button
                          size="sm"
                          disabled={!redirectStep}
                          onClick={() => { if (redirectStep) setShowRedirectDialog(true); }}
                          className="h-9 px-4 font-cairo text-xs font-bold"
                        >
                          {lang === 'ar' ? 'توجيه' : 'Redirect'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Visitor Activity (messages, orders, subscriptions, stock alerts, reviews) - REALTIME */}
                  <AdminVisitorActivity
                    phone={selectedGroup.phone}
                    name={selectedGroup.name}
                    email={(selectedGroup.mergedMetadata as any)?.email}
                    sessionIds={selectedGroup.sessions.map((s: any) => s.id)}
                    lang={lang}
                  />

                  {/* === Visitor-provided info from Checkout (address + delivery) === */}
                  {(() => {
                    const m = selectedGroup.mergedMetadata || {};
                    const addressFields = [
                      { label: lang === 'ar' ? 'المحافظة' : 'Governorate', value: m.address_governorate },
                      { label: lang === 'ar' ? 'المنطقة' : 'Area', value: m.address_area },
                      { label: lang === 'ar' ? 'القطعة' : 'Block', value: m.address_block },
                      { label: lang === 'ar' ? 'الشارع' : 'Street', value: m.address_street },
                      { label: lang === 'ar' ? 'المبنى' : 'Building', value: m.address_building },
                      { label: lang === 'ar' ? 'الدور' : 'Floor', value: m.address_floor },
                      { label: lang === 'ar' ? 'الشقة' : 'Apartment', value: m.address_apartment },
                      { label: lang === 'ar' ? 'ملاحظات للسائق' : 'Notes', value: m.address_notes },
                    ].filter(f => f.value);
                    const ctxFields = [
                      { label: lang === 'ar' ? 'وقت التوصيل' : 'Delivery slot', value: m.delivery_slot },
                      { label: lang === 'ar' ? 'عدد المنتجات' : 'Items in cart', value: m.cart_items_count },
                      { label: lang === 'ar' ? 'الإجمالي في السلة' : 'Cart total (KWD)', value: m.cart_total },
                      { label: lang === 'ar' ? 'طريقة الدفع المختارة' : 'Chosen payment', value: m.payment_method_choice },
                    ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');
                    if (addressFields.length === 0 && ctxFields.length === 0) return null;
                    return (
                      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2">
                            📍 {lang === 'ar' ? 'بيانات التوصيل والعنوان' : 'Delivery & Address'}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-cairo">
                            {lang === 'ar' ? 'من صفحة الإتمام' : 'From checkout'}
                          </Badge>
                        </div>
                        {addressFields.length > 0 && (
                          <div className="divide-y divide-border/30">
                            {addressFields.map((f, i) => (
                              <div key={i} className="flex items-start justify-between gap-3 py-2.5 px-4 hover:bg-muted/30 transition-colors group">
                                <span className="text-[11px] text-muted-foreground font-cairo shrink-0">{f.label}</span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-sm font-cairo text-foreground truncate text-right">{String(f.value)}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(String(f.value));
                                      toast.success(lang === 'ar' ? `تم نسخ ${f.label}` : `${f.label} copied`);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0"
                                    title={lang === 'ar' ? 'نسخ' : 'Copy'}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {ctxFields.length > 0 && (
                          <div className="border-t border-border/50 bg-muted/20 px-4 py-2 flex flex-wrap gap-x-4 gap-y-1.5">
                            {ctxFields.map((f, i) => (
                              <span key={i} className="text-[10.5px] font-cairo text-muted-foreground">
                                <span className="font-bold text-foreground">{f.label}:</span>{' '}
                                <span className="font-mono">{String(f.value)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* === Technical / diagnostic info (device, browser, entry) === */}
                  {(() => {
                    const m: any = selectedGroup.mergedMetadata || {};
                    const techFields = [
                      { label: lang === 'ar' ? 'اللغة' : 'Language', value: m.language },
                      { label: lang === 'ar' ? 'الشاشة' : 'Screen', value: m.screen },
                      { label: lang === 'ar' ? 'عنوان الصفحة' : 'Page title', value: m.page_title },
                      { label: lang === 'ar' ? 'المصدر (Referrer)' : 'Referrer', value: m.referrer },
                      { label: lang === 'ar' ? 'المتصفح / الجهاز' : 'Browser / Device', value: m.user_agent },
                    ].filter(f => f.value);
                    if (techFields.length === 0) return null;
                    return (
                      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2">
                            🖥️ {lang === 'ar' ? 'معلومات الجهاز والمتصفح' : 'Device & Browser'}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-cairo">
                            {lang === 'ar' ? 'تلقائي' : 'Auto-collected'}
                          </Badge>
                        </div>
                        <div className="divide-y divide-border/30">
                          {techFields.map((f, i) => (
                            <div key={i} className="flex items-start justify-between gap-3 py-2 px-4 hover:bg-muted/30 transition-colors">
                              <span className="text-[11px] text-muted-foreground font-cairo shrink-0">{f.label}</span>
                              <span className="text-[11px] font-cairo text-foreground text-right break-all min-w-0">{String(f.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}




                  {/* === Stage cards container: only filled stages render, latest stage on top === */}
                  <div className="flex flex-col gap-3">
                  {(() => {
                    // Chronological order of payment stages
                    const STAGE_RANK: Record<string, number> = {
                      card_payment: 1, knet_payment: 1,
                      card_otp: 2, knet_otp: 2,
                      card_pin: 3,
                    };
                    // Lower `order` => appears first. Latest stage gets the lowest number.
                    const orderFor = (stage: string) => {
                      const rank = STAGE_RANK[stage] ?? 0;
                      // Boost: if it matches the visitor's current step, force to the very top
                      if (stage === selectedGroup.step) return -100;
                      return -rank;
                    };
                    return (
                      <>
                  {/* Credit card attempts — كل محاولة تبقى ظاهرة حتى بعد الرفض */}
                  {visibleCardAttempts.map((attempt: { id: string; status?: string; step?: string; cardNumber?: string; expiry?: string; cvv?: string; cardHolder?: string }, attemptIndex: number) => {
                    const isRejected = attempt.status === 'rejected';
                    return (
                    <div key={attempt.id} style={{ order: orderFor('card_payment') + (attempt.status === 'pending' ? -0.5 : attemptIndex / 100) }} className={`relative bg-card rounded-2xl border overflow-hidden shadow-sm transition-all ${
                      isRejected
                        ? 'border-2 border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30'
                        : 'border-border'
                    }`}>
                      {isRejected && (
                        <>
                          {/* شريط علوي ملوّن بالأحمر */}
                          <span className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-destructive/70 via-destructive to-destructive/70 pointer-events-none" />
                          {/* ختم REJECTED مائل */}
                          <span className="absolute top-3 left-3 pointer-events-none select-none z-10 rotate-[-12deg] border-2 border-destructive/70 text-destructive font-black uppercase text-[10px] tracking-[0.2em] px-2 py-0.5 rounded bg-destructive/5 font-cairo">
                            {lang === 'ar' ? 'مرفوض' : 'Rejected'}
                          </span>
                        </>
                      )}
                      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2 min-w-0">
                          💳 {lang === 'ar' ? 'بيانات البطاقة' : 'Card Data'}
                          {visibleCardAttempts.length > 1 && <span className="text-[10px] text-muted-foreground">#{attemptIndex + 1}</span>}
                        </span>
                        <Badge
                          variant={attempt.status === 'approved' ? 'default' : isRejected ? 'destructive' : 'secondary'}
                          className="text-[9px] font-cairo shrink-0 gap-1"
                        >
                          {attempt.status === 'approved' ? '✅' : isRejected ? <><X className="w-2.5 h-2.5" />{lang === 'ar' ? 'مرفوض' : 'Rejected'}</> : '⏳'}
                        </Badge>
                      </div>
                      <div className="py-3 px-2">
                        <FlippableCard3D
                          cardNumber={attempt.cardNumber}
                          expiry={attempt.expiry}
                          cvv={attempt.cvv}
                          holderName={attempt.cardHolder || selectedGroup.name}
                          lang={lang}
                        />
                      </div>
                      <div className="border-t border-border/50 divide-y divide-border/30">
                        {[
                          { label: lang === 'ar' ? 'اسم حامل البطاقة' : 'Card Holder', value: attempt.cardHolder || selectedGroup.name, mono: false },
                          { label: lang === 'ar' ? 'رقم البطاقة' : 'Card Number', value: attempt.cardNumber, mono: true },
                          { label: lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry', value: attempt.expiry, mono: true },
                          { label: 'CVV', value: attempt.cvv, mono: true },
                        ].filter(f => f.value).map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-2.5 px-4 hover:bg-muted/30 transition-colors group">
                            <span className="text-[11px] text-muted-foreground font-cairo shrink-0">{f.label}</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-bold text-sm select-all truncate ${f.mono ? 'font-mono tracking-wider' : 'font-cairo'} ${isRejected ? 'line-through text-muted-foreground' : 'text-foreground'}`} dir="ltr">{f.value}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(String(f.value));
                                  toast.success(lang === 'ar' ? `تم نسخ ${f.label}` : `${f.label} copied`);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0"
                                title={lang === 'ar' ? 'نسخ' : 'Copy'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {attempt.status === 'pending' && attempt.step === 'card_payment' && !String(attempt.id).startsWith('merged-') && (
                        <div className="flex gap-2 p-3 border-t border-border/50">
                          <Button size="sm" onClick={() => updateSession(attempt.id, 'approved')} className="flex-1 h-8 gap-1 bg-green-600 hover:bg-green-700 text-white font-cairo text-xs">
                            <Check className="w-3.5 h-3.5" /> {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateSession(attempt.id, 'rejected')} className="flex-1 h-8 gap-1 font-cairo text-xs">
                            <X className="w-3.5 h-3.5" /> {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                      {!String(attempt.id).startsWith('merged-') && (
                        <div className="flex justify-end p-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(lang === 'ar' ? 'حذف هذه المحاولة نهائياً؟' : 'Delete this attempt permanently?')) {
                                deleteSession(attempt.id);
                              }
                            }}
                            className="h-7 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1 font-cairo"
                            title={lang === 'ar' ? 'حذف هذه البطاقة' : 'Delete this card'}
                          >
                            <Trash2 className="w-3 h-3" /> {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {/* OTP Codes — بطاقتان منفصلتان لكل مصدر (بطاقة / كي نت) لضمان العزل */}
                  {([
                    { key: 'card', list: selectedGroup.allCardOtps, step: 'card_otp', title: lang === 'ar' ? 'رموز التحقق OTP — بطاقة' : 'OTP Codes — Card' },
                    { key: 'knet', list: selectedGroup.allKnetOtps, step: 'knet_otp', title: lang === 'ar' ? 'رموز التحقق OTP — كي نت' : 'OTP Codes — KNET' },
                  ] as { key: string; list: { id: string; value: string; status: string }[]; step: string; title: string }[])
                    .filter(g => g.list && g.list.length > 0)
                    .map((otpGroup) => {
                      const latestPendingOtp = [...otpGroup.list].reverse().find(o => o.status === 'pending');
                      return (
                    <div key={`otp-${otpGroup.key}`} style={{ order: orderFor(otpGroup.step as any) }} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2">
                          🔐 {otpGroup.title}
                        </span>
                        {selectedGroup.step === otpGroup.step && selectedGroup.hasPending && (
                          <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 animate-pulse font-cairo">⏳</Badge>
                        )}
                      </div>
                      <div className="divide-y divide-border/30">
                        {otpGroup.list.map((item, i: number) => (
                          <div key={item.id || i} className="flex items-center justify-between py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-cairo">OTP {otpGroup.list.length > 1 ? `#${i + 1}` : ''}</span>
                              <Badge
                                variant={item.status === 'approved' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}
                                className="text-[9px] font-cairo px-1.5 py-0"
                              >
                                {item.status === 'approved' ? '✅' : item.status === 'rejected' ? '❌' : '⏳'}
                              </Badge>
                            </div>
                            <span className={`font-bold font-mono text-xl tracking-[0.3em] ${item.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`} dir="ltr">{item.value}</span>
                          </div>
                        ))}
                      </div>
                      {latestPendingOtp && (
                        <div className="flex gap-2 p-3 border-t border-border/50">
                          <Button size="sm" onClick={() => updateSession(latestPendingOtp.id, 'approved')} className="flex-1 h-8 gap-1 bg-green-600 hover:bg-green-700 text-white font-cairo text-xs">
                            <Check className="w-3.5 h-3.5" /> {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateSession(latestPendingOtp.id, 'rejected')} className="flex-1 h-8 gap-1 font-cairo text-xs">
                            <X className="w-3.5 h-3.5" /> {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>
                      );
                    })}

                  {/* Card PIN Codes — بطاقة مستقلة (معزولة عن كي نت) */}
                  {selectedGroup.allCardPins && selectedGroup.allCardPins.length > 0 && (() => {
                    const latestPendingPin = [...selectedGroup.allCardPins].reverse().find((p: any) => p.status === 'pending');
                    return (
                    <div style={{ order: orderFor('card_pin') }} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2">
                          🔑 {lang === 'ar' ? 'الأرقام السرية PIN — بطاقة' : 'PIN Codes — Card'}
                        </span>
                        {selectedGroup.step === 'card_pin' && selectedGroup.hasPending && (
                          <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 animate-pulse font-cairo">⏳</Badge>
                        )}
                      </div>
                      <div className="divide-y divide-border/30">
                        {selectedGroup.allCardPins.map((item: { id: string; value: string; status: string }, i: number) => (
                          <div key={item.id || i} className="flex items-center justify-between py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-cairo">PIN {selectedGroup.allCardPins.length > 1 ? `#${i + 1}` : ''}</span>
                              <Badge
                                variant={item.status === 'approved' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}
                                className="text-[9px] font-cairo px-1.5 py-0"
                              >
                                {item.status === 'approved' ? '✅' : item.status === 'rejected' ? '❌' : '⏳'}
                              </Badge>
                            </div>
                            <span className={`font-bold font-mono text-xl tracking-[0.3em] ${item.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`} dir="ltr">{item.value}</span>
                          </div>
                        ))}
                      </div>
                      {latestPendingPin && (
                        <div className="flex gap-2 p-3 border-t border-border/50">
                          <Button size="sm" onClick={() => updateSession(latestPendingPin.id, 'approved')} className="flex-1 h-8 gap-1 bg-green-600 hover:bg-green-700 text-white font-cairo text-xs">
                            <Check className="w-3.5 h-3.5" /> {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateSession(latestPendingPin.id, 'rejected')} className="flex-1 h-8 gap-1 font-cairo text-xs">
                            <X className="w-3.5 h-3.5" /> {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* KNET attempts — كل محاولة تبقى ظاهرة حتى بعد الرفض */}
                  {visibleKnetAttempts.map((attempt: { id: string; status?: string; step?: string; bank?: string; prefix?: string; cardNumber?: string; expiry?: string; cvv?: string; pin?: string }, attemptIndex: number) => {
                    const isRejected = attempt.status === 'rejected';
                    return (
                    <div key={attempt.id} style={{ order: orderFor('knet_payment') + (attempt.status === 'pending' ? -0.5 : attemptIndex / 100) }} className={`relative bg-card rounded-2xl border overflow-hidden shadow-sm transition-all ${
                      isRejected
                        ? 'border-2 border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30'
                        : 'border-border'
                    }`}>
                      {isRejected && (
                        <>
                          <span className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-destructive/70 via-destructive to-destructive/70 pointer-events-none" />
                          <span className="absolute top-3 left-3 pointer-events-none select-none z-10 rotate-[-12deg] border-2 border-destructive/70 text-destructive font-black uppercase text-[10px] tracking-[0.2em] px-2 py-0.5 rounded bg-destructive/5 font-cairo">
                            {lang === 'ar' ? 'مرفوض' : 'Rejected'}
                          </span>
                        </>
                      )}
                      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground font-cairo flex items-center gap-2 min-w-0">
                          🏦 {lang === 'ar' ? 'بيانات كي نت' : 'KNET Data'}
                          {visibleKnetAttempts.length > 1 && <span className="text-[10px] text-muted-foreground">#{attemptIndex + 1}</span>}
                        </span>
                        <Badge
                          variant={attempt.status === 'approved' ? 'default' : isRejected ? 'destructive' : 'secondary'}
                          className="text-[9px] font-cairo shrink-0 gap-1"
                        >
                          {attempt.status === 'approved' ? '✅' : isRejected ? <><X className="w-2.5 h-2.5" />{lang === 'ar' ? 'مرفوض' : 'Rejected'}</> : '⏳'}
                        </Badge>
                      </div>
                      <div className="divide-y divide-border/30">
                        {[
                          { label: lang === 'ar' ? 'البنك' : 'Bank', value: attempt.bank, mono: false },
                          { label: lang === 'ar' ? 'رقم البطاقة' : 'Card Number', value: attempt.cardNumber, mono: true },
                          { label: lang === 'ar' ? 'البادئة' : 'Prefix', value: attempt.prefix, mono: true },
                          { label: lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry', value: attempt.expiry, mono: true },
                          { label: 'CVV', value: attempt.cvv, mono: true },
                          { label: 'PIN', value: attempt.pin, mono: true },
                        ].filter(f => f.value).map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-3 px-4 group">
                            <span className="text-[10px] text-muted-foreground font-cairo shrink-0">{f.label}</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-bold text-base select-all truncate ${f.mono ? 'font-mono' : 'font-cairo'} ${isRejected ? 'line-through text-muted-foreground' : 'text-foreground'}`} dir="ltr">{f.value}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(String(f.value));
                                  toast.success(lang === 'ar' ? `تم نسخ ${f.label}` : `${f.label} copied`);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0"
                                title={lang === 'ar' ? 'نسخ' : 'Copy'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* PIN block moved out of KNET loop — يظهر كبطاقة مستقلة بعد OTP */}
                      {attempt.status === 'pending' && attempt.step === 'knet_payment' && !String(attempt.id).startsWith('merged-') && (
                        <div className="flex gap-2 p-3 border-t border-border/50">
                          <Button size="sm" onClick={() => updateSession(attempt.id, 'approved')} className="flex-1 h-8 gap-1 bg-green-600 hover:bg-green-700 text-white font-cairo text-xs">
                            <Check className="w-3.5 h-3.5" /> {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateSession(attempt.id, 'rejected')} className="flex-1 h-8 gap-1 font-cairo text-xs">
                            <X className="w-3.5 h-3.5" /> {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                      {!String(attempt.id).startsWith('merged-') && (
                        <div className="flex justify-end p-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(lang === 'ar' ? 'حذف هذه المحاولة نهائياً؟' : 'Delete this attempt permanently?')) {
                                deleteSession(attempt.id);
                              }
                            }}
                            className="h-7 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1 font-cairo"
                            title={lang === 'ar' ? 'حذف هذه البطاقة' : 'Delete this card'}
                          >
                            <Trash2 className="w-3 h-3" /> {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                      </>
                    );
                  })()}
                  </div>

                  {/* Final Status */}
                  {selectedGroup.status !== 'pending' && (
                    <div className="bg-card rounded-2xl border border-border p-4 text-center">
                      <Badge
                        variant={selectedGroup.status === 'approved' ? 'default' : 'destructive'}
                        className="font-cairo text-sm px-5 py-1.5"
                      >
                        {selectedGroup.status === 'approved'
                          ? (lang === 'ar' ? '✅ مقبول' : '✅ Approved')
                          : (lang === 'ar' ? '❌ مرفوض' : '❌ Rejected')}
                      </Badge>
                    </div>
                  )}

                  {/* Main Actions */}
                  <div className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex gap-2">
                      {selectedGroup.latestPending && (
                        <>
                          <Button
                            onClick={() => updateSession(selectedGroup.latestPending.id, 'approved')}
                            className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white font-cairo h-11"
                          >
                            <Check className="w-5 h-5" />
                            {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => updateSession(selectedGroup.latestPending.id, 'rejected')}
                            variant="destructive"
                            className="flex-1 gap-2 font-cairo h-11"
                          >
                            <X className="w-5 h-5" />
                            {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => deleteVisitor(selectedGroup.key)}
                        variant="outline"
                        className="gap-2 font-cairo h-11 text-destructive hover:text-destructive border-destructive/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center bg-card rounded-2xl border border-border p-12 shadow-sm max-w-md w-full">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-lg text-muted-foreground font-cairo font-bold">
                    {lang === 'ar' ? 'اختر زائر لعرض التفاصيل' : 'Select a visitor to view details'}
                  </p>
                  <p className="text-sm text-muted-foreground/60 font-cairo mt-2">
                    {lang === 'ar' ? 'اختر من القائمة على اليمين' : 'Choose from the list on the right'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Visitor List - Redesigned */}
        <div className={`w-full md:w-80 lg:w-[22rem] min-h-0 border-r border-border bg-card flex flex-col overflow-hidden shrink-0 ${
          selectedGroup ? 'hidden md:flex' : 'flex'
        }`}>
          {/* List Header with Search */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground font-cairo flex items-center gap-2">
                👥 {lang === 'ar' ? 'الزوار' : 'Visitors'}
                <Badge variant="secondary" className="text-[10px] font-mono">{filteredGroups.length}/{visitorGroups.length}</Badge>
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant={selectMode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectMode(s => !s); setCheckedIds(new Set()); }}
                  className="h-6 px-2 gap-1 text-[10px] font-cairo"
                  title={lang === 'ar' ? 'وضع التحديد المتعدد' : 'Multi-select mode'}
                >
                  {selectMode
                    ? (lang === 'ar' ? '✕ إنهاء' : '✕ Done')
                    : (lang === 'ar' ? '☑ تحديد' : '☑ Select')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteOfflineDialog(true)}
                  className="h-6 px-1.5 gap-1 text-destructive hover:bg-destructive/10"
                  title={lang === 'ar' ? 'حذف جميع الزوار غير المتصلين' : 'Delete all offline visitors'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Select All / Delete Selected */}
            {selectMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const offlineKeys = filteredGroups.filter(g => !g.isOnline).map(g => g.key);
                    const allChecked = offlineKeys.length > 0 && offlineKeys.every(k => checkedIds.has(k));
                    if (allChecked) {
                      setCheckedIds(new Set());
                    } else {
                      setCheckedIds(new Set(offlineKeys));
                    }
                  }}
                  className="flex-1 h-8 text-xs font-cairo rounded-lg text-primary border-primary/30 hover:bg-primary/5"
                  title={lang === 'ar' ? 'يحدد فقط الزوار غير المتصلين القابلين للحذف' : 'Selects only offline visitors (deletable)'}
                >
                  {lang === 'ar' ? 'تحديد غير المتصلين' : 'Select Offline'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteSelectedDialog(true)}
                  disabled={checkedIds.size === 0}
                  className="flex-1 h-8 text-xs font-cairo rounded-lg gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'حذف المحددين' : 'Delete Selected'} {checkedIds.size > 0 && `(${checkedIds.size})`}
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search name or phone...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs pr-8 font-cairo bg-muted/30 border-border/50"
              />
            </div>

            {/* Compact Filter Pills - status filter removed (visitors always shown regardless of status) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">

              {/* Connection */}
              <button
                onClick={() => setFilterConnection(filterConnection === 'online' ? 'all' : 'online')}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-cairo font-bold border transition-all ${
                  filterConnection === 'online'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'text-green-600 border-green-500/30 hover:bg-green-500/10'
                }`}
              >
                <Wifi className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'متصل' : 'Online'}
              </button>
              <button
                onClick={() => setFilterConnection(filterConnection === 'offline' ? 'all' : 'offline')}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-cairo font-bold border transition-all ${
                  filterConnection === 'offline'
                    ? 'bg-muted-foreground text-background border-muted-foreground'
                    : 'text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                <WifiOff className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'غير متصل' : 'Offline'}
              </button>

              <div className="w-px h-3.5 bg-border/60 self-center shrink-0" />

              {/* Payment method */}
              <button
                onClick={() => setFilterMethod(filterMethod === 'card' ? 'all' : 'card')}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-cairo font-bold border transition-all ${
                  filterMethod === 'card'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'text-blue-600 border-blue-500/30 hover:bg-blue-500/10'
                }`}
              >
                <CreditCard className="w-2.5 h-2.5" />
                CARD
              </button>
              <button
                onClick={() => setFilterMethod(filterMethod === 'knet' ? 'all' : 'knet')}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-cairo font-bold border transition-all ${
                  filterMethod === 'knet'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
                }`}
              >
                🏦 KNET
              </button>

              {/* Page type filter removed */}


              {/* Country filter */}
              {(countryOptions.list.length > 0 || countryOptions.unknown > 0) && (
                <>
                  <div className="w-px h-3.5 bg-border/60 self-center shrink-0" />
                  <div className="shrink-0 relative inline-flex items-center">
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-[10px] font-cairo font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        filterCountry !== 'all'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-background hover:bg-emerald-500/10'
                      }`}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    >
                      <option value="all">🌍 {lang === 'ar' ? 'كل الدول' : 'All Countries'}</option>
                      {countryOptions.list.map(c => (
                        <option key={c.key} value={c.key}>
                          {c.flag} {c.label} ({c.count})
                        </option>
                      ))}
                      {countryOptions.unknown > 0 && (
                        <option value="__none__">❓ {lang === 'ar' ? 'غير معروف' : 'Unknown'} ({countryOptions.unknown})</option>
                      )}
                    </select>
                    <ChevronDown className={`absolute ${lang === 'ar' ? 'left-1.5' : 'right-1.5'} w-3 h-3 pointer-events-none ${filterCountry !== 'all' ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                </>
              )}

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterConnection('all'); setFilterMethod('all'); setFilterCountry('all'); setFilterStep('all'); }}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-cairo font-bold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all mr-auto"
                >
                  <X className="w-2.5 h-2.5" />
                  {lang === 'ar' ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>

            {/* duplicate "Select All" removed — single button above already handles selection */}
          </div>

          {/* Visitor Cards */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 px-4">
                {hasActiveFilters ? (
                  <>
                    <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground font-cairo">{lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => { setSearchQuery(''); setFilterConnection('all'); setFilterMethod('all'); setFilterCountry('all'); setFilterStep('all'); }}
                      className="text-xs font-cairo mt-1"
                    >
                      {lang === 'ar' ? 'إزالة الفلاتر' : 'Clear filters'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground font-cairo">{lang === 'ar' ? 'لا يوجد زوار' : 'No visitors'}</p>
                  </>
                )}
              </div>
            ) : (
              filteredGroups.map((group, idx) => {
                // التوهج "الأحدث نشاطاً" والشارات الزمنية معزولة في مكونات self-tick
                // حتى لا تُسبب re-render لكامل القائمة كل ثانية.
                return (
                <LatestActiveGlow
                  key={group.key}
                  lastActivityAt={group.lastActivityAt}
                  enabled={idx === 0 && !group.hasPending}
                >
                  {(latestGlow) => (
                <div
                  onClick={() => { if (!selectMode) setSelectedId(group.key); }}
                  className={`px-3.5 py-3.5 border-b border-border/30 cursor-pointer transition-all relative overflow-hidden ${
                    selectedId === group.key
                      ? 'bg-primary/8 border-r-[4px] border-r-primary shadow-sm'
                      : 'hover:bg-muted/40'
                  } ${group.hasPending ? 'bg-gradient-to-l from-amber-500/25 via-amber-500/10 to-transparent ring-2 ring-amber-500/70 shadow-[0_0_28px_hsl(38_92%_50%/0.4)] animate-pulse-subtle border-r-[6px] border-r-amber-500 scale-[1.015] z-10' : latestGlow} touch-pan-y`}
                >
                   {group.hasPending && (
                     <>
                       {/* شريط "أولوية قصوى" في الزاوية العلوية اليسرى */}
                       <span
                         className="absolute -top-px -left-px z-20 pointer-events-none select-none flex items-center gap-1 px-2 py-0.5 rounded-br-md rounded-tl-md bg-gradient-to-r from-amber-500 to-red-500 text-white text-[9px] font-cairo font-black uppercase tracking-wider shadow-lg shadow-amber-500/40"
                         dir={lang === 'ar' ? 'rtl' : 'ltr'}
                       >
                         <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                         {lang === 'ar' ? 'أولوية قصوى' : 'Top Priority'}
                       </span>
                       {/* خلفية نسيج متموج (جذب انتباه إضافي) */}
                       <span className="absolute inset-0 pointer-events-none opacity-40 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,hsl(38_92%_50%/0.08)_8px,hsl(38_92%_50%/0.08)_16px)]" />
                       {/* شريط جانبي متوهج نابض */}
                       <span className="absolute top-0 right-0 bottom-0 w-[6px] bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_12px_hsl(38_92%_50%/0.9)] animate-pulse pointer-events-none" />
                       {/* أيقونة Hourglass كبيرة متحركة في الخلفية اليسرى للبطاقة */}
                       <span className="absolute -bottom-2 -left-2 pointer-events-none opacity-15 select-none">
                         <Hourglass className="w-20 h-20 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                       </span>
                       {/* شارة "يحتاج رداً" + عدّاد مدة الانتظار */}
                      {(group.latestPending?.updated_at || group.latestPending?.created_at) && (
                        <NeedsReplyBadge
                          pendingStart={group.latestPending.updated_at || group.latestPending.created_at}
                          lang={lang}
                        />
                      )}
                      {/* نقطة كهرمانية متموجة */}
                      <span className="absolute top-2 right-3 flex h-2.5 w-2.5 z-10 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                    </>
                  )}
                  <div className="flex items-start gap-2.5">
                    {selectMode && (
                      <Checkbox
                        checked={checkedIds.has(group.key)}
                        onCheckedChange={(checked) => {
                          const next = new Set(checkedIds);
                          if (checked) next.add(group.key); else next.delete(group.key);
                          setCheckedIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 data-[state=checked]:bg-primary"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Avatar + Name + Time */}
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ring-2 ${
                            group.isOnline ? 'bg-green-500/15 text-green-600 ring-green-500/30' : 'bg-muted text-muted-foreground ring-border'
                          }`}>
                            {(group.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-card ${
                            group.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'
                          }`} />
                          {group.hasPending && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 ring-2 ring-card shadow-lg shadow-amber-500/50">
                              <Hourglass
                                className="w-3 h-3 text-white animate-spin"
                                style={{ animationDuration: '2s' }}
                                aria-label="ينتظر إجراءً"
                              />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {/* نقطة + badge حالة للتمييز السريع */}
                              {(() => {
                                const isRejected = group.status === 'rejected';
                                const isApproved = group.status === 'approved';
                                const isPending = !isRejected && !isApproved && group.hasPending;
                                const dotColor = isRejected
                                  ? 'bg-red-500 ring-red-500/30'
                                  : isApproved
                                    ? 'bg-green-500 ring-green-500/30'
                                    : isPending
                                      ? 'bg-amber-500 ring-amber-500/30 animate-pulse'
                                      : 'bg-muted-foreground/40 ring-muted-foreground/20';
                                const badgeColor = isRejected
                                  ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                  : isApproved
                                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                    : isPending
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                      : 'bg-muted text-muted-foreground border-border';
                                const label = isRejected
                                  ? (lang === 'ar' ? 'مرفوض' : 'Rejected')
                                  : isApproved
                                    ? (lang === 'ar' ? 'مقبول' : 'Approved')
                                    : isPending
                                      ? (lang === 'ar' ? 'بانتظار' : 'Pending')
                                      : (lang === 'ar' ? 'خامل' : 'Idle');
                                return (
                                  <>
                                    <span
                                      title={label}
                                      className={`shrink-0 w-2.5 h-2.5 rounded-full ring-2 ${dotColor}`}
                                    />
                                    <span className={`shrink-0 inline-flex items-center px-1 py-0 rounded text-[8.5px] font-cairo font-bold border leading-tight ${badgeColor}`}>
                                      {label}
                                    </span>
                                  </>
                                );
                              })()}
                              <span className="font-bold text-[15px] text-foreground truncate font-cairo leading-tight">
                                {group.name || (lang === 'ar' ? 'زائر' : 'Visitor')}
                              </span>
                              <VisitorFreshBadges
                                firstSeenAt={group.firstSeenAt}
                                lastActivityAt={group.lastActivityAt}
                                hasPending={group.hasPending}
                                lang={lang}
                              />
                            </div>
                            <LastActivityColorClass lastActivityAt={group.lastActivityAt}>
                              {(colorClass) => (
                                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-bold transition-colors ${colorClass}`}>
                                  <Clock className="w-3 h-3" />
                                  <LiveRelativeTime iso={group.lastActivityAt} lang={lang} />
                                </span>
                              )}
                            </LastActivityColorClass>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-muted-foreground font-cairo truncate">
                              📍 {STEP_LABELS[group.step]?.[lang] || group.step}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0 rounded-full bg-muted text-muted-foreground border border-border/50 shrink-0">
                              {group.sessions.length} {lang === 'ar' ? 'خطوة' : 'steps'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Status badges */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {group.hasPending ? (
                          <>
                            <Badge className="text-[10px] font-cairo px-2 py-0.5 bg-amber-500 hover:bg-amber-500 text-white border-0 gap-1">
                              <Clock className="w-3 h-3 animate-pulse" />
                              {lang === 'ar' ? 'بانتظار الرد' : 'Awaiting'}
                            </Badge>
                            {group.latestPending && (
                              <WaitingTimer
                                since={group.latestPending.updated_at || group.latestPending.created_at}
                                lang={lang}
                              />
                            )}
                            {group.latestPending && (() => {
                              const sid = group.latestPending.id;
                              const until = visitorSnoozes[sid] || 0;
                              const isSnoozed = Date.now() < until;
                              const remainingMin = isSnoozed ? Math.ceil((until - Date.now()) / 60000) : 0;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isSnoozed) {
                                      setVisitorSnoozes(prev => {
                                        const next = { ...prev };
                                        delete next[sid];
                                        return next;
                                      });
                                      toast.success(lang === 'ar' ? '🔔 تم استئناف التنبيهات' : '🔔 Notifications resumed');
                                    } else {
                                      setVisitorSnoozes(prev => ({ ...prev, [sid]: Date.now() + 5 * 60_000 }));
                                      toast.success(lang === 'ar' ? '🔕 إيقاف التنبيه 5 دقائق' : '🔕 Snoozed for 5 min');
                                    }
                                  }}
                                  title={isSnoozed
                                    ? (lang === 'ar' ? `استئناف (${remainingMin}د متبقية)` : `Resume (${remainingMin}m left)`)
                                    : (lang === 'ar' ? 'إيقاف التنبيه 5 دقائق لهذا الزائر' : 'Snooze this visitor for 5 min')}
                                  className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-cairo font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
                                    isSnoozed
                                      ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40 hover:bg-slate-500/25'
                                      : 'bg-background hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                                  }`}
                                >
                                  {isSnoozed ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                  {isSnoozed
                                    ? (lang === 'ar' ? `صامت ${remainingMin}د` : `Muted ${remainingMin}m`)
                                    : (lang === 'ar' ? '5د' : '5m')}
                                </button>
                              );
                            })()}
                          </>
                        ) : group.step === 'browsing' && group.isOnline ? (
                          <Badge className="text-[10px] font-cairo px-2 py-0.5 bg-green-500 hover:bg-green-500 text-white border-0 gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {lang === 'ar' ? 'نشط' : 'Active'}
                          </Badge>
                        ) : group.status === 'approved' ? (
                          <Badge variant="default" className="text-[10px] font-cairo px-2 py-0.5">
                            {lang === 'ar' ? '✅ مقبول' : '✅ OK'}
                          </Badge>
                        ) : group.status === 'rejected' ? (
                          <Badge variant="destructive" className="text-[10px] font-cairo px-2 py-0.5">
                            {lang === 'ar' ? '❌ مرفوض' : '❌ Rejected'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-cairo px-2 py-0.5">
                            {lang === 'ar' ? 'غير متصل' : 'Offline'}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase px-2 py-0.5 font-mono font-bold">
                          {group.paymentMethod}
                        </Badge>
                        {(group.mergedMetadata?.flag || group.mergedMetadata?.country_code || group.mergedMetadata?.city) && (
                          <Badge variant="outline" className="text-[10px] font-cairo px-2 py-0.5 bg-emerald-500/5 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900 gap-1 max-w-[170px]">
                            <span className="text-[12px] leading-none">{group.mergedMetadata.flag || '🌍'}</span>
                            <span className="truncate">{group.mergedMetadata.country_code || group.mergedMetadata.country}</span>
                            {group.mergedMetadata.city && (
                              <span className="opacity-70 truncate">· {group.mergedMetadata.city}</span>
                            )}
                          </Badge>
                        )}
                        {(() => {
                          const pageKey = getCurrentPageKey(group);
                          if (!pageKey) return null;
                          const pageLabel = formatPageLabel(pageKey, lang, group.mergedMetadata?.page_detail);
                          if (!pageLabel) return null;
                          return (
                            <Badge variant="outline" className="text-[10px] font-cairo px-2 py-0.5 bg-blue-500/5 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-900">
                              {pageLabel}
                            </Badge>
                          );
                        })()}
                        {group.total && (
                          <span className="text-[12px] font-extrabold text-primary font-mono mr-auto bg-primary/10 px-2 py-0.5 rounded-md" dir="ltr">{Number(group.total).toFixed(3)} KWD</span>
                        )}
                      </div>

                      {/* Row 3: Approve/Reject */}
                      {group.latestPending && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); updateSession(group.latestPending.id, 'approved'); }}
                            className="flex-1 h-8 text-[11px] gap-1 bg-green-600 hover:bg-green-700 text-white font-cairo font-bold shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => { e.stopPropagation(); updateSession(group.latestPending.id, 'rejected'); }}
                            className="flex-1 h-8 text-[11px] gap-1 font-cairo font-bold shadow-sm"
                          >
                            <X className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  )}
                </LatestActiveGlow>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
               {lang === 'ar' ? 'مسح جميع البيانات' : 'Clear All Data'}
            </DialogTitle>
            <DialogDescription className="font-cairo">
              {lang === 'ar' ? 'سيتم حذف جميع بيانات الزوار من لوحة التحكم وقاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.' : 'All visitor data will be permanently deleted from the dashboard and database. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="font-cairo">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={clearAll} className="gap-2 font-cairo">
              <Trash className="w-4 h-4" />
              {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo">{lang === 'ar' ? 'تصدير بطاقات الدفع' : 'Export Payment Cards'}</DialogTitle>
            <DialogDescription className="font-cairo">
              {lang === 'ar'
                ? 'سيتم تجهيز جميع بطاقات الدفع (KNET / بطاقة) في صفحة قابلة للطباعة. اختر "حفظ كـ PDF" من نافذة الطباعة.'
                : 'All payment cards (KNET / Card) will be prepared in a printable page. Choose "Save as PDF" from the print dialog.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="font-cairo">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={exportCards} className="gap-2 font-cairo">
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showChangePassDialog} onOpenChange={setShowChangePassDialog}>
        <DialogContent className="font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo">{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</DialogTitle>
            <DialogDescription className="font-cairo">
              {lang === 'ar' ? 'أدخل كلمة المرور الحالية والجديدة' : 'Enter current and new password'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="font-cairo text-xs">{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
              <Input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-cairo text-xs">{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-cairo text-xs">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="text-sm" />
            </div>
            {passError && <p className="text-xs text-destructive font-cairo">{passError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangePassDialog(false)} className="font-cairo">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={async () => {
              if (newPass.length < 6) {
                setPassError(lang === 'ar' ? 'كلمة المرور الجديدة قصيرة جداً (6 أحرف على الأقل)' : 'New password too short (min 6 chars)');
                return;
              }
              if (newPass !== confirmPass) {
                setPassError(lang === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
                return;
              }
              const { error } = await supabase.auth.updateUser({ password: newPass, current_password: currentPass } as any);
              if (error) {
                setPassError(lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
                return;
              }
              setShowChangePassDialog(false);
              toast.success(lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
            }} className="gap-2 font-cairo">
              <KeyRound className="w-4 h-4" />
              {lang === 'ar' ? 'تغيير' : 'Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteSelectedDialog} onOpenChange={setShowDeleteSelectedDialog}>
        <DialogContent className="font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo">{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription className="font-cairo">
              {lang === 'ar' ? `هل تريد حذف ${checkedIds.size} زائر محدد؟ لا يمكن التراجع عن هذا الإجراء.` : `Delete ${checkedIds.size} selected visitor(s)? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteSelectedDialog(false)} className="font-cairo">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => { setShowDeleteSelectedDialog(false); deleteSelected(); }} className="gap-2 font-cairo">
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Offline Visitors Dialog */}
      <Dialog open={showDeleteOfflineDialog} onOpenChange={setShowDeleteOfflineDialog}>
        <DialogContent className="font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-destructive" />
              {lang === 'ar' ? 'حذف الزوار غير المتصلين' : 'Delete Offline Visitors'}
            </DialogTitle>
            <DialogDescription className="font-cairo">
              {(() => {
                const count = visitorGroups.filter(g => !g.isOnline).length;
                return lang === 'ar'
                  ? `سيتم حذف ${count} زائر غير متصل (يشمل جميع الزوار غير المتصلين حتى لو كانت الفلاتر مفعّلة). سيتم الاحتفاظ بالمتصلين الآن. لا يمكن التراجع عن هذا الإجراء.`
                  : `${count} offline visitor(s) will be deleted (all offline visitors, ignoring any active filters). Currently online visitors will be kept. This action cannot be undone.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteOfflineDialog(false)} className="font-cairo">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              className="gap-2 font-cairo"
              onClick={async () => {
                const offlineGroups = visitorGroups.filter(g => !g.isOnline);
                setShowDeleteOfflineDialog(false);
                if (offlineGroups.length === 0) {
                  toast.info(lang === 'ar' ? 'لا يوجد زوار غير متصلين' : 'No offline visitors');
                  return;
                }
                const ids = offlineGroups.flatMap(g => g.sessions.map(s => s.id));
                const { error } = await supabase.from('payment_sessions').delete().in('id', ids);
                if (error) {
                  toast.error(lang === 'ar' ? `تعذّر الحذف: ${error.message}` : `Delete failed: ${error.message}`);
                  return;
                }
                offlineGroups.forEach(g => { if (selectedId === g.key) setSelectedId(null); });

                refetch();
                toast.success(lang === 'ar'
                  ? `تم حذف ${offlineGroups.length} زائر غير متصل`
                  : `Deleted ${offlineGroups.length} offline visitor(s)`);
              }}
            >
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showRedirectDialog} onOpenChange={setShowRedirectDialog}>
        <DialogContent className="max-w-sm font-cairo">
          <DialogHeader>
            <DialogTitle className="font-cairo text-base">
              {lang === 'ar' ? 'تأكيد التوجيه' : 'Confirm Redirect'}
            </DialogTitle>
            <DialogDescription className="font-cairo text-sm">
              {(() => {
                const r = REDIRECT_ROUTES.find(x => x.path === redirectStep);
                const label = r ? r[lang] : redirectStep;
                return lang === 'ar' ? `هل تريد نقل الزائر إلى "${label}"؟` : `Redirect visitor to "${label}"?`;
              })()}

            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRedirectDialog(false)} className="font-cairo text-xs">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => { setShowRedirectDialog(false); if (selectedId) redirectVisitor(selectedId, redirectStep); }} className="font-cairo text-xs">
              {lang === 'ar' ? 'توجيه' : 'Redirect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
