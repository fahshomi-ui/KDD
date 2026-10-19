import React, { createContext, useContext, useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'makani_cart_v1';
const COUPON_STORAGE_KEY = 'makani_coupon_v1';
import { DbProduct } from '@/hooks/useStore';
import { getPrepFeesForItem } from '@/lib/preparations';

export interface CartItem {
  product: DbProduct;
  quantity: number;
  preparations?: string[];
}

const DELIVERY_FEE = 1.000;

interface CartContextType {
  items: CartItem[];
  addItem: (product: DbProduct, quantity?: number, preparations?: string[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  preparationFees: number;
  discount: number;
  discountPercent: number;
  couponCode: string;
  setCouponDiscount: (code: string, percent: number) => void;
  removeCoupon: () => void;
  deliveryFee: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  // Site-wide auto-applied welcome discount (matches homepage lightbox + promo banner)
  const AUTO_COUPON_CODE = 'WELCOME50';
  const AUTO_COUPON_PERCENT = 50;
  const [couponCode, setCouponCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) || '{}').code;
      return saved || AUTO_COUPON_CODE;
    } catch { return AUTO_COUPON_CODE; }
  });
  const [discountPercent, setDiscountPercent] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) || '{}').percent;
      return typeof saved === 'number' ? saved : AUTO_COUPON_PERCENT;
    } catch { return AUTO_COUPON_PERCENT; }
  });

  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    try { localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code: couponCode, percent: discountPercent })); } catch {}
  }, [couponCode, discountPercent]);

  const addItem = (product: DbProduct, quantity = 1, preparations?: string[]) => {
    setItems(prev => {
      const prepKey = (preparations || []).sort().join(',');
      const existing = prev.find(i => i.product.id === product.id && (i.preparations || []).sort().join(',') === prepKey);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product, quantity, preparations }];
    });
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.product.id !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => { setItems([]); setCouponCode(''); setDiscountPercent(0); };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const preparationFees = items.reduce((sum, i) => sum + getPrepFeesForItem(i.preparations, i.quantity), 0);
  const discount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discount;
  const deliveryFee = DELIVERY_FEE;
  const total = afterDiscount + preparationFees + deliveryFee;

  const setCouponDiscount = (code: string, percent: number) => {
    setCouponCode(code);
    setDiscountPercent(percent);
  };

  const removeCoupon = () => { setCouponCode(''); setDiscountPercent(0); };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, preparationFees, discount, discountPercent, couponCode, setCouponDiscount, removeCoupon, deliveryFee, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
