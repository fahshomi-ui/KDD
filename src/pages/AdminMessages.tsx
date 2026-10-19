import AdminLoginForm from '@/components/AdminLoginForm';
import { verifyAdminSession, adminLogout } from '@/lib/adminAuth';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, MessageSquare, ShoppingBag, Bell, CalendarDays, Star, Trash2, Phone, Mail, MapPin, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_AUTH_KEY = 'admin_auth';
const ADMIN_AUTH_VAL = 'true';

type Tab = 'messages' | 'orders' | 'subscriptions' | 'stock_alerts' | 'order_reviews';

const TABS: { id: Tab; label_ar: string; label_en: string; icon: any; color: string }[] = [
  { id: 'messages', label_ar: 'الرسائل', label_en: 'Messages', icon: MessageSquare, color: 'sky' },
  { id: 'orders', label_ar: 'الطلبات', label_en: 'Orders', icon: ShoppingBag, color: 'emerald' },
  { id: 'subscriptions', label_ar: 'الاشتراكات', label_en: 'Subscriptions', icon: CalendarDays, color: 'violet' },
  { id: 'stock_alerts', label_ar: 'تنبيهات المخزون', label_en: 'Stock Alerts', icon: Bell, color: 'amber' },
  { id: 'order_reviews', label_ar: 'تقييمات الطلبات', label_en: 'Order Reviews', icon: Star, color: 'rose' },
];

const TAB_TO_TABLE: Record<Tab, string> = {
  messages: 'contact_messages',
  orders: 'orders',
  subscriptions: 'subscriptions',
  stock_alerts: 'stock_alerts',
  order_reviews: 'order_reviews',
};
const TAB_TO_QKEY: Record<Tab, string> = {
  messages: 'admin-contact-messages',
  orders: 'admin-orders',
  subscriptions: 'admin-subscriptions',
  stock_alerts: 'admin-stock-alerts',
  order_reviews: 'admin-order-reviews',
};

