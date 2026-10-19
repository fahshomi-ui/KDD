import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChevronDown, Snowflake, Sun, Search, Home, Grid3x3, ChevronRight, Sparkles, Heart, Tag, Package, Gift, Users, Repeat, Zap } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useCategoryTree, type CategoryNode } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo, useCallback } from 'react';
import NotificationsBell from '@/components/NotificationsBell';
import logoLight from '@/assets/makani-foods-logo.png';

const Header = () => {
  const { lang, setLang, t } = useLanguage();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null); // hover state desktop
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [mobileMain, setMobileMain] = useState<string | null>(null);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileShowMore, setMobileShowMore] = useState(false);
  // All quick-link groups collapsed by default; user expands per group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tree } = useCategoryTree();
  const isLoadingTree = !tree;

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
    setMobileMain(null);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock page scroll only while the mobile drawer is open, and aggressively clear any stale lock.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (!mobileOpen) {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overflow = '';
      return;
    }

    const scrollY = window.scrollY;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  // Sections (level 0) — any root node in the tree
  const sections: CategoryNode[] = useMemo(() => tree || [], [tree]);

  const sectionIcon = (slug: string) =>
    slug === 'frozen' || slug.includes('frozen') ? Snowflake : Sun;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-primary/95 backdrop-blur-xl shadow-lg shadow-primary/10'
          : 'bg-primary'
      }`}
    >
      {/* Top bar */}
      <div className="hidden md:flex bg-primary/90 border-b border-primary-foreground/10 text-[11px] text-primary-foreground/70 font-cairo">
        <div className="container mx-auto px-4 h-8 flex items-center justify-between">
          <span>
            {lang === 'ar'
              ? 'توصيل سريع لكل مناطق الكويت'
              : 'Fast delivery across Kuwait'}
          </span>
          <span>
            {lang === 'ar'
              ? 'مرحباً بك في كي دي دي — ألبان وعصائر وآيس كريم منذ 1962'
              : 'Welcome to KDD — dairy, juices & ice cream since 1962'}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 sm:gap-2.5 group flex-shrink min-w-0"
          aria-label="KDD"
        >
          <div className="relative shrink-0">
            <img
              src={logoLight}
              alt="KDD"
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain transition-all duration-300"
            />
            <div className="absolute -bottom-0.5 -end-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-green-400 rounded-full border-2 border-primary animate-pulse" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-cairo font-black text-primary-foreground text-xs sm:text-sm md:text-base whitespace-nowrap">
              {lang === 'ar' ? 'كي دي دي' : 'KDD'}
            </span>
            <span className="hidden md:inline text-[10px] font-cairo text-primary-foreground/60 truncate">
              {lang === 'ar'
                ? 'ألبان وعصائر وآيس كريم منذ 1962'
                : 'Dairy, Juices & Ice Cream since 1962'}
            </span>
          </div>
        </Link>

        {/* Desktop Mega Menu — 2 Sections */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 text-sm font-medium font-cairo rounded-xl transition-all duration-300 ${
              location.pathname === '/'
                ? 'text-primary bg-primary-foreground font-bold shadow-md'
                : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'
            }`}
          >
            {t('nav.home')}
          </Link>

          {sections.map((sec) => {
            const Icon = sectionIcon(sec.slug);
            const isOpen = openSection === sec.slug;
            return (
              <div
                key={sec.id}
                className="relative"
                onMouseEnter={() => setOpenSection(sec.slug)}
                onMouseLeave={() => setOpenSection(null)}
              >
                <Link
                  to={`/category/${sec.slug}`}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium font-cairo rounded-xl transition-all duration-300 ${
                    location.pathname === `/category/${sec.slug}` || isOpen
                      ? 'bg-primary-foreground/15 text-primary-foreground font-bold'
                      : 'text-primary-foreground/85 hover:text-primary-foreground hover:bg-primary-foreground/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {lang === 'ar' ? sec.name_ar : sec.name_en}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Link>

                {/* MEGA PANEL */}
                <div
                  className={`absolute top-full ${
                    sec.slug === 'frozen' ? 'start-0' : 'end-0'
                  } pt-3 transition-all duration-300 ${
                    isOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                  }`}
                  style={{ width: 'min(95vw, 980px)' }}
                >
                  <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-foreground/15 p-6 z-50">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-cairo font-black text-foreground text-lg leading-tight">
                            {lang === 'ar' ? sec.name_ar : sec.name_en}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-cairo">
                            {lang === 'ar'
                              ? `${sec.children.length} فئة • منتجات متنوعة`
                              : `${sec.children.length} categories • Wide variety`}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/category/${sec.slug}`}
                        onClick={() => setOpenSection(null)}
                        className="text-xs font-cairo font-bold text-primary hover:underline whitespace-nowrap"
                      >
                        {lang === 'ar' ? 'تسوّق الكل ←' : 'Shop All →'}
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-x-6 gap-y-5 max-h-[60vh] overflow-y-auto">
                      {sec.children.map((main) => (
                        <div key={main.id} className="min-w-0">
                          <Link
                            to={`/category/${main.slug}`}
                            onClick={() => setOpenSection(null)}
                            className="block font-cairo font-extrabold text-foreground text-sm mb-2 hover:text-primary transition-colors"
                          >
                            {lang === 'ar' ? main.name_ar : main.name_en}
                          </Link>
                          <ul className="space-y-1.5">
                            {main.children.map((sub) => (
                              <li key={sub.id}>
                                <Link
                                  to={`/category/${sub.slug}`}
                                  onClick={() => setOpenSection(null)}
                                  className="block text-[12.5px] font-cairo text-muted-foreground hover:text-primary hover:translate-x-0.5 rtl:hover:-translate-x-0.5 transition-all"
                                >
                                  {lang === 'ar' ? sub.name_ar : sub.name_en}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            to="/products"
            className="px-4 py-2 text-sm font-medium font-cairo rounded-xl text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300"
          >
            {lang === 'ar' ? 'كل المنتجات' : 'All Products'}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <div className="hidden md:flex items-center bg-primary-foreground/10 rounded-xl overflow-hidden border border-primary-foreground/15">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                lang === 'en'
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/60 hover:text-primary-foreground'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-2.5 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                lang === 'ar'
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/60 hover:text-primary-foreground'
              }`}
            >
              عربي
            </button>
          </div>

          <Link to="/products" aria-label="Search">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl transition-all duration-300"
            >
              <Search className="w-5 h-5" />
            </Button>
          </Link>

          <Link to="/wishlist" aria-label="Wishlist" className="relative group hidden sm:block">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl transition-all duration-300"
            >
              <Heart className={`w-5 h-5 group-hover:scale-110 transition-transform duration-300 ${wishlistCount > 0 ? 'fill-current text-rose-300' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-lg">
                  {wishlistCount}
                </span>
              )}
            </Button>
          </Link>

          <Link to="/cart" className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl transition-all duration-300"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[20px] h-5 bg-primary-foreground text-primary text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-lg animate-scale-in">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          <NotificationsBell />

          {/* Mobile language toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            aria-label="Toggle language"
            className="md:hidden h-9 min-w-[40px] px-2.5 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/15 text-primary-foreground text-[11px] font-extrabold font-cairo transition-all duration-300 flex items-center justify-center"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 md:hidden text-primary-foreground/70 hover:bg-primary-foreground/10 rounded-xl"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* ===== MOBILE NAVIGATION (Premium Drawer) ===== */}
      {/* Backdrop */}
      <div
        onClick={closeMobileMenu}
        className={`md:hidden fixed inset-0 z-[60] bg-foreground/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 ${lang === 'ar' ? 'end-0' : 'start-0'} z-[70] h-[100dvh] w-full max-w-none bg-background shadow-2xl shadow-foreground/30 flex flex-col transition-transform duration-300 ease-out sm:w-[88%] sm:max-w-sm ${
          mobileOpen
            ? 'translate-x-0'
            : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full')
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-primary text-primary-foreground flex-shrink-0">
          <span className="font-cairo font-black text-base">
            {lang === 'ar' ? 'القائمة' : 'Menu'}
          </span>
          <button
            onClick={closeMobileMenu}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-primary-foreground/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b border-border bg-muted/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = mobileSearch.trim();
              closeMobileMenu();
              navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
            }}
            className="relative"
          >
            <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
              className="ps-8 h-9 font-cairo bg-background border-border rounded-md text-xs"
            />
          </form>
        </div>

        {/* Scrollable nav body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Home shortcut card — placed above sections */}
          <div className="px-3 pt-3">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                location.pathname === '/'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25'
                  : 'bg-card border-border hover:border-primary/40'
              }`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                location.pathname === '/' ? 'bg-white/20' : 'bg-primary/10'
              }`}>
                <Home className={`w-5 h-5 ${location.pathname === '/' ? 'text-current' : 'text-primary'}`} />
              </span>
              <div className="flex-1 min-w-0 text-start">
                <div className="font-cairo font-extrabold text-[14px] leading-tight">
                  {lang === 'ar' ? 'الرئيسية' : 'Home'}
                </div>
                <div className={`text-[11px] font-cairo leading-tight mt-0.5 ${
                  location.pathname === '/' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {lang === 'ar' ? 'العودة إلى الواجهة الرئيسية' : 'Back to homepage'}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 rtl:rotate-180 shrink-0 ${
                location.pathname === '/' ? 'opacity-80' : 'text-muted-foreground/60'
              }`} />
            </Link>
          </div>

          {/* Sections — moved to top per request */}
          <div className="px-3 pt-3 pb-1 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <h4 className="text-[10px] font-cairo font-extrabold uppercase tracking-wider text-muted-foreground">
                {lang === 'ar' ? 'تسوّق حسب القسم' : 'Shop by Section'}
              </h4>
              <div className="flex-1 h-px bg-border" />
            </div>

            {sections.map((sec) => {
              const Icon = sectionIcon(sec.slug);
              const isSecOpen = mobileSection === sec.slug;
              const accent =
                sec.slug === 'frozen'
                  ? 'text-sky-600 dark:text-sky-400 bg-sky-500/8'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/8';
              return (
                <div
                  key={sec.id}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setMobileSection(isSecOpen ? null : sec.slug);
                      setMobileMain(null);
                    }}
                    className="w-full flex items-center justify-between gap-2 p-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-start min-w-0">
                        <div className="font-cairo font-extrabold text-[13px] text-foreground truncate leading-tight">
                          {lang === 'ar' ? sec.name_ar : sec.name_en}
                        </div>
                        <div className="text-[10px] font-cairo text-muted-foreground leading-tight mt-0.5">
                          {sec.children.length}{' '}
                          {lang === 'ar' ? 'فئة رئيسية' : 'categories'}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 shrink-0 ${
                        isSecOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isSecOpen && (
                    <div className="border-t border-border bg-muted/20 p-2 space-y-1 animate-fade-in">
                      <Link
                        to={`/category/${sec.slug}`}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg font-cairo text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span>
                          {lang === 'ar'
                            ? `تسوّق كل ${sec.name_ar}`
                            : `Shop all ${sec.name_en}`}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </Link>

                      {sec.children.map((main) => {
                        const isMainOpen = mobileMain === main.id;
                        const hasSubs = main.children.length > 0;
                        return (
                          <div
                            key={main.id}
                            className="rounded-lg overflow-hidden bg-background/60"
                          >
                            <div className="flex items-stretch">
                              <Link
                                to={`/category/${main.slug}`}
                                onClick={closeMobileMenu}
                                className="flex-1 py-2.5 ps-3 pe-2 font-cairo font-semibold text-[13px] text-foreground hover:text-primary transition-colors min-w-0 truncate"
                              >
                                {lang === 'ar' ? main.name_ar : main.name_en}
                              </Link>
                              {hasSubs && (
                                <button
                                  onClick={() =>
                                    setMobileMain(isMainOpen ? null : main.id)
                                  }
                                  aria-label="Toggle"
                                  className="px-3 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform duration-300 ${
                                      isMainOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                              )}
                            </div>
                            {hasSubs && isMainOpen && (
                              <div className="px-2 pb-2 pt-0.5 space-y-0.5 animate-fade-in">
                                {main.children.map((sub) => (
                                  <Link
                                    key={sub.id}
                                    to={`/category/${sub.slug}`}
                                    onClick={closeMobileMenu}
                                    className="flex items-center gap-2 py-2 px-3 rounded-md font-cairo text-[12.5px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                                    {lang === 'ar' ? sub.name_ar : sub.name_en}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading skeleton while categories load */}
            {isLoadingTree && sections.length === 0 && (
              <div className="space-y-3 animate-pulse">
                <div className="h-[68px] rounded-2xl border border-border bg-muted/40" />
                <div className="h-[68px] rounded-2xl border border-border bg-muted/40" />
              </div>
            )}
          </div>

          {/* Quick links — geometric compact grid */}
          {(() => {
            type Tone = 'primary' | 'rose' | 'violet' | 'emerald' | 'amber' | 'blue' | 'pink';
            type Item = {
              to: string;
              icon: any;
              labelAr: string;
              labelEn: string;
              tone: Tone;
              badge?: string;
              isActive: (p: string) => boolean;
            };
            const tones: Record<Tone, { iconBg: string; iconText: string; activeBg: string; activeText: string }> = {
              primary: { iconBg: 'bg-primary/10',  iconText: 'text-primary',        activeBg: 'bg-primary',         activeText: 'text-primary-foreground' },
              rose:    { iconBg: 'bg-rose-500/10', iconText: 'text-rose-500',       activeBg: 'bg-rose-500',        activeText: 'text-white' },
              violet:  { iconBg: 'bg-violet-500/10',iconText: 'text-violet-500',    activeBg: 'bg-violet-600',      activeText: 'text-white' },
              emerald: { iconBg: 'bg-emerald-500/10',iconText: 'text-emerald-500',  activeBg: 'bg-emerald-600',     activeText: 'text-white' },
              amber:   { iconBg: 'bg-amber-500/10', iconText: 'text-amber-500',     activeBg: 'bg-amber-600',       activeText: 'text-white' },
              blue:    { iconBg: 'bg-blue-500/10',  iconText: 'text-blue-500',      activeBg: 'bg-blue-600',        activeText: 'text-white' },
              pink:    { iconBg: 'bg-pink-500/10',  iconText: 'text-pink-500',      activeBg: 'bg-pink-600',        activeText: 'text-white' },
            };
            type Group = { titleAr: string; titleEn: string; items: Item[] };
            // المجموعة 1: تسوّق أساسي (الأهم — يصل إليه المستخدم أولاً)
            const groupShop: Group = {
              titleAr: 'تسوّق', titleEn: 'Shop',
              items: [
                { to: '/products', icon: Grid3x3, labelAr: 'المنتجات',  labelEn: 'Products', tone: 'primary', isActive: p => p === '/products' },
              ],
            };
            const allGroups: Group[] = [groupShop];
            // Tile renderer — square icon-over-label cell (App Library style)
            const renderTile = (it: Item) => {
              const Icon = it.icon;
              const tone = tones[it.tone];
              const active = it.isActive(location.pathname);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={closeMobileMenu}
                  className="group relative flex flex-col items-center justify-start gap-1.5 py-2"
                >
                  <span
                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      active
                        ? `${tone.activeBg} ${tone.activeText} shadow-lg shadow-foreground/15 scale-105`
                        : `${tone.iconBg} group-active:scale-95`
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-current' : tone.iconText}`} />
                    {it.badge && (
                      <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-extrabold leading-none ring-2 ring-background shadow">
                        {it.badge}
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] font-cairo font-bold text-center leading-tight line-clamp-2 px-0.5 ${
                    active ? 'text-foreground' : 'text-foreground/80'
                  }`}>
                    {lang === 'ar' ? it.labelAr : it.labelEn}
                  </span>
                </Link>
              );
            };
            return (
              <div className="px-3 pt-3 pb-2 space-y-4">
                {/* Groups — each is collapsible, all collapsed by default */}
                {allGroups.map((g) => {
                  const isOpen = !!openGroups[g.titleEn];
                  return (
                    <section key={g.titleEn} className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((prev) => ({ ...prev, [g.titleEn]: !prev[g.titleEn] }))
                        }
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <span className="w-1 h-3.5 rounded-full bg-primary" />
                        <h3 className="text-[12px] font-cairo font-black tracking-wide text-foreground flex-1 text-start">
                          {lang === 'ar' ? g.titleAr : g.titleEn}
                        </h3>
                        <span className="text-[10px] font-cairo font-bold text-muted-foreground tabular-nums">
                          {g.items.length}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border/60 p-2 animate-fade-in">
                          <div className="grid grid-cols-4 gap-1">
                            {g.items.map(renderTile)}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            );
          })()}

          <div className="pb-4" />
        </div>

        {/* Sticky footer: language + cart */}
        <div className="border-t border-border bg-card p-3 space-y-2.5 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.08)]">
          <div className="flex items-center bg-muted rounded-xl p-1">
            <button
              onClick={() => setLang('ar')}
              className={`flex-1 py-2 text-xs font-cairo font-bold rounded-lg transition-all ${
                lang === 'ar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-2 text-xs font-cairo font-bold rounded-lg transition-all ${
                lang === 'en'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              English
            </button>
          </div>
          <Link
            to="/cart"
            onClick={closeMobileMenu}
            className="flex items-center justify-between gap-2 w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-cairo font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              {lang === 'ar' ? 'عرض السلة' : 'View Cart'}
            </span>
            <span className="bg-primary-foreground text-primary text-[11px] rounded-full px-2 py-0.5 font-extrabold min-w-[24px] text-center">
              {totalItems}
            </span>
          </Link>
        </div>
      </aside>
    </header>
  );
};

export default Header;
