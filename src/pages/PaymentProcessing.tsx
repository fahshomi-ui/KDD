import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';

const PaymentProcessing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || getPaymentFlowState() || {};
  const [phase, setPhase] = useState<'processing' | 'success'>('processing');

  useEffect(() => {
    if (state && Object.keys(state).length > 0) {
      savePaymentFlowState(state);
    }
  }, [state]);

  useEffect(() => {
    if (!state || !state.orderNumber) {
      navigate('/checkout', { replace: true });
      return;
    }

    const t1 = setTimeout(() => setPhase('success'), 1500);
    const t2 = setTimeout(() => {
      navigate('/order-confirmation', { state, replace: true });
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [navigate, state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center px-6">
        {phase === 'processing' ? (
          <>
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">جاري تأكيد الدفع...</h2>
            <p className="text-sm text-muted-foreground">يرجى الانتظار لحظات</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">تم تأكيد الدفع بنجاح!</h2>
            <p className="text-sm text-muted-foreground">جاري تحويلك لصفحة الطلب...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentProcessing;