const AdminMessages = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_AUTH_KEY) === ADMIN_AUTH_VAL);
  const [pass, setPass] = useState('');
  const [tab, setTab] = useState<Tab>('messages');

  useEffect(() => { verifyAdminSession().then((ok) => setAuthed(ok)); }, []);

  // Realtime: invalidate the active tab's query when the underlying table changes
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel(`admin-rt-${tab}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TAB_TO_TABLE[tab] }, () => {
        qc.invalidateQueries({ queryKey: [TAB_TO_QKEY[tab]] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, tab, qc]);

  const { data: messages } = useQuery({
    queryKey: ['admin-contact-messages'],
    enabled: authed && tab === 'messages',
    queryFn: async () => {
      const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    enabled: authed && tab === 'orders',
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ['admin-subscriptions'],
    enabled: authed && tab === 'subscriptions',
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('*, subscription_plans(name_ar, name_en, frequency)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ['admin-stock-alerts'],
    enabled: authed && tab === 'stock_alerts',
    queryFn: async () => {
      const { data } = await supabase.from('stock_alerts').select('*, products(name_ar, name_en)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: orderReviews } = useQuery({
    queryKey: ['admin-order-reviews'],
    enabled: authed && tab === 'order_reviews',
    queryFn: async () => {
      const { data } = await supabase.from('order_reviews').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const remove = async (table: 'contact_messages' | 'stock_alerts' | 'order_reviews' | 'subscriptions' | 'orders', id: string, key: string) => {
    if (!confirm('Delete?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); qc.invalidateQueries({ queryKey: [key] }); }
  };

  const markRead = async (id: string, current: boolean) => {
    await supabase.from('contact_messages').update({ is_read: !current } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-contact-messages'] });
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status } as any).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AdminLoginForm title="🔒 بيانات الزوار" onSuccess={() => setAuthed(true)} />
      </div>
    );
  }

  const fmtDate = (d: string) => new Date(d).toLocaleString('ar-KW', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-cairo font-extrabold text-xl md:text-2xl">📨 بيانات الزوار</h1>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const counts: Record<Tab, number> = {
              messages: messages?.length || 0,
              orders: orders?.length || 0,
              subscriptions: subs?.length || 0,
              stock_alerts: alerts?.length || 0,
              order_reviews: orderReviews?.length || 0,
            };
            return (
              <Button
                key={t.id}
                variant={tab === t.id ? 'default' : 'outline'}
                onClick={() => setTab(t.id)}
                className="font-cairo gap-1.5 whitespace-nowrap text-xs md:text-sm"
                size="sm"
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t.label_ar}
                {tab === t.id && <span className="bg-background/20 px-1.5 rounded text-[10px]">{counts[t.id]}</span>}
              </Button>
            );
          })}
        </div>

        {tab === 'messages' && (
          <div className="space-y-2">
            {(messages || []).map((m: any) => (
              <div key={m.id} className={`bg-card border rounded-xl p-3 ${m.is_read ? 'border-border' : 'border-sky-500/40 bg-sky-500/5'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-cairo font-bold text-sm">{m.name} {!m.is_read && <span className="text-[10px] text-sky-500">● جديد</span>}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {m.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>}
                      {m.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(m.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => markRead(m.id, m.is_read)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 font-cairo">{m.is_read ? 'لم يُقرأ' : 'مقروء'}</button>
                    <button onClick={() => remove('contact_messages', m.id, 'admin-contact-messages')} className="text-destructive hover:bg-destructive/10 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {m.subject && <p className="text-xs font-bold text-foreground mb-1">{m.subject}</p>}
                <p className="text-xs text-foreground/80 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
            {!messages?.length && <p className="text-center text-muted-foreground font-cairo py-12">لا توجد رسائل</p>}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-2">
            {(orders || []).map((o: any) => (
              <div key={o.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-cairo font-bold text-sm flex items-center gap-2">
                      #{o.order_number} <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">{o.status}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{o.customer_name} · {o.customer_phone} · {fmtDate(o.created_at)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{o.area} {o.block && `· ق${o.block}`} {o.street && `· ش${o.street}`}</p>
                    {o.notes && <p className="text-xs text-foreground/80 mt-1 bg-muted/40 rounded p-1.5">📝 {o.notes}</p>}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-cairo font-extrabold text-emerald-600">{Number(o.total).toFixed(3)} د.ك</p>
                    <p className="text-[10px] text-muted-foreground">{o.payment_method}</p>
                  </div>
                </div>
                {Array.isArray(o.order_items) && o.order_items.length > 0 && (
                  <div className="border-t border-border/60 pt-2 mt-2 space-y-1">
                    {o.order_items.map((it: any) => (
                      <p key={it.id} className="text-[11px] text-foreground/80">• {it.product_name_ar} × {it.quantity} — {Number(it.unit_price).toFixed(3)} د.ك</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['pending', 'approved', 'rejected', 'delivered'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateOrderStatus(o.id, s)}
                      className={`text-[10px] px-2 py-1 rounded font-cairo ${o.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                    >{s}</button>
                  ))}
                  <button onClick={() => remove('orders', o.id, 'admin-orders')} className="text-destructive hover:bg-destructive/10 p-1 rounded ms-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {!orders?.length && <p className="text-center text-muted-foreground font-cairo py-12">لا توجد طلبات</p>}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div className="space-y-2">
            {(subs || []).map((s: any) => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-cairo font-bold text-sm">{s.customer_name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.customer_phone} · {s.area}</p>
                    <p className="text-[11px] text-violet-600 font-bold mt-0.5">{s.subscription_plans?.name_ar || 'Plan'} · {s.subscription_plans?.frequency}</p>
                    <p className="text-[11px] text-muted-foreground">التوصيلة القادمة: {s.next_delivery_date} · حالة: {s.status}</p>
                  </div>
                  <button onClick={() => remove('subscriptions', s.id, 'admin-subscriptions')} className="text-destructive hover:bg-destructive/10 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {!subs?.length && <p className="text-center text-muted-foreground font-cairo py-12">لا توجد اشتراكات</p>}
          </div>
        )}

        {tab === 'stock_alerts' && (
          <div className="space-y-2">
            {(alerts || []).map((a: any) => (
              <div key={a.id} className={`bg-card border rounded-xl p-3 ${a.notified ? 'border-border opacity-70' : 'border-amber-500/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-cairo font-bold text-sm">{a.products?.name_ar || 'Product'}</p>
                    <p className="text-[11px] text-muted-foreground">{a.contact_type === 'email' ? '📧' : '📱'} {a.contact} · {fmtDate(a.created_at)}</p>
                    {a.notified && <p className="text-[10px] text-emerald-600">✓ تم الإشعار</p>}
                  </div>
                  <button onClick={() => remove('stock_alerts', a.id, 'admin-stock-alerts')} className="text-destructive hover:bg-destructive/10 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {!alerts?.length && <p className="text-center text-muted-foreground font-cairo py-12">لا توجد تنبيهات</p>}
          </div>
        )}

        {tab === 'order_reviews' && (
          <div className="space-y-2">
            {(orderReviews || []).map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-cairo font-bold text-sm flex items-center gap-2">
                      {r.customer_name} <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{r.order_number && `#${r.order_number} · `}{fmtDate(r.created_at)}</p>
                  </div>
                  <button onClick={() => remove('order_reviews', r.id, 'admin-order-reviews')} className="text-destructive hover:bg-destructive/10 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {r.comment && <p className="text-xs text-foreground/80 whitespace-pre-wrap">{r.comment}</p>}
                {Array.isArray(r.photo_urls) && r.photo_urls.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {r.photo_urls.map((u: string, i: number) => (
                      <img key={i} src={u} alt="" className="w-12 h-12 rounded object-cover border" />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!orderReviews?.length && <p className="text-center text-muted-foreground font-cairo py-12">لا توجد تقييمات</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;