import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Check, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import BrandedImage from '@/components/BrandedImage';
import { DbProduct } from '@/hooks/useStore';

interface QuickShopDrawerProps {
  product: DbProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PackOption = 'single' | 'box';

const QuickShopDrawer = ({ product, open, onOpenChange }: QuickShopDrawerProps) => {
  const { lang, t } = useLanguage();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [pack, setPack] = useState<PackOption>('single');
  const [added, setAdded] = useState(false);

  if (!product) return null;
  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const boxSize = 6;
  const unitPrice = Number(product.price);
  const boxPrice = +(unitPrice * boxSize * 0.9).toFixed(3);
  const activePrice = pack === 'box' ? boxPrice : unitPrice;
  const total = +(activePrice * qty).toFixed(3);

  const handleAdd = () => {
    const units = pack === 'box' ? qty * boxSize : qty;
    addItem(product, units);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onOpenChange(false);
      setQty(1);
      setPack('single');
    }, 900);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] p-0">
        <div className="p-5 space-y-4">
          <SheetHeader className="text-start">
            <SheetTitle className="font-cairo text-base">
              {lang === 'ar' ? 'شراء سريع' : 'Quick Shop'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex gap-3 items-start">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
              <BrandedImage
                src={product.image_url || '/placeholder.svg'}
                alt={name}
                className="w-full h-full object-cover"
                lang={lang}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-cairo font-bold text-sm text-foreground line-clamp-2">{name}</h3>
              {product.origin && (
                <p className="text-[11px] text-muted-foreground font-cairo mt-1">{product.origin}</p>
              )}
              <p className="text-primary font-extrabold text-base mt-1 tabular-nums">
                {unitPrice.toFixed(3)} <span className="text-[10px] font-cairo text-muted-foreground">{t('products.kwd')}</span>
              </p>
            </div>
          </div>

          {/* Pack option */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPack('single')}
              className={`rounded-xl border-2 p-3 text-start transition-all ${
                pack === 'single' ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="text-[11px] font-cairo text-muted-foreground">{lang === 'ar' ? 'قطعة واحدة' : 'Single piece'}</div>
              <div className="font-extrabold text-foreground tabular-nums text-sm mt-0.5">{unitPrice.toFixed(3)}</div>
            </button>
            <button
              type="button"
              onClick={() => setPack('box')}
              className={`rounded-xl border-2 p-3 text-start transition-all relative ${
                pack === 'box' ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <span className="absolute top-1 end-1 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">-10%</span>
              <div className="text-[11px] font-cairo text-muted-foreground flex items-center gap-1">
                <Package className="w-3 h-3" />
                {lang === 'ar' ? `صندوق (${boxSize})` : `Box (${boxSize})`}
              </div>
              <div className="font-extrabold text-foreground tabular-nums text-sm mt-0.5">{boxPrice.toFixed(3)}</div>
            </button>
          </div>

          {/* Qty */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl overflow-hidden">
            <button className="px-4 py-3 hover:bg-primary/10 active:scale-90 transition" onClick={() => setQty(Math.max(1, qty - 1))}>
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold tabular-nums">{qty}</span>
            <button className="px-4 py-3 hover:bg-primary/10 active:scale-90 transition" onClick={() => setQty(qty + 1)}>
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-xs font-cairo text-muted-foreground">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
            <span className="text-xl font-extrabold text-primary tabular-nums">{total.toFixed(3)} <span className="text-[10px] font-cairo">{t('products.kwd')}</span></span>
          </div>

          <Button
            disabled={!product.in_stock}
            onClick={handleAdd}
            className={`w-full h-12 rounded-xl font-cairo gap-2 ${added ? 'bg-green-600 hover:bg-green-600' : ''}`}
          >
            {added ? (
              <><Check className="w-5 h-5" /> {lang === 'ar' ? 'تمت الإضافة!' : 'Added!'}</>
            ) : (
              <><ShoppingCart className="w-5 h-5" /> {t('products.addToCart')}</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickShopDrawer;
