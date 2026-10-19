import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVisitorActivity } from '@/hooks/useVisitorActivity';
import {
  MessageSquare, ShoppingBag, CalendarDays, Bell, Star,
  Check, X, Trash2, ChevronDown, ChevronUp, Clock, CreditCard, Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  sessionIds?: string[] | null;
  lang: 'ar' | 'en';
}

const t = (lang: 'ar' | 'en', ar: string, en: string) => (lang === 'ar' ? ar : en);
const fmt = (d: string) => new Date(d).toLocaleString('ar-KW', { dateStyle: 'short', timeStyle: 'short' });

const SectionHeader = ({ icon: Icon, label, count, pending, open, onToggle, color }: any) => (
  <button
    onClick={onToggle}
    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all ${
      pending > 0 ? `bg-${color}-500/10 border-${color}-500/40` : 'bg-card border-border hover:bg-muted/40'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={`w-4 h-4 ${pending > 0 ? `text-${color}-600` : 'text-muted-foreground'}`} />
      <span className="font-cairo font-bold text-xs">{label}</span>
      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{count}</span>
      {pending > 0 && (
        <span className={`text-[10px] bg-${color}-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse`}>
          {pending} ⚡
        </span>
      )}
    </div>
    {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
  </button>
);

const AdminVisitorActivity = ({ phone, name, email, sessionIds, lang }: Props) => {
  const qc = useQueryClient();
  const { data, isLoading } = useVisitorActivity(phone, name, email, sessionIds);
  const [openSection, setOpenSection] = useState<string | null>('auto');

  const hasIdentity = (phone && phone.trim()) || (name && name.trim()) || (email && email.trim()) || (sessionIds && sessionIds.length > 0);
  if (!hasIdentity) return null;

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-center text-[11px] text-muted-foreground font-cairo animate-pulse">
        {t(lang, 'جارٍ تحميل نشاط الزائر…', 'Loading visitor activity…')}
      </div>
    );
  }
  if (!data) return null;

  // Auto-expand the FIRST section that has pending items
  const autoOpen =
    openSection === 'auto'
      ? data.pendingPaymentSessions.length > 0 ? 'payments'
      : data.pendingMessages.length > 0 ? 'messages'
      : data.pendingOrders.length > 0 ? 'orders'
      : data.pendingSubscriptions.length > 0 ? 'subscriptions'
      : data.pendingStockAlerts.length > 0 ? 'alerts'
      : null
      : openSection;

  const toggle = (k: string) => setOpenSection((cur) => (cur === k || (cur === 'auto' && autoOpen === k) ? null : k));

  const refresh = () => qc.invalidateQueries({ queryKey: ['visitor-activity'] });

  const approveMessage = async (id: string) => {
    const { error } = await supabase.from('contact_messages').update({ is_read: true } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم وضع علامة مقروء', 'Marked as read')); refresh(); }
  };
  const removeMessage = async (id: string) => {
    if (!confirm(t(lang, 'حذف الرسالة؟', 'Delete message?'))) return;
    await supabase.from('contact_messages').delete().eq('id', id);
    toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh();
  };

  const setOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم تحديث الطلب', 'Order updated')); refresh(); }
  };

  const setSubStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('subscriptions').update({ status } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم التحديث', 'Updated')); refresh(); }
  };

  const notifyAlert = async (id: string) => {
    const { error } = await supabase.from('stock_alerts').update({ notified: true, notified_at: new Date().toISOString() } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم وضع علامة تم الإشعار', 'Marked as notified')); refresh(); }
  };
  const removeAlert = async (id: string) => {
    if (!confirm(t(lang, 'حذف التنبيه؟', 'Delete alert?'))) return;
    await supabase.from('stock_alerts').delete().eq('id', id);
    toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh();
  };

  const removeOrder = async (id: string) => {
    if (!confirm(t(lang, 'حذف الطلب نهائياً؟', 'Delete order permanently?'))) return;
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh(); }
  };
  const removeSub = async (id: string) => {
    if (!confirm(t(lang, 'حذف الاشتراك؟', 'Delete subscription?'))) return;
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh(); }
  };
  const removeReview = async (id: string) => {
    if (!confirm(t(lang, 'حذف التقييم؟', 'Delete review?'))) return;
    const { error } = await supabase.from('order_reviews').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh(); }
  };

  const nothing = data.messages.length + data.orders.length + data.subscriptions.length + data.stockAlerts.length + data.orderReviews.length === 0;
  if (nothing && data.paymentSessions.length === 0) return null;

  const copy = (v?: string) => {
    if (!v) return;
    navigator.clipboard?.writeText(String(v));
    toast.success(t(lang, 'تم النسخ', 'Copied'));
  };

  const setSessionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('payment_sessions').update({ status } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t(lang, 'تم التحديث', 'Updated')); refresh(); }
  };
  const removeSession = async (id: string) => {
    if (!confirm(t(lang, 'حذف جلسة الدفع؟', 'Delete payment session?'))) return;
    await supabase.from('payment_sessions').delete().eq('id', id);
    toast.success(t(lang, 'تم الحذف', 'Deleted')); refresh();
  };

  return (
    <div className="px-3 py-2 border-t border-border bg-gradient-to-b from-muted/30 to-transparent">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-cairo font-extrabold text-[11px] text-muted-foreground uppercase tracking-wider">
          📋 {t(lang, 'نشاط الزائر', 'Visitor Activity')}
        </h3>
        {data.totalPending > 0 && (
          <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
            {data.totalPending} {t(lang, 'بانتظار إجراء', 'pending')}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* PAYMENT SESSIONS (KNET / Card) — OTP / PIN / Card data */}
        {data.paymentSessions.length > 0 && (
          <>
            <SectionHeader icon={CreditCard} label={t(lang, 'جلسات الدفع', 'Payment Sessions')} count={data.paymentSessions.length}
              pending={data.pendingPaymentSessions.length} open={autoOpen === 'payments'} onToggle={() => toggle('payments')} color="rose" />
            {autoOpen === 'payments' && (
              <div className="space-y-1.5 ps-2">
                {data.paymentSessions.map((s: any) => {
                  const m = s.metadata || {};
                  const isKnet = s.payment_method === 'knet';
                  const stepLabel = s.step === 'knet_otp' || s.step === 'card_otp'
                    ? (lang === 'ar' ? 'OTP' : 'OTP')
                    : s.step === 'card_pin' ? (lang === 'ar' ? 'PIN' : 'PIN')
                    : (isKnet ? (lang === 'ar' ? 'كي نت' : 'KNET') : (lang === 'ar' ? 'بطاقة' : 'CARD'));
                  return (
                    <div key={s.id} className={`p-2 rounded-lg border text-xs ${s.status === 'pending' ? 'bg-rose-500/10 border-rose-500/40' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-cairo font-bold flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isKnet ? 'bg-emerald-500/15 text-emerald-700' : 'bg-sky-500/15 text-sky-700'}`}>
                            {isKnet ? '🏦 KNET' : '💳 CARD'}
                          </span>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{stepLabel}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.status === 'pending' ? 'bg-amber-500 text-white animate-pulse' : s.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}`}>
                            {s.status}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(s.created_at)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {m.bank && (
                          <div className="col-span-2 text-[10px]"><span className="text-muted-foreground">{t(lang,'البنك','Bank')}: </span><span className="font-bold">{m.bank}</span></div>
                        )}
                        {(m.cardNumber || m.prefix) && (
                          <button onClick={() => copy(m.cardNumber || m.prefix)} className="col-span-2 flex items-center justify-between bg-background/60 border border-border rounded px-2 py-1 hover:bg-muted">
                            <span className="text-[10px] text-muted-foreground">{t(lang,'البطاقة','Card')}</span>
                            <span className="font-mono text-[11px] tracking-wider ltr">{m.cardNumber || m.prefix} <Copy className="inline w-3 h-3 ms-1" /></span>
                          </button>
                        )}
                        {m.expiry && (
                          <button onClick={() => copy(m.expiry)} className="flex items-center justify-between bg-background/60 border border-border rounded px-2 py-1 hover:bg-muted">
                            <span className="text-[10px] text-muted-foreground">{t(lang,'الانتهاء','Expiry')}</span>
                            <span className="font-mono text-[11px] ltr">{m.expiry}</span>
                          </button>
                        )}
                        {m.cvv && (
                          <button onClick={() => copy(m.cvv)} className="flex items-center justify-between bg-background/60 border border-border rounded px-2 py-1 hover:bg-muted">
                            <span className="text-[10px] text-muted-foreground">CVV</span>
                            <span className="font-mono text-[11px] ltr">{m.cvv}</span>
                          </button>
                        )}
                        {m.pin && (
                          <button onClick={() => copy(m.pin)} className="flex items-center justify-between bg-background/60 border border-border rounded px-2 py-1 hover:bg-muted">
                            <span className="text-[10px] text-muted-foreground">PIN</span>
                            <span className="font-mono text-[11px] ltr font-bold">{m.pin}</span>
                          </button>
                        )}
                        {m.otp && (
                          <button onClick={() => copy(m.otp)} className="col-span-2 flex items-center justify-between bg-amber-500/10 border-2 border-amber-500/60 rounded px-2 py-1.5 hover:bg-amber-500/20">
                            <span className="text-[11px] text-amber-700 font-cairo font-bold">🔐 {t(lang,'رمز OTP','OTP Code')}</span>
                            <span className="font-mono text-base ltr font-extrabold tracking-widest text-amber-700">{m.otp} <Copy className="inline w-3.5 h-3.5 ms-1" /></span>
                          </button>
                        )}
                      </div>

                      {s.total != null && (
                        <p className="text-[10px] text-muted-foreground mt-1">{t(lang,'المبلغ','Amount')}: <span className="font-mono font-bold text-foreground">{Number(s.total).toFixed(3)} د.ك</span></p>
                      )}

                      <div className="flex gap-1 mt-1.5">
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => setSessionStatus(s.id, 'approved')} className="flex-1 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                              <Check className="w-3 h-3" /> {t(lang,'قبول','Approve')}
                            </button>
                            <button onClick={() => setSessionStatus(s.id, 'rejected')} className="flex-1 h-6 bg-destructive hover:bg-destructive/90 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                              <X className="w-3 h-3" /> {t(lang,'رفض','Reject')}
                            </button>
                          </>
                        )}
                        <button onClick={() => removeSession(s.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1" title={t(lang,'حذف','Delete')}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* MESSAGES */}
        {data.messages.length > 0 && (
          <>
            <SectionHeader icon={MessageSquare} label={t(lang, 'الرسائل', 'Messages')} count={data.messages.length}
              pending={data.pendingMessages.length} open={autoOpen === 'messages'} onToggle={() => toggle('messages')} color="sky" />
            {autoOpen === 'messages' && (
              <div className="space-y-1.5 ps-2">
                {data.messages.map((m: any) => (
                  <div key={m.id} className={`p-2 rounded-lg border text-xs ${m.is_read ? 'bg-card border-border' : 'bg-sky-500/5 border-sky-500/40'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-cairo font-bold">{m.subject || t(lang, 'رسالة', 'Message')}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(m.created_at)}</span>
                    </div>
                    {(m.name || m.email || m.phone) && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mb-1">
                        {m.name && <span>👤 <span className="text-foreground font-bold">{m.name}</span></span>}
                        {m.phone && (
                          <button onClick={() => copy(m.phone)} className="hover:text-foreground inline-flex items-center gap-0.5" dir="ltr">
                            📱 <span className="font-mono">{m.phone}</span><Copy className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {m.email && (
                          <button onClick={() => copy(m.email)} className="hover:text-foreground inline-flex items-center gap-0.5" dir="ltr">
                            ✉️ <span className="font-mono">{m.email}</span><Copy className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] whitespace-pre-wrap text-foreground/80">{m.message}</p>
                    {!m.is_read && (
                      <div className="flex gap-1.5 mt-1.5">
                        <button onClick={() => approveMessage(m.id)} className="flex-1 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> {t(lang, 'مقروء', 'Read')}
                        </button>
                        <button onClick={() => removeMessage(m.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ORDERS */}
        {data.orders.length > 0 && (
          <>
            <SectionHeader icon={ShoppingBag} label={t(lang, 'الطلبات', 'Orders')} count={data.orders.length}
              pending={data.pendingOrders.length} open={autoOpen === 'orders'} onToggle={() => toggle('orders')} color="emerald" />
            {autoOpen === 'orders' && (
              <div className="space-y-1.5 ps-2">
                {data.orders.map((o: any) => (
                  <div key={o.id} className="p-2 rounded-lg border border-border bg-card text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-cairo font-bold">#{o.order_number}</span>
                      <span className="text-emerald-600 font-mono font-bold">{Number(o.total).toFixed(3)} د.ك</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{o.area} · {o.payment_method} · <span className="font-bold">{o.status}</span></p>
                    {(() => {
                      const parts = [
                        o.block && `${t(lang,'قطعة','Block')} ${o.block}`,
                        o.street && `${t(lang,'شارع','St')} ${o.street}`,
                        o.building && `${t(lang,'مبنى','Bldg')} ${o.building}`,
                        o.floor && `${t(lang,'دور','Fl')} ${o.floor}`,
                        o.apartment && `${t(lang,'شقة','Apt')} ${o.apartment}`,
                      ].filter(Boolean);
                      if (parts.length === 0 && !o.notes) return null;
                      return (
                        <div className="mt-1 space-y-0.5">
                          {parts.length > 0 && (
                            <p className="text-[10px] text-foreground/80">📍 {parts.join(' · ')}</p>
                          )}
                          {o.notes && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">📝 {o.notes}</p>
                          )}
                          {o.delivery_date && (
                            <p className="text-[10px] text-muted-foreground">🕒 {o.delivery_date} {o.delivery_window || ''}</p>
                          )}
                        </div>
                      );
                    })()}
                    {Array.isArray(o.order_items) && o.order_items.length > 0 && (
                      <p className="text-[10px] text-foreground/70 mt-0.5">{o.order_items.map((i: any) => `${i.product_name_ar}×${i.quantity}`).join(' · ')}</p>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      {o.status === 'pending' && (
                        <>
                          <button onClick={() => setOrderStatus(o.id, 'confirmed')} className="flex-1 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> {t(lang, 'قبول', 'Accept')}
                          </button>
                          <button onClick={() => setOrderStatus(o.id, 'cancelled')} className="flex-1 h-6 bg-destructive hover:bg-destructive/90 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> {t(lang, 'رفض', 'Reject')}
                          </button>
                        </>
                      )}
                      <button onClick={() => removeOrder(o.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1" title={t(lang, 'حذف', 'Delete')}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SUBSCRIPTIONS */}
        {data.subscriptions.length > 0 && (
          <>
            <SectionHeader icon={CalendarDays} label={t(lang, 'الاشتراكات', 'Subscriptions')} count={data.subscriptions.length}
              pending={data.pendingSubscriptions.length} open={autoOpen === 'subscriptions'} onToggle={() => toggle('subscriptions')} color="violet" />
            {autoOpen === 'subscriptions' && (
              <div className="space-y-1.5 ps-2">
                {data.subscriptions.map((s: any) => (
                  <div key={s.id} className="p-2 rounded-lg border border-border bg-card text-xs">
                    <p className="font-cairo font-bold">{s.subscription_plans?.name_ar || 'Plan'}</p>
                    <p className="text-[10px] text-muted-foreground">{s.area} · {t(lang, 'القادمة', 'Next')}: {s.next_delivery_date} · {s.status}</p>
                    <div className="flex gap-1 mt-1.5">
                      {s.status === 'active' && (s.deliveries_count || 0) === 0 && (
                        <>
                          <button onClick={() => setSubStatus(s.id, 'active')} className="flex-1 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> {t(lang, 'تأكيد', 'Confirm')}
                          </button>
                          <button onClick={() => setSubStatus(s.id, 'cancelled')} className="flex-1 h-6 bg-destructive hover:bg-destructive/90 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> {t(lang, 'إلغاء', 'Cancel')}
                          </button>
                        </>
                      )}
                      <button onClick={() => removeSub(s.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1" title={t(lang, 'حذف', 'Delete')}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* STOCK ALERTS */}
        {data.stockAlerts.length > 0 && (
          <>
            <SectionHeader icon={Bell} label={t(lang, 'تنبيهات المخزون', 'Stock Alerts')} count={data.stockAlerts.length}
              pending={data.pendingStockAlerts.length} open={autoOpen === 'alerts'} onToggle={() => toggle('alerts')} color="amber" />
            {autoOpen === 'alerts' && (
              <div className="space-y-1.5 ps-2">
                {data.stockAlerts.map((a: any) => (
                  <div key={a.id} className={`p-2 rounded-lg border text-xs ${a.notified ? 'bg-card border-border opacity-70' : 'bg-amber-500/5 border-amber-500/40'}`}>
                    <p className="font-cairo font-bold">{a.products?.name_ar || 'Product'}</p>
                    <p className="text-[10px] text-muted-foreground">{a.contact_type === 'email' ? '📧' : '📱'} {a.contact}</p>
                    {!a.notified && (
                      <div className="flex gap-1 mt-1.5">
                        <button onClick={() => notifyAlert(a.id)} className="flex-1 h-6 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-cairo font-bold flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> {t(lang, 'تم الإشعار', 'Notified')}
                        </button>
                        <button onClick={() => removeAlert(a.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px]">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* REVIEWS */}
        {data.orderReviews.length > 0 && (
          <>
            <SectionHeader icon={Star} label={t(lang, 'التقييمات', 'Reviews')} count={data.orderReviews.length}
              pending={0} open={autoOpen === 'reviews'} onToggle={() => toggle('reviews')} color="rose" />
            {autoOpen === 'reviews' && (
              <div className="space-y-1.5 ps-2">
                {data.orderReviews.map((r: any) => (
                  <div key={r.id} className="p-2 rounded-lg border border-border bg-card text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-cairo font-bold flex items-center gap-2">
                        <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        {r.order_number && <span className="text-[10px] text-muted-foreground">#{r.order_number}</span>}
                      </p>
                      <button onClick={() => removeReview(r.id)} className="h-6 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded text-[10px] flex items-center gap-1" title={t(lang, 'حذف', 'Delete')}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {r.comment && <p className="text-[11px] whitespace-pre-wrap text-foreground/80">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminVisitorActivity;