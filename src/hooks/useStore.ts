import { supabase } from '@/integrations/supabase/client';
import { normalizePhone, syncVisitorIdentity } from '@/lib/visitorIdentity';
import { useQuery } from '@tanstack/react-query';

export interface DbProduct {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  category_id: string | null;
  weight: string | null;
  origin: string | null;
  in_stock: boolean;
  featured: boolean;
  category?: { slug: string; name_ar: string; name_en: string } | null;
}

export const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase.from('products').select('*, category:categories(slug, name_ar, name_en)');
      if (category && category !== 'all') {
        query = query.eq('categories.slug', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (category && category !== 'all') {
        return (data as DbProduct[]).filter(p => p.category?.slug === category);
      }
      return data as DbProduct[];
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, category:categories(slug, name_ar, name_en)').eq('id', id).single();
      if (error) throw error;
      return data as DbProduct;
    },
    enabled: !!id,
  });
};

export const useProductImages = (productId: string) => {
  return useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as { id: string; product_id: string; image_url: string; sort_order: number }[];
    },
    enabled: !!productId,
  });
};


export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });
};

export interface CategoryNode {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  icon: string | null;
  children: CategoryNode[];
  product_count?: number;
}

export const useCategoryTree = () => {
  return useQuery({
    queryKey: ['category-tree'],
    queryFn: async (): Promise<CategoryNode[]> => {
      const { data: cats, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const nodes: Record<string, CategoryNode> = {};
      (cats || []).forEach((c: any) => {
        nodes[c.id] = { ...c, children: [] };
      });
      const roots: CategoryNode[] = [];
      Object.values(nodes).forEach((n) => {
        if (n.parent_id && nodes[n.parent_id]) {
          nodes[n.parent_id].children.push(n);
        } else if (!n.parent_id) {
          roots.push(n);
        }
      });
      // Sort children by sort_order
      const sortRec = (n: CategoryNode) => {
        n.children.sort((a, b) => a.sort_order - b.sort_order);
        n.children.forEach(sortRec);
      };
      roots.sort((a, b) => a.sort_order - b.sort_order);
      roots.forEach(sortRec);
      return roots;
    },
  });
};

/**
 * Fetch products for a category. If the category is a section or main (has children),
 * include all products under any descendant sub-category.
 */
export const useCategoryProducts = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['category-products', slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return [] as DbProduct[];
      // Fetch all categories to resolve descendants
      const { data: cats, error: ce } = await supabase.from('categories').select('id, slug, parent_id');
      if (ce) throw ce;
      const all = cats || [];
      const root = all.find((c: any) => c.slug === slug);
      if (!root) return [] as DbProduct[];
      // BFS to collect descendant ids (including itself)
      const ids = new Set<string>([root.id]);
      let queue = [root.id];
      while (queue.length) {
        const next: string[] = [];
        all.forEach((c: any) => {
          if (c.parent_id && queue.includes(c.parent_id) && !ids.has(c.id)) {
            ids.add(c.id);
            next.push(c.id);
          }
        });
        queue = next;
      }
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(slug, name_ar, name_en)')
        .in('category_id', Array.from(ids));
      if (error) throw error;
      return data as DbProduct[];
    },
  });
};

export const useCategoryBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['category-by-slug', slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
};

export const useCoupon = () => {
  const validateCoupon = async (code: string) => {
    const { data, error } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('active', true).maybeSingle();
    if (error || !data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    return data;
  };
  return { validateCoupon };
};

export const createOrder = async (orderData: {
  customer_name: string;
  customer_phone: string;
  area: string;
  block?: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  payment_method: 'card' | 'knet';
  subtotal: number;
  discount: number;
  prep_fees?: number;
  total: number;
  coupon_code?: string;
  delivery_date?: string;
  delivery_window?: string;
  location_lat?: number;
  location_lng?: number;
  location_label?: string;
  items: { product_id: string; product_name_ar: string; product_name_en: string; quantity: number; unit_price: number; preparations?: string[] }[];
}) => {
  const orderNumber = 'MF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    order_number: orderNumber,
    customer_name: orderData.customer_name,
    customer_phone: normalizePhone(orderData.customer_phone),
    area: orderData.area,
    block: orderData.block,
    street: orderData.street,
    building: orderData.building,
    floor: orderData.floor,
    apartment: orderData.apartment,
    notes: orderData.notes,
    payment_method: orderData.payment_method,
    subtotal: orderData.subtotal,
    discount: orderData.discount,
    prep_fees: orderData.prep_fees ?? 0,
    total: orderData.total,
    coupon_code: orderData.coupon_code,
    delivery_date: orderData.delivery_date,
    delivery_window: orderData.delivery_window,
    location_lat: orderData.location_lat,
    location_lng: orderData.location_lng,
    location_label: orderData.location_label,
  }).select().single();

  if (orderError) throw orderError;

  const { error: itemsError } = await supabase.from('order_items').insert(
    orderData.items.map(item => ({ ...item, order_id: order.id, preparations: item.preparations || [] } as any))
  );

  if (itemsError) throw itemsError;

  // اربط الطلب ببطاقة الزائر في لوحة التحكم
  await syncVisitorIdentity({ name: orderData.customer_name, phone: orderData.customer_phone });

  return order;
};
