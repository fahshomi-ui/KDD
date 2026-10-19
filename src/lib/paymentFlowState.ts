const PAYMENT_FLOW_STORAGE_KEY = 'makani_payment_flow_state';

type PaymentFlowState = Record<string, any>;

export const getPaymentFlowState = <T extends PaymentFlowState = PaymentFlowState>(): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(PAYMENT_FLOW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const savePaymentFlowState = (state: PaymentFlowState) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(PAYMENT_FLOW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures.
  }
};