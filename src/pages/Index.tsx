import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';
import HeroSlider from '@/components/HeroSlider';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import SEO from '@/components/SEO';
import KddHighlights from '@/components/KddHighlights';
import { useQuery } from '@tanstack/react-query';
import { useCategoryTree } from '@/hooks/useStore';
import { Skeleton } from '@/components/ui/skeleton';

/* ---------- helpers ---------- */

const SectionTitle = ({ title }: { title: string }) => (
  <h2 className="text-center text-2xl sm:text-3xl font-extrabold font-cairo text-foreground tracking-tight my-6">
    {title}
  </h2>
);

/** Horizontal carousel rail with overlay nav arrows — matches makanifoods.com layout */
const Carousel = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="prev"
        onClick={() => scroll(-1)}
        className="hidden sm:flex absolute start-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-secondary"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="next"
        onClick={() => scroll(1)}
        className="flex absolute end-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-secondary"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide px-1 pb-2"
      >
        {children}
      </div>
    </div>
  );
};

const ProductRow = ({ products }: { products: any[] | undefined }) => {
  if (!products) {
    return (
      <Carousel>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="snap-start shrink-0 w-[60%] sm:w-[40%] md:w-[28%] lg:w-[22%]">
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ))}
      </Carousel>
    );
  }
  return (
    <Carousel>
      {products.map((p, i) => (
        <div
          key={p.id}
          className="snap-start shrink-0 w-[60%] sm:w-[40%] md:w-[28%] lg:w-[22%]"
        >
          <ProductCard product={p} index={i} />
        </div>
      ))}
    </Carousel>
  );
};

/* ---------- categories carousel — large image card style ---------- */

const CategoriesCarousel = ({ lang }: { lang: string }) => {
  const { data: tree } = useCategoryTree();
  const subs = (tree || []).flatMap((t) => t.children || []).filter((c) => c.image_url);
  if (!subs.length) return null;
  return (
    <Carousel>
      {subs.map((c) => (
        <Link
          key={c.id}
          to={`/category/${c.slug}`}
          className="snap-start shrink-0 w-[78%] sm:w-[55%] md:w-[40%] lg:w-[30%] group"
        >
          <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden border border-border bg-white">
            <img
              src={c.image_url!}
              alt={lang === 'ar' ? c.name_ar : c.name_en}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-end p-5">
              <h3 className="text-white font-cairo font-extrabold text-lg sm:text-xl text-end max-w-[70%] leading-tight drop-shadow-lg">
                {lang === 'ar' ? c.name_ar : c.name_en}
              </h3>
            </div>
          </div>
        </Link>
      ))}
    </Carousel>
  );
};

/* ---------- main page ---------- */

