import AdminLoginForm from '@/components/AdminLoginForm';
import { verifyAdminSession, adminLogout } from '@/lib/adminAuth';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowLeft, Search, Plus, Pencil, Trash2, Upload, Tag, FolderTree, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_AUTH_KEY = 'admin_auth';
const ADMIN_AUTH_VAL = 'true';

interface Category {
  id: string; slug: string; name_ar: string; name_en: string;
  parent_id: string | null; image_url: string | null;
  icon: string | null; sort_order: number;
}
interface Product {
  id: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  price: number; old_price: number | null;
  image_url: string | null; category_id: string | null;
  weight: string | null; origin: string | null;
  in_stock: boolean; featured: boolean;
  stock_quantity: number; low_stock_threshold: number;
  is_ai_generated_image: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

const uploadImage = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage
    .from('product-images')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (urlError || !data) throw urlError ?? new Error('URL_FAILED');
  return data.signedUrl;
};

/* ============ Product form dialog ============ */
const ProductDialog = ({
  open, onClose, initial, categories, onSaved,
}: {
  open: boolean; onClose: () => void;
  initial: Partial<Product> | null;
  categories: Category[];
  onSaved: () => void;
}) => {
  const [f, setF] = useState<Partial<Product>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setF(initial || { in_stock: true, featured: false, stock_quantity: 999, low_stock_threshold: 5, is_ai_generated_image: false });
  }, [open, initial]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setF((p) => ({ ...p, image_url: url, is_ai_generated_image: false }));
      toast.success('تم رفع الصورة');
    } catch (e: any) { toast.error('فشل رفع الصورة: ' + e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.name_ar || !f.name_en || f.price == null) {
      toast.error('الاسم والسعر مطلوبان'); return;
    }
    setSaving(true);
    const payload: any = {
      name_ar: f.name_ar, name_en: f.name_en,
      description_ar: f.description_ar || null, description_en: f.description_en || null,
      price: Number(f.price), old_price: f.old_price ? Number(f.old_price) : null,
      image_url: f.image_url || null, category_id: f.category_id || null,
      weight: f.weight || null, origin: f.origin || null,
      in_stock: !!f.in_stock, featured: !!f.featured,
      stock_quantity: Number(f.stock_quantity ?? 999),
      low_stock_threshold: Number(f.low_stock_threshold ?? 5),
      is_ai_generated_image: !!f.is_ai_generated_image,
    };
    const { error } = f.id
      ? await supabase.from('products').update(payload).eq('id', f.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) { toast.error('فشل الحفظ: ' + error.message); return; }
    toast.success(f.id ? 'تم التحديث' : 'تمت الإضافة');
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-cairo">
        <DialogHeader><DialogTitle>{f.id ? 'تعديل منتج' : 'منتج جديد'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold">الاسم بالعربية *</label><Input value={f.name_ar || ''} onChange={(e) => setF({ ...f, name_ar: e.target.value })} /></div>
          <div><label className="text-xs font-bold">Name (English) *</label><Input value={f.name_en || ''} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></div>
          <div><label className="text-xs font-bold">السعر (د.ك) *</label><Input type="number" step="0.001" value={f.price ?? ''} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></div>
          <div><label className="text-xs font-bold">السعر قبل الخصم</label><Input type="number" step="0.001" value={f.old_price ?? ''} onChange={(e) => setF({ ...f, old_price: e.target.value ? Number(e.target.value) : null as any })} /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold">الفئة</label>
            <Select value={f.category_id || ''} onValueChange={(v) => setF({ ...f, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar} ({c.slug})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-bold">الوزن</label><Input value={f.weight || ''} onChange={(e) => setF({ ...f, weight: e.target.value })} /></div>
          <div><label className="text-xs font-bold">المصدر / العلامة</label><Input value={f.origin || ''} onChange={(e) => setF({ ...f, origin: e.target.value })} /></div>
          <div><label className="text-xs font-bold">الكمية المتوفرة</label><Input type="number" value={f.stock_quantity ?? 999} onChange={(e) => setF({ ...f, stock_quantity: Number(e.target.value) })} /></div>
          <div><label className="text-xs font-bold">حد التنبيه</label><Input type="number" value={f.low_stock_threshold ?? 5} onChange={(e) => setF({ ...f, low_stock_threshold: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-bold">وصف بالعربية</label><Textarea rows={3} value={f.description_ar || ''} onChange={(e) => setF({ ...f, description_ar: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-bold">Description (English)</label><Textarea rows={3} value={f.description_en || ''} onChange={(e) => setF({ ...f, description_en: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold">صورة المنتج</label>
            <div className="flex items-center gap-3 mt-1">
              {f.image_url && <img src={f.image_url} alt="" className="w-16 h-16 rounded object-cover border" />}
              <Input value={f.image_url || ''} placeholder="رابط الصورة" onChange={(e) => setF({ ...f, image_url: e.target.value })} />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-secondary text-foreground text-xs border hover:bg-secondary/80">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} رفع
                </span>
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} /> متوفر</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> الأكثر مبيعاً</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? '...' : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ Category form dialog ============ */
const CategoryDialog = ({
  open, onClose, initial, categories, onSaved,
}: {
  open: boolean; onClose: () => void;
  initial: Partial<Category> | null;
  categories: Category[];
  onSaved: () => void;
}) => {
  const [f, setF] = useState<Partial<Category>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setF(initial || { sort_order: 0 });
  }, [open, initial]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setF((p) => ({ ...p, image_url: url }));
      toast.success('تم رفع الصورة');
    } catch (e: any) { toast.error('فشل رفع الصورة: ' + e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.name_ar || !f.name_en) { toast.error('الاسم مطلوب'); return; }
    const slug = f.slug?.trim() || slugify(f.name_en);
    if (!slug) { toast.error('Slug مطلوب'); return; }
    setSaving(true);
    const payload: any = {
      name_ar: f.name_ar, name_en: f.name_en, slug,
      parent_id: f.parent_id || null,
      image_url: f.image_url || null,
      icon: f.icon || null,
      sort_order: Number(f.sort_order ?? 0),
    };
    const { error } = f.id
      ? await supabase.from('categories').update(payload).eq('id', f.id)
      : await supabase.from('categories').insert(payload);
    setSaving(false);
    if (error) { toast.error('فشل الحفظ: ' + error.message); return; }
    toast.success(f.id ? 'تم التحديث' : 'تمت الإضافة');
    onSaved(); onClose();
  };

  // Avoid setting self as parent
  const parentOptions = categories.filter((c) => c.id !== f.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg font-cairo">
        <DialogHeader><DialogTitle>{f.id ? 'تعديل فئة' : 'فئة جديدة'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold">الاسم بالعربية *</label><Input value={f.name_ar || ''} onChange={(e) => setF({ ...f, name_ar: e.target.value })} /></div>
          <div><label className="text-xs font-bold">Name (English) *</label><Input value={f.name_en || ''} onChange={(e) => setF({ ...f, name_en: e.target.value, slug: f.slug || slugify(e.target.value) })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-bold">Slug (رابط) *</label><Input value={f.slug || ''} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold">الفئة الأم (اختياري)</label>
            <Select value={f.parent_id || 'none'} onValueChange={(v) => setF({ ...f, parent_id: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">— بدون (قسم رئيسي) —</SelectItem>
                {parentOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar} ({c.slug})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-bold">أيقونة</label><Input placeholder="emoji أو نص" value={f.icon || ''} onChange={(e) => setF({ ...f, icon: e.target.value })} /></div>
          <div><label className="text-xs font-bold">ترتيب</label><Input type="number" value={f.sort_order ?? 0} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold">صورة الفئة</label>
            <div className="flex items-center gap-3 mt-1">
              {f.image_url && <img src={f.image_url} alt="" className="w-16 h-16 rounded object-cover border" />}
              <Input value={f.image_url || ''} placeholder="رابط الصورة" onChange={(e) => setF({ ...f, image_url: e.target.value })} />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-secondary text-foreground text-xs border hover:bg-secondary/80">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} رفع
                </span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? '...' : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ Page ============ */
const AdminCatalog = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_AUTH_KEY) === ADMIN_AUTH_VAL);
  const [pass, setPass] = useState('');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => { verifyAdminSession().then((ok) => setAuthed(ok)); }, []);

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-all'],
    enabled: authed,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name_ar');
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products-all'],
    enabled: authed,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const catMap = useMemo(() => {
    const m = new Map<string, Category>();
    (categories || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => !q || p.name_ar.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q));
  }, [products, search]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-products-all'] });
    qc.invalidateQueries({ queryKey: ['admin-categories-all'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['category-tree'] });
    qc.invalidateQueries({ queryKey: ['category-products'] });
    qc.invalidateQueries({ queryKey: ['home-latest'] });
    qc.invalidateQueries({ queryKey: ['home-featured'] });
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('حذف هذا المنتج نهائياً؟')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error('فشل: ' + error.message); return; }
    toast.success('تم الحذف'); refreshAll();
  };
  const deleteCategory = async (id: string) => {
    if (!confirm('حذف هذه الفئة؟ تأكد من نقل منتجاتها أولاً.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('فشل: ' + error.message); return; }
    toast.success('تم الحذف'); refreshAll();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AdminLoginForm title="🔒 إدارة الكتالوج" onSuccess={() => setAuthed(true)} />
      </div>
    );
  }

  // Sort categories by parent name → name
  const sortedCats = [...(categories || [])].sort((a, b) => {
    const pa = a.parent_id ? catMap.get(a.parent_id)?.name_ar || '' : '';
    const pb = b.parent_id ? catMap.get(b.parent_id)?.name_ar || '' : '';
    return pa.localeCompare(pb) || (a.sort_order - b.sort_order) || a.name_ar.localeCompare(b.name_ar);
  });

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-cairo font-extrabold text-2xl">إدارة الكتالوج</h1>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="grid grid-cols-2 max-w-xs mb-4">
            <TabsTrigger value="products" className="font-cairo gap-1"><Tag className="w-4 h-4" /> المنتجات</TabsTrigger>
            <TabsTrigger value="categories" className="font-cairo gap-1"><FolderTree className="w-4 h-4" /> الفئات</TabsTrigger>
          </TabsList>

          {/* === PRODUCTS === */}
          <TabsContent value="products">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 font-cairo" />
              </div>
              <Button onClick={() => { setEditingProduct(null); setProductOpen(true); }} className="font-cairo gap-1"><Plus className="w-4 h-4" /> منتج جديد</Button>
            </div>
            <p className="text-xs text-muted-foreground font-cairo mb-2">{filteredProducts.length} منتج</p>

            {loadingProducts ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((p) => {
                  const cat = p.category_id ? catMap.get(p.category_id) : null;
                  return (
                    <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                        : <div className="w-14 h-14 rounded-lg bg-muted" />}
                      <div className="flex-1 min-w-[140px]">
                        <p className="font-cairo font-bold text-sm">{p.name_ar}</p>
                        <p className="text-[11px] text-muted-foreground">{p.name_en}</p>
                        <p className="text-[11px] text-muted-foreground">{cat ? cat.name_ar : '— بدون فئة —'}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-cairo font-extrabold text-sm text-primary">{Number(p.price).toFixed(3)}</p>
                        {p.old_price && <p className="text-[10px] line-through text-muted-foreground">{Number(p.old_price).toFixed(3)}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setEditingProduct(p); setProductOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === CATEGORIES === */}
          <TabsContent value="categories">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-cairo">{sortedCats.length} فئة</p>
              <Button onClick={() => { setEditingCat(null); setCatOpen(true); }} className="font-cairo gap-1"><Plus className="w-4 h-4" /> فئة جديدة</Button>
            </div>
            <div className="space-y-2">
              {sortedCats.map((c) => {
                const parent = c.parent_id ? catMap.get(c.parent_id) : null;
                return (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                    {c.image_url
                      ? <img src={c.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      : <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">{c.icon || '📁'}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-cairo font-bold text-sm truncate">{c.name_ar}</p>
                      <p className="text-[11px] text-muted-foreground truncate">/{c.slug}{parent ? ` · ${parent.name_ar}` : ' · قسم رئيسي'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setEditingCat(c); setCatOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCategory(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ProductDialog
        open={productOpen} onClose={() => setProductOpen(false)}
        initial={editingProduct} categories={categories || []}
        onSaved={refreshAll}
      />
      <CategoryDialog
        open={catOpen} onClose={() => setCatOpen(false)}
        initial={editingCat} categories={categories || []}
        onSaved={refreshAll}
      />
    </div>
  );
};

export default AdminCatalog;
