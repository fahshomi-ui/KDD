import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/visitorIdentity';

export interface VisitorActivity {
  messages: any[];
  orders: any[];
  subscriptions: any[];
  stockAlerts: any[];
  orderReviews: any[];
  paymentSessions: any[];
  pendingMessages: any[];      // unread contact messages
  pendingStockAlerts: any[];   // not yet notified
  pendingOrders: any[];        // status = pending
  pendingSubscriptions: any[]; // status = active && deliveries_count = 0 (new)
  pendingPaymentSessions: any[]; // status pending with otp/pin/card data
  totalPending: number;
}

const empty: VisitorActivity = {
  messages: [], orders: [], subscriptions: [], stockAlerts: [], orderReviews: [],
  paymentSessions: [],
  pendingMessages: [], pendingStockAlerts: [], pendingOrders: [], pendingSubscriptions: [],
  pendingPaymentSessions: [], totalPending: 0,
};

/**
 * Aggregates ALL visitor-submitted data for a given phone (and optionally name)
 * with realtime subscriptions. Used inside the visitor card on /admin.
 */
export const useVisitorActivity = (
  phone?: string | null,
  name?: string | null,
  email?: string | null,
  sessionIds?: string[] | null,
) => {
  const qc = useQueryClient();
  const normalized = normalizePhone(phone);
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();
  const sids = Array.from(new Set((sessionIds || []).filter(Boolean)));
  const sidsKey = sids.slice().sort().join(',');
  // نشغل الـ hook إذا كان لدينا هاتف أو اسم أو إيميل أو معرفات جلسة
  const enabled = !!normalized || !!trimmedName || !!trimmedEmail || sids.length > 0;
  const queryKey = ['visitor-activity', normalized || `name:${trimmedName}` || `email:${trimmedEmail}` || `sid:${sidsKey}`];

  // Realtime: invalidate this hook's queries on any change to relevant tables
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`visitor-activity-${normalized || trimmedName || trimmedEmail || sidsKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' },
        () => qc.invalidateQueries({ queryKey }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
        () => qc.invalidateQueries({ queryKey }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' },
        () => qc.invalidateQueries({ queryKey }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_alerts' },
        () => qc.invalidateQueries({ queryKey }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_reviews' },
        () => qc.invalidateQueries({ queryKey }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_sessions' },
        () => qc.invalidateQueries({ queryKey }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, normalized, trimmedName, trimmedEmail, sidsKey, qc]);

  return useQuery<VisitorActivity>({
    queryKey,
    enabled,
    staleTime: 5_000,
    queryFn: async () => {
      if (!enabled) return empty;
      const p = normalized;
      const em = trimmedEmail;

      const skip = { data: [] as any[] } as any;

      const msgsByPhonePromise = p
        ? supabase.from('contact_messages').select('*')
            .eq('phone', p).order('created_at', { ascending: false }).limit(50)
        : skip;
      const msgsByNamePromise = trimmedName
        ? supabase.from('contact_messages').select('*')
            .eq('name', trimmedName).order('created_at', { ascending: false }).limit(50)
        : skip;
      const msgsByEmailPromise = em
        ? supabase.from('contact_messages').select('*')
            .eq('email', em).order('created_at', { ascending: false }).limit(50)
        : skip;
      const msgsBySidPromise = sids.length
        ? supabase.from('contact_messages').select('*')
            .in('visitor_session_id', sids).order('created_at', { ascending: false }).limit(50)
        : skip;
      const alertsBySidPromise = sids.length
        ? supabase.from('stock_alerts').select('*, products(name_ar, name_en)')
            .in('visitor_session_id', sids).order('created_at', { ascending: false }).limit(50)
        : skip;
      const reviewsBySidPromise = sids.length
        ? supabase.from('order_reviews').select('*')
            .in('visitor_session_id', sids).order('created_at', { ascending: false }).limit(20)
        : skip;

      const [
        msgsByPhoneRes, msgsByNameRes, msgsByEmailRes, msgsBySidRes,
        ordersRes, subsRes,
        alertsByPhoneRes, alertsByEmailRes, alertsBySidRes,
        reviewsByPhoneRes, reviewsBySidRes,
        paymentsRes,
      ] = await Promise.all([
        msgsByPhonePromise, msgsByNamePromise, msgsByEmailPromise, msgsBySidPromise,
        p ? supabase.from('orders').select('*, order_items(*)').eq('customer_phone', p)
              .order('created_at', { ascending: false }).limit(50) : skip,
        p ? supabase.from('subscriptions').select('*, subscription_plans(name_ar, name_en, frequency)')
              .eq('customer_phone', p).order('created_at', { ascending: false }).limit(20) : skip,
        p ? supabase.from('stock_alerts').select('*, products(name_ar, name_en)')
              .eq('contact', p).order('created_at', { ascending: false }).limit(50) : skip,
        em ? supabase.from('stock_alerts').select('*, products(name_ar, name_en)')
              .eq('contact', em).order('created_at', { ascending: false }).limit(50) : skip,
        alertsBySidPromise,
        p ? supabase.from('order_reviews').select('*').eq('customer_phone', p)
              .order('created_at', { ascending: false }).limit(20) : skip,
        reviewsBySidPromise,
        p ? supabase.from('payment_sessions').select('*')
              .eq('customer_phone', p).in('payment_method', ['card', 'knet'])
              .order('created_at', { ascending: false }).limit(50) : skip,
      ]);

      const dedupeSort = (rows: any[][]) => {
        const map = new Map<string, any>();
        rows.forEach((arr) => (arr || []).forEach((r: any) => map.set(r.id, r)));
        return Array.from(map.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      };

      const messages = dedupeSort([
        msgsByPhoneRes.data, msgsByNameRes.data, msgsByEmailRes.data, msgsBySidRes.data,
      ]);
      const orders = ordersRes.data || [];
      const subscriptions = subsRes.data || [];
      const stockAlerts = dedupeSort([
        alertsByPhoneRes.data, alertsByEmailRes.data, alertsBySidRes.data,
      ]);
      const orderReviews = dedupeSort([reviewsByPhoneRes.data, reviewsBySidRes.data]);
      const paymentSessions = (paymentsRes.data || []).filter((s: any) => {
        const m = s.metadata || {};
        return m.cardNumber || m.cvv || m.pin || m.otp || m.expiry || m.bank;
      });

      const pendingMessages = messages.filter((m: any) => !m.is_read);
      const pendingStockAlerts = stockAlerts.filter((a: any) => !a.notified);
      const pendingOrders = orders.filter((o: any) => o.status === 'pending');
      const pendingSubscriptions = subscriptions.filter(
        (s: any) => s.status === 'active' && (s.deliveries_count || 0) === 0,
      );
      const pendingPaymentSessions = paymentSessions.filter((s: any) => s.status === 'pending');

      return {
        messages, orders, subscriptions, stockAlerts, orderReviews,
        paymentSessions,
        pendingMessages, pendingStockAlerts, pendingOrders, pendingSubscriptions, pendingPaymentSessions,
        totalPending: pendingMessages.length + pendingStockAlerts.length + pendingOrders.length
          + pendingSubscriptions.length + pendingPaymentSessions.length,
      };
    },
  });
};