const Index = () => {
  const { lang } = useLanguage();

  const { data: latest } = useQuery({
    queryKey: ['home-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(slug, name_ar, name_en)')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: featured } = useQuery({
    queryKey: ['home-featured', latest?.map((p: any) => p.id).join(',') || ''],
    enabled: !!latest,
    queryFn: async () => {
      const latestIds = new Set((latest || []).map((p: any) => p.id));
      const picked = new Map<string, any>();

      // 1) Real best sellers: aggregate quantities from order_items
      const { data: sold } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .not('product_id', 'is', null);
      if (sold && sold.length) {
        const totals = new Map<string, number>();
        for (const row of sold as any[]) {
          if (!row.product_id) continue;
          totals.set(row.product_id, (totals.get(row.product_id) || 0) + Number(row.quantity || 0));
        }
        const topIds = [...totals.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => id)
          .slice(0, 24);
        if (topIds.length) {
          const { data: bestRows } = await supabase
            .from('products')
            .select('*, category:categories(slug, name_ar, name_en)')
            .eq('in_stock', true)
            .in('id', topIds);
          for (const id of topIds) {
            const p = bestRows?.find((r: any) => r.id === id);
            if (p && !picked.has(id)) picked.set(id, p);
            if (picked.size >= 12) break;
          }
        }
      }

      // 2) Explicitly featured products (admin-curated)
      if (picked.size < 12) {
        const { data: explicit } = await supabase
          .from('products')
          .select('*, category:categories(slug, name_ar, name_en)')
          .eq('in_stock', true)
          .eq('featured', true)
          .limit(24);
        for (const p of explicit || []) {
          if (!picked.has((p as any).id)) picked.set((p as any).id, p);
          if (picked.size >= 12) break;
        }
      }

      // 3) Fill remainder with biggest discounts, excluding the "New Arrivals" rail
      if (picked.size < 12) {
        const { data: discounted } = await supabase
          .from('products')
          .select('*, category:categories(slug, name_ar, name_en)')
          .eq('in_stock', true)
          .not('old_price', 'is', null)
          .order('old_price', { ascending: false })
          .limit(60);
        for (const p of discounted || []) {
          const id = (p as any).id;
          if (picked.has(id) || latestIds.has(id)) continue;
          picked.set(id, p);
          if (picked.size >= 12) break;
        }
      }

      // 4) Last resort: oldest products (opposite of "New Arrivals")
      if (picked.size < 12) {
        const { data: oldest } = await supabase
          .from('products')
          .select('*, category:categories(slug, name_ar, name_en)')
          .eq('in_stock', true)
          .order('created_at', { ascending: true })
          .limit(60);
        for (const p of oldest || []) {
          const id = (p as any).id;
          if (picked.has(id) || latestIds.has(id)) continue;
          picked.set(id, p);
          if (picked.size >= 12) break;
        }
      }

      return [...picked.values()];
    },
  });


  // Category showcases for KDD product lines
  const vendors: { vendor: string; slug: string; ar: string }[] = [
    { vendor: 'Dairy', slug: 'kdd-dairy', ar: 'الألبان' },
    { vendor: 'Juices', slug: 'kdd-juices', ar: 'العصائر' },
    { vendor: 'Ice Cream', slug: 'kdd-icecream', ar: 'الآيس كريم' },
    { vendor: 'Cooking Products', slug: 'kdd-cooking', ar: 'منتجات الطهي' },
  ];

  const useVendor = (slug: string) =>
    useQuery({
      queryKey: ['home-category-rail', slug],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories!inner(slug, name_ar, name_en)')
          .eq('category.slug', slug)
          .eq('in_stock', true)
          .limit(12);
        if (error) throw error;
        return data;
      },
    });

  const dairy = useVendor('kdd-dairy');
  const juices = useVendor('kdd-juices');
  const icecream = useVendor('kdd-icecream');
  const cooking = useVendor('kdd-cooking');
  const vendorQueries = [dairy, juices, icecream, cooking];


  return (
    <Layout>
      <SEO
        title={
          lang === 'ar'
            ? 'كي دي دي — ألبان وعصائر وآيس كريم منذ 1962'
            : 'KDD — Dairy, Juices & Ice Cream since 1962'
        }
        description={
          lang === 'ar'
            ? 'كي دي دي — ألبان وعصائر وآيس كريم منذ 1962. توصيل سريع لكل مناطق الكويت.'
            : 'KDD — Dairy, juices, ice cream and cooking products since 1962. Fast delivery across Kuwait.'
        }
        type="website"
      />

      <HeroSlider />

      <div className="container mx-auto px-3 sm:px-4">
        {/* New Arrivals */}
        <section className="py-6 sm:py-8">
          <SectionTitle title={lang === 'ar' ? 'وصل حديثاً' : 'New Arrivals'} />
          <ProductRow products={latest} />
        </section>

        {/* Best Sellers */}
        <section className="py-6 sm:py-8">
          <SectionTitle title={lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers'} />
          <ProductRow products={featured} />
        </section>

        {/* Shop by Category */}
        <section className="py-6 sm:py-8">
          <SectionTitle title={lang === 'ar' ? 'تسوّق حسب الفئة' : 'Shop by Category'} />
          <CategoriesCarousel lang={lang} />
        </section>

      </div>
      <KddHighlights />
      <div className="container mx-auto px-3 sm:px-4">
        {/* Brand rails */}
        {vendors.map((v, idx) => {
          const q = vendorQueries[idx];
          if (!q.data || q.data.length === 0) return null;
          return (
            <section key={v.vendor} className="py-6 sm:py-8">
              <SectionTitle title={lang === 'ar' ? v.ar : v.vendor} />
              <ProductRow products={q.data} />
            </section>
          );
        })}
      </div>
    </Layout>
  );
};

export default Index;
