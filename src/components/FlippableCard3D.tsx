import { useState } from 'react';

interface FlippableCard3DProps {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  holderName?: string;
  lang?: 'ar' | 'en';
}

const FlippableCard3D = ({ cardNumber, expiry, cvv, holderName, lang = 'ar' }: FlippableCard3DProps) => {
  const [flipped, setFlipped] = useState(false);

  const formatCardNumber = (num?: string) => {
    if (!num) return '•••• •••• •••• ••••';
    const clean = num.replace(/\s/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardBrand = (num?: string) => {
    if (!num) return 'unknown';
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'mastercard';
    return 'unknown';
  };

  const brand = getCardBrand(cardNumber);

  return (
    <div className="w-full flex justify-center my-4" dir="ltr">
      <div
        className="relative cursor-pointer select-none"
        style={{ width: 320, height: 200, perspective: 1000 }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="absolute inset-0 transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              background: brand === 'visa'
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
                : brand === 'mastercard'
                ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
                : 'linear-gradient(135deg, #434343 0%, #000000 100%)',
              boxShadow: '0 20px 60px -15px rgba(0,0,0,0.5)',
            }}
          >
            {/* Chip + Brand */}
            <div className="flex items-center justify-between">
              {/* Chip */}
              <div className="w-11 h-8 rounded-md overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 opacity-90" />
                <div className="absolute inset-[2px] grid grid-cols-3 grid-rows-3 gap-[1px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-yellow-500/40 rounded-[1px]" />
                  ))}
                </div>
              </div>
              {/* Brand logo */}
              <div className="text-white/80 text-sm font-bold tracking-wider uppercase">
                {brand === 'visa' && (
                  <span className="text-xl font-extrabold italic text-white">VISA</span>
                )}
                {brand === 'mastercard' && (
                  <div className="flex items-center gap-[-4px]">
                    <div className="w-7 h-7 rounded-full bg-red-500 opacity-80" />
                    <div className="w-7 h-7 rounded-full bg-amber-500 opacity-80 -mr-3" />
                  </div>
                )}
                {brand === 'unknown' && <span className="text-lg">💳</span>}
              </div>
            </div>

            {/* Card Number */}
            <div className="text-white text-lg font-mono tracking-[3px] text-center mt-2">
              {formatCardNumber(cardNumber)}
            </div>

            {/* Bottom: Name + Expiry */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-white/40 text-[8px] uppercase tracking-widest mb-0.5">Card Holder</div>
                <div className="text-white text-xs font-semibold tracking-wide uppercase truncate max-w-[180px]">
                  {holderName || '••••••••'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/40 text-[8px] uppercase tracking-widest mb-0.5">Expires</div>
                <div className="text-white text-xs font-mono font-semibold">
                  {expiry || '••/••'}
                </div>
              </div>
            </div>

            {/* Shine effect */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 60%)',
              }}
            />
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col justify-between overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: brand === 'visa'
                ? 'linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)'
                : brand === 'mastercard'
                ? 'linear-gradient(135deg, #11998e 0%, #2d1b69 100%)'
                : 'linear-gradient(135deg, #000000 0%, #434343 100%)',
              boxShadow: '0 20px 60px -15px rgba(0,0,0,0.5)',
            }}
          >
            {/* Magnetic strip */}
            <div className="w-full h-11 bg-black/70 mt-6" />

            {/* CVV area */}
            <div className="px-5 flex items-center gap-3">
              <div className="flex-1 h-10 bg-white rounded flex items-center justify-end px-3">
                <span className="text-black font-mono text-lg font-bold tracking-[4px] italic">
                  {cvv || '•••'}
                </span>
              </div>
              <div className="text-white/70 text-[10px] uppercase tracking-wider font-bold">CVV</div>
            </div>

            {/* Bottom text */}
            <div className="px-5 pb-5">
              <div className="text-white/20 text-[7px] leading-relaxed">
                This card is property of the issuing bank. Unauthorized use is prohibited. 
                If found, please return to the nearest branch.
              </div>
            </div>

            {/* Shine */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 60%)',
              }}
            />
          </div>
        </div>

        {/* Tap hint */}
        <div className="absolute -bottom-7 left-0 right-0 text-center text-[10px] text-muted-foreground font-cairo">
          {lang === 'ar' ? '👆 اضغط لقلب البطاقة' : '👆 Tap to flip'}
        </div>
      </div>
    </div>
  );
};

export default FlippableCard3D;
