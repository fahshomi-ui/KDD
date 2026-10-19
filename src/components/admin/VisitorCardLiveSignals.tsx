import { Clock } from 'lucide-react';
import { useTick } from '@/components/LiveRelativeTime';

/**
 * شارة "زائر جديد ✨" / "إجراء جديد" - تختفي تلقائياً بعد المدة المحددة.
 * معزولة في مكون مستقل حتى لا تُسبّب re-render لقائمة الزوار كاملة كل ثانية.
 */
export const VisitorFreshBadges = ({
  firstSeenAt,
  lastActivityAt,
  hasPending,
  lang,
}: {
  firstSeenAt: string;
  lastActivityAt: string;
  hasPending: boolean;
  lang: 'ar' | 'en';
}) => {
  useTick(1000);
  if (hasPending) return null;
  const now = Date.now();
  const firstSeenSec = Math.max(0, (now - new Date(firstSeenAt).getTime()) / 1000);
  const ageSec = Math.max(0, (now - new Date(lastActivityAt).getTime()) / 1000);
  const isNewVisitor = firstSeenSec < 60;
  const isNewAction = !isNewVisitor && ageSec < 30;
  if (isNewVisitor) {
    return (
      <span className="shrink-0 inline-flex items-center gap-0.5 text-[8.5px] font-cairo font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_0_10px_hsl(322_85%_60%/0.55)] animate-pulse uppercase tracking-wide">
        <span className="text-[9px] leading-none">✨</span>
        {lang === 'ar' ? 'زائر جديد' : 'New visitor'}
      </span>
    );
  }
  if (isNewAction) {
    return (
      <span className="shrink-0 inline-flex items-center gap-0.5 text-[8.5px] font-cairo font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-[0_0_10px_hsl(160_84%_39%/0.5)] animate-pulse uppercase tracking-wide">
        <span className="w-1 h-1 rounded-full bg-white animate-ping" />
        {lang === 'ar' ? 'إجراء جديد' : 'New action'}
      </span>
    );
  }
  return null;
};

/**
 * نص الوقت المُلوّن (أخضر/رمادي) - يُحدّث ذاتياً.
 */
export const LastActivityColorClass = ({
  lastActivityAt,
  children,
}: {
  lastActivityAt: string;
  children: (colorClass: string) => React.ReactNode;
}) => {
  useTick(1000);
  const ageSec = Math.max(0, (Date.now() - new Date(lastActivityAt).getTime()) / 1000);
  const colorClass = ageSec < 30 ? 'text-green-600' : 'text-muted-foreground/70';
  return <>{children(colorClass)}</>;
};

/**
 * شارة "يحتاج رداً + مدة الانتظار" - معزولة، تُحدّث ذاتياً كل ثانية.
 */
export const NeedsReplyBadge = ({
  pendingStart,
  lang,
}: {
  pendingStart: string;
  lang: 'ar' | 'en';
}) => {
  useTick(1000);
  const waitSec = Math.max(0, Math.floor((Date.now() - new Date(pendingStart).getTime()) / 1000));
  const waitLabel =
    waitSec < 60
      ? `${waitSec}${lang === 'ar' ? 'ث' : 's'}`
      : waitSec < 3600
        ? `${Math.floor(waitSec / 60)}${lang === 'ar' ? 'د' : 'm'} ${waitSec % 60}${lang === 'ar' ? 'ث' : 's'}`
        : `${Math.floor(waitSec / 3600)}${lang === 'ar' ? 'س' : 'h'} ${Math.floor((waitSec % 3600) / 60)}${lang === 'ar' ? 'د' : 'm'}`;
  const urgent = waitSec >= 30;
  return (
    <div className="absolute top-0 left-0 z-10 pointer-events-none flex items-stretch shadow-md rounded-br-md overflow-hidden">
      <div className="bg-amber-500 text-white text-[9px] font-cairo font-black px-2 py-0.5 flex items-center gap-1 animate-pulse">
        <Clock className="w-3 h-3" />
        {lang === 'ar' ? 'يحتاج رداً' : 'NEEDS REPLY'}
      </div>
      <div
        className={`text-white text-[10px] font-mono font-black px-2 py-0.5 flex items-center gap-1 tabular-nums ${
          urgent ? 'bg-red-600 animate-pulse' : 'bg-amber-700'
        }`}
      >
        {lang === 'ar' ? 'منذ' : 'for'} {waitLabel}
      </div>
    </div>
  );
};

/**
 * توهج نابض على الزائر الأحدث نشاطاً (أول 10 ثوانٍ) - معزول.
 * يُمرَّر className إضافي للأب عبر دالة render-prop.
 */
export const LatestActiveGlow = ({
  lastActivityAt,
  enabled,
  children,
}: {
  lastActivityAt: string;
  enabled: boolean;
  children: (glowClass: string) => React.ReactNode;
}) => {
  useTick(1000);
  const ageSec = Math.max(0, (Date.now() - new Date(lastActivityAt).getTime()) / 1000);
  const glow = enabled && ageSec < 10
    ? 'ring-2 ring-primary/60 bg-primary/[0.06] shadow-[0_0_18px_hsl(var(--primary)/0.45)] animate-pulse z-10'
    : '';
  return <>{children(glow)}</>;
};

/**
 * عنصر قائمة "استئناف التذكيرات (Xم)" - معزول، يُحدّث المدة المتبقية ذاتياً.
 * يستدعي onResume عند النقر، ويختفي تلقائياً بانتهاء المدة (يُعرض children بدلاً منه).
 */
export const SnoozeStatus = ({
  snoozedUntil,
  children,
  render,
}: {
  snoozedUntil: number;
  children: React.ReactNode; // يُعرض عندما لا يوجد snooze نشط
  render: (remainingMin: number) => React.ReactNode; // يُعرض عند وجود snooze نشط
}) => {
  useTick(1000);
  const isSnoozed = snoozedUntil > Date.now();
  if (!isSnoozed) return <>{children}</>;
  const remainingMin = Math.ceil((snoozedUntil - Date.now()) / 60000);
  return <>{render(remainingMin)}</>;
};