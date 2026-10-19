import { useState } from 'react';
import logoIcon from '@/assets/makany-foodz-icon.png';

interface BrandedImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  lang?: 'ar' | 'en';
  isAiGenerated?: boolean;
}

const BrandedImage = ({ src, alt, className = '', size = 'md', lang = 'ar', isAiGenerated = false }: BrandedImageProps) => {
  const [loaded, setLoaded] = useState(false);

  const watermarkSize = {
    sm: 'px-1 py-0.5 gap-0.5',
    md: 'px-1.5 py-0.5 gap-1',
    lg: 'px-2 py-1 gap-1.5',
  };
  const logoSize = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const textSize = { sm: 'text-[7px]', md: 'text-[9px]', lg: 'text-[10px]' };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60">
      {/* Loading skeleton */}
      {!loaded && (
        <div className={`absolute inset-0 bg-muted animate-pulse ${className}`} />
      )}

      {/* Image with unified color treatment */}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />

      {/* Subtle vignette overlay for depth */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_40px_rgba(0,0,0,0.2)]" />

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-foreground/10 to-transparent pointer-events-none" />

      {/* Illustrative image disclaimer badge — only for AI-generated images */}
      {isAiGenerated && (
        <div className="absolute top-2 start-2 z-10 flex items-center gap-1 bg-background/85 backdrop-blur-md border border-border/40 rounded-md px-1.5 py-0.5 shadow-sm">
          <svg className="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span className="text-[8px] font-bold font-cairo text-foreground leading-none tracking-tight">
            {lang === 'ar' ? 'صورة توضيحية' : 'Illustrative'}
          </span>
        </div>
      )}

      {/* Brand watermark */}
      <div className={`absolute bottom-2 end-2 flex items-center ${watermarkSize[size]} bg-primary/90 backdrop-blur-sm rounded-md shadow-lg shadow-primary/20 max-w-[60%]`}>
        <img src={logoIcon} alt="" className={`${logoSize[size]} object-contain shrink-0`} />
        <span className={`text-primary-foreground ${textSize[size]} font-bold font-cairo leading-none tracking-wide`}>
          KDD
        </span>
      </div>
    </div>
  );
};

export default BrandedImage;
