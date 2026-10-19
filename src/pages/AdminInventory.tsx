import AdminLoginForm from '@/components/AdminLoginForm';
import { verifyAdminSession, adminLogout } from '@/lib/adminAuth';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Save, AlertTriangle, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_AUTH_KEY = 'admin_auth';
const ADMIN_AUTH_VAL = 'true';

interface ProductRow {
  id: string;
  name_ar: string;
  name_en: string;
  stock_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
  image_url: string | null;
  price: number;
  is_ai_generated_image: boolean;
}

const AdminInventory = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_AUTH_KEY) === ADMIN_AUTH_VAL);
  const [pass, setPass] = useState('');
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, { stock_quantity?: number; low_stock_threshold?: number; in_stock?: boolean; is_ai_generated_image?: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { verifyAdminSession().then((ok) => setAuthed(ok)); }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    enabled: authed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, name_en, stock_quantity, low_stock_threshold, in_stock, image_url, price, is_ai_generated_image')
        .order('stock_quantity', { ascending: true });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const handleSave = async (p: ProductRow) => {
    const e = edits[p.id] || {};
    const payload = {
      stock_quantity: e.stock_quantity ?? p.stock_quantity,
      low_stock_threshold: e.low_stock_threshold ?? p.low_stock_threshold,
      in_stock: e.in_stock ?? p.in_stock,
      is_ai_generated_image: e.is_ai_generated_image ?? p.is_ai_generated_image,
    };
    setSavingId(p.id);
    const { error } = await supabase.from('products').update(payload).eq('id', p.id);
    setSavingId(null);
    if (error) {
      toast.error('Save failed: ' + error.message);
    } else {
      toast.success('Saved ✓');
      setEdits((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      qc.invalidateQueries({ queryKey: ['admin-inventory'] });
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AdminLoginForm title="🔒 إدارة المخزون" onSuccess={() => setAuthed(true)} />
      </div>
    );
  }

  const filtered = (products || []).filter((p) =>
    !search ||
    p.name_ar.toLowerCase().includes(search.toLowerCase()) ||
    p.name_en.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = (products || []).filter((p) => p.in_stock && p.stock_quantity <= p.low_stock_threshold).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-cairo font-extrabold text-2xl flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Inventory Manager
              </h1>
              <p className="text-xs text-muted-foreground font-cairo">
                {products?.length || 0} products • {lowStockCount} low stock
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 font-cairo"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => {
              const e = edits[p.id] || {};
              const currentStock = e.stock_quantity ?? p.stock_quantity;
              const currentThreshold = e.low_stock_threshold ?? p.low_stock_threshold;
              const currentInStock = e.in_stock ?? p.in_stock;
              const isLow = currentInStock && currentStock <= currentThreshold;
              const isDirty = !!edits[p.id];

              return (
                <div key={p.id} className={`bg-card border rounded-xl p-3 flex flex-wrap items-center gap-3 ${isLow ? 'border-orange-500/50' : 'border-border'}`}>
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name_en} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-[150px]">
                    <p className="font-cairo font-bold text-sm">{p.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{p.name_en} • {Number(p.price).toFixed(3)} KWD</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-cairo text-muted-foreground">Stock:</label>
                    <Input
                      type="number"
                      value={currentStock}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], stock_quantity: Number(ev.target.value) } }))}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-cairo text-muted-foreground">Low at:</label>
                    <Input
                      type="number"
                      value={currentThreshold}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], low_stock_threshold: Number(ev.target.value) } }))}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-cairo cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentInStock}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], in_stock: ev.target.checked } }))}
                    />
                    In stock
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-cairo cursor-pointer" title="صورة مولدة بالذكاء الاصطناعي">
                    <input
                      type="checkbox"
                      checked={(edits[p.id]?.is_ai_generated_image ?? p.is_ai_generated_image) ?? false}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], is_ai_generated_image: ev.target.checked } }))}
                    />
                    صورة AI
                  </label>
                  {isLow && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  <Button
                    size="sm"
                    onClick={() => handleSave(p)}
                    disabled={!isDirty || savingId === p.id}
                    className="font-cairo gap-1 h-8"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingId === p.id ? '...' : 'Save'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInventory;
