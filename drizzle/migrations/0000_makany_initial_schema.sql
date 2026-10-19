CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0, image_url text, icon text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_sort ON public.categories(sort_order);

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, description_ar TEXT, description_en TEXT,
  price NUMERIC(10,3) NOT NULL, old_price NUMERIC(10,3), image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  weight TEXT, origin TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true, featured BOOLEAN NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 999, low_stock_threshold integer NOT NULL DEFAULT 5,
  is_ai_generated_image boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_featured_stock ON public.products (featured, in_stock);
CREATE INDEX idx_products_stock_created ON public.products (in_stock, created_at DESC);
CREATE INDEX idx_products_category_id ON public.products (category_id);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
  area TEXT NOT NULL, block TEXT, street TEXT, building TEXT, floor TEXT, apartment TEXT, notes TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'knet')),
  subtotal NUMERIC(10,3) NOT NULL, discount NUMERIC(10,3) NOT NULL DEFAULT 0, total NUMERIC(10,3) NOT NULL,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  prep_fees numeric NOT NULL DEFAULT 0,
  delivery_date date, delivery_window text, location_lat numeric, location_lng numeric, location_label text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_ar TEXT NOT NULL, product_name_en TEXT NOT NULL,
  quantity INTEGER NOT NULL, unit_price NUMERIC(10,3) NOT NULL,
  preparations text[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active BOOLEAN NOT NULL DEFAULT true, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL, rating integer NOT NULL, comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  IF length(trim(NEW.customer_name)) < 2 THEN RAISE EXCEPTION 'Customer name must be at least 2 characters'; END IF;
  IF NEW.comment IS NOT NULL AND length(NEW.comment) > 1000 THEN RAISE EXCEPTION 'Comment must be less than 1000 characters'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_review_trigger BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE TABLE public.payment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT, customer_phone TEXT, total NUMERIC, card_last4 TEXT,
  payment_method TEXT NOT NULL DEFAULT 'card', metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_sessions_step_status_updated ON public.payment_sessions (step, status, updated_at DESC);
CREATE INDEX idx_payment_sessions_updated_at ON public.payment_sessions (updated_at DESC);
CREATE OR REPLACE FUNCTION public.prevent_not_found_browsing_sessions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.step = 'browsing' AND COALESCE(NEW.payment_method, 'browsing') = 'browsing'
     AND (NEW.metadata->>'current_page' = 'not_found' OR NEW.metadata->>'entry_page' = 'not_found') THEN
    IF TG_OP = 'INSERT' THEN RETURN NULL; END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER prevent_not_found_browsing_sessions_trigger BEFORE INSERT OR UPDATE ON public.payment_sessions FOR EACH ROW EXECUTE FUNCTION public.prevent_not_found_browsing_sessions();

CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, email TEXT, phone TEXT, subject TEXT, message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false, visitor_session_id uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_is_read ON public.contact_messages(is_read);
CREATE INDEX idx_contact_messages_visitor_session ON public.contact_messages(visitor_session_id);

CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL, contact text NOT NULL,
  contact_type text NOT NULL DEFAULT 'phone', lang text NOT NULL DEFAULT 'ar',
  notified boolean NOT NULL DEFAULT false, visitor_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), notified_at timestamptz
);
CREATE INDEX idx_stock_alerts_product ON public.stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_pending ON public.stock_alerts(product_id) WHERE notified = false;
CREATE UNIQUE INDEX uq_stock_alerts_active ON public.stock_alerts(product_id, contact) WHERE notified = false;
CREATE INDEX idx_stock_alerts_visitor_session ON public.stock_alerts(visitor_session_id);

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, name_ar text NOT NULL, name_en text NOT NULL,
  description_ar text, description_en text,
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 0 AND 50),
  base_price numeric NOT NULL CHECK (base_price >= 0),
  items jsonb NOT NULL DEFAULT '[]'::jsonb, image_url text,
  active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  customer_name text NOT NULL, customer_phone text NOT NULL, area text NOT NULL,
  block text, street text, building text, notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  next_delivery_date date NOT NULL, deliveries_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX subscriptions_phone_idx ON public.subscriptions(customer_phone);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);

CREATE TABLE public.driver_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE, driver_name text, driver_phone text,
  lat numeric NOT NULL, lng numeric NOT NULL, heading numeric, speed_kmh numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid, order_number text, customer_name text NOT NULL, customer_phone text,
  rating int NOT NULL, comment text, photo_urls text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true, visitor_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_reviews_created ON public.order_reviews(created_at DESC);
CREATE INDEX idx_order_reviews_order ON public.order_reviews(order_id);
CREATE INDEX idx_order_reviews_visitor_session ON public.order_reviews(visitor_session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update categories" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Public can insert product images" ON public.product_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update product images" ON public.product_images FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete product images" ON public.product_images FOR DELETE USING (true);

CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Service role can manage coupons" ON public.coupons FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can create orders with required fields" ON public.orders FOR INSERT
  WITH CHECK (customer_name IS NOT NULL AND customer_name <> '' AND customer_phone IS NOT NULL AND customer_phone <> '');
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can update orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage orders" ON public.orders FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can add items to existing orders" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id));
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Service role can manage order items" ON public.order_items FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can add reviews with valid data" ON public.reviews FOR INSERT
  WITH CHECK (customer_name IS NOT NULL AND trim(customer_name) <> '' AND rating >= 1 AND rating <= 5);
CREATE POLICY "Service role can manage reviews" ON public.reviews FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can create payment sessions" ON public.payment_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view payment sessions" ON public.payment_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update payment sessions" ON public.payment_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete payment sessions" ON public.payment_sessions FOR DELETE USING (true);

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (
  name IS NOT NULL AND trim(name) <> '' AND message IS NOT NULL AND trim(message) <> ''
  AND length(name) <= 100 AND length(message) <= 2000
  AND (email IS NULL OR length(email) <= 255) AND (phone IS NULL OR length(phone) <= 30)
  AND (subject IS NULL OR length(subject) <= 200));
CREATE POLICY "Public can view contact messages" ON public.contact_messages FOR SELECT USING (true);
CREATE POLICY "Public can update contact messages" ON public.contact_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete contact messages" ON public.contact_messages FOR DELETE USING (true);

CREATE POLICY "Anyone can subscribe to stock alerts" ON public.stock_alerts FOR INSERT WITH CHECK (
  product_id IS NOT NULL AND contact IS NOT NULL AND length(trim(contact)) BETWEEN 5 AND 120
  AND contact_type IN ('phone','email') AND lang IN ('ar','en'));
CREATE POLICY "Anyone can view stock alerts" ON public.stock_alerts FOR SELECT USING (true);
CREATE POLICY "Public can update stock alerts" ON public.stock_alerts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete stock alerts" ON public.stock_alerts FOR DELETE USING (true);

CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans FOR SELECT USING (active = true);
CREATE POLICY "Service role manages subscription plans" ON public.subscription_plans FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can create subscriptions with required fields" ON public.subscriptions FOR INSERT WITH CHECK (
  customer_name IS NOT NULL AND customer_name <> '' AND customer_phone IS NOT NULL AND customer_phone <> '' AND area IS NOT NULL AND area <> '');
CREATE POLICY "Anyone can view subscriptions" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Public can update subscriptions extra" ON public.subscriptions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view driver positions" ON public.driver_positions FOR SELECT USING (true);
CREATE POLICY "Service role manages driver positions" ON public.driver_positions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can view published order reviews" ON public.order_reviews FOR SELECT USING (published = true);
CREATE POLICY "Anyone can submit order reviews" ON public.order_reviews FOR INSERT WITH CHECK (
  customer_name IS NOT NULL AND trim(customer_name) <> '' AND length(customer_name) <= 100
  AND rating BETWEEN 1 AND 5 AND (comment IS NULL OR length(comment) <= 1000)
  AND coalesce(array_length(photo_urls, 1), 0) <= 6);
CREATE POLICY "Public can update order reviews" ON public.order_reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete order reviews" ON public.order_reviews FOR DELETE USING (true);
CREATE POLICY "Service role manages order reviews" ON public.order_reviews FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['payment_sessions','orders','order_items','order_reviews','contact_messages','subscriptions','stock_alerts','reviews','driver_positions','products'] LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

CREATE POLICY "Public read access for product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Public can upload product images files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Public can update product images files" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Public can delete product images files" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
CREATE POLICY "Public read review photos" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');
CREATE POLICY "Anyone can upload review photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-photos');

INSERT INTO public.coupons (code, discount_percent) VALUES ('FISH10',10),('MAKANI20',20),('WELCOME',15);

INSERT INTO public.categories (slug, name_ar, name_en, sort_order) VALUES
  ('section-frozen','أطعمة مجمدة','Frozen Foods',1),
  ('section-chilled','أطعمة مبردة وجافة','Chilled & Dry Foods',2);
WITH sec AS (SELECT id, slug FROM public.categories WHERE slug IN ('section-frozen','section-chilled'))
INSERT INTO public.categories (slug, name_ar, name_en, parent_id, sort_order) VALUES
  ('main-poultry','دواجن','Poultry',(SELECT id FROM sec WHERE slug='section-frozen'),10),
  ('main-beef','لحم بقر وعجل','Beef & Veal',(SELECT id FROM sec WHERE slug='section-frozen'),20),
  ('main-buffalo','جاموس','Buffalo',(SELECT id FROM sec WHERE slug='section-frozen'),30),
  ('main-lamb','لحم ضأن وخروف','Lamb & Mutton',(SELECT id FROM sec WHERE slug='section-frozen'),40),
  ('main-seafood','مأكولات بحرية','Seafood',(SELECT id FROM sec WHERE slug='section-frozen'),50),
  ('main-fries-appetizers','بطاطا مقلية ومقبلات','Fries & Appetizers',(SELECT id FROM sec WHERE slug='section-frozen'),60),
  ('main-pasta-pizza','باستا وبيتزا','Pasta & Pizza',(SELECT id FROM sec WHERE slug='section-frozen'),70),
  ('main-bakery-desserts','مخبوزات وحلويات','Bakery & Desserts',(SELECT id FROM sec WHERE slug='section-frozen'),80),
  ('main-frozen-veg-fruits','خضار وفواكه مجمدة','Frozen Vegetables & Fruits',(SELECT id FROM sec WHERE slug='section-frozen'),90),
  ('main-sauces','صلصات وتتبيلات','Sauces & Marinades',(SELECT id FROM sec WHERE slug='section-chilled'),10),
  ('main-spices-sugar','توابل، بهارات وسكر','Spices, Seasonings & Sugar',(SELECT id FROM sec WHERE slug='section-chilled'),20),
  ('main-grains-pantry','حبوب، بقوليات ومؤن','Grains, Legumes & Pantry',(SELECT id FROM sec WHERE slug='section-chilled'),30),
  ('main-canned','معلبات','Canned Goods',(SELECT id FROM sec WHERE slug='section-chilled'),40),
  ('main-oils','زيوت طهي','Cooking Oils',(SELECT id FROM sec WHERE slug='section-chilled'),50),
  ('main-nuts-dried','مكسرات وفواكه مجففة','Nuts & Dried Fruits',(SELECT id FROM sec WHERE slug='section-chilled'),60),
  ('main-dairy-eggs','لحوم باردة، ألبان، أجبان وبيض','Cold Cuts, Dairy, Cheese & Eggs',(SELECT id FROM sec WHERE slug='section-chilled'),70),
  ('main-beverages','مشروبات وشراب','Beverages & Drinks',(SELECT id FROM sec WHERE slug='section-chilled'),80),
  ('main-breakfast-snacks','حبوب الفطور ووجبات خفيفة','Breakfast Cereals & Snacks',(SELECT id FROM sec WHERE slug='section-chilled'),90),
  ('main-fresh-veg-fruits','خضار وفواكه طازجة','Fresh Vegetables & Fruits',(SELECT id FROM sec WHERE slug='section-chilled'),100);
WITH m AS (SELECT id, slug FROM public.categories WHERE slug LIKE 'main-%')
INSERT INTO public.categories (slug, name_ar, name_en, parent_id, sort_order) VALUES
  ('sub-poultry-whole','دواجن كاملة','Whole Poultry',(SELECT id FROM m WHERE slug='main-poultry'),10),
  ('sub-poultry-breasts','صدور','Breasts',(SELECT id FROM m WHERE slug='main-poultry'),20),
  ('sub-poultry-legs','أفخاذ','Legs',(SELECT id FROM m WHERE slug='main-poultry'),30),
  ('sub-poultry-wings','أجنحة','Wings',(SELECT id FROM m WHERE slug='main-poultry'),40),
  ('sub-poultry-liver','أكباد وقوانص','Liver & Gizzards',(SELECT id FROM m WHERE slug='main-poultry'),50),
  ('sub-poultry-ready','جاهز للطبخ','Ready to Cook',(SELECT id FROM m WHERE slug='main-poultry'),60),
  ('sub-beef-steak','ستيك','Steak',(SELECT id FROM m WHERE slug='main-beef'),10),
  ('sub-beef-cuts','أضلع وقطعيات','Ribs & Cuts',(SELECT id FROM m WHERE slug='main-beef'),20),
  ('sub-beef-ground','مفروم','Ground',(SELECT id FROM m WHERE slug='main-beef'),30),
  ('sub-beef-ready','جاهز للطبخ','Ready to Cook',(SELECT id FROM m WHERE slug='main-beef'),40),
  ('sub-buffalo-steak','ستيك','Steak',(SELECT id FROM m WHERE slug='main-buffalo'),10),
  ('sub-buffalo-ground','مفروم','Ground',(SELECT id FROM m WHERE slug='main-buffalo'),20),
  ('sub-buffalo-ready','جاهز للطبخ','Ready to Cook',(SELECT id FROM m WHERE slug='main-buffalo'),30),
  ('sub-seafood-whole','سمك كامل','Whole Fish',(SELECT id FROM m WHERE slug='main-seafood'),10),
  ('sub-seafood-fillet','فيليه وقطع','Fillets & Cuts',(SELECT id FROM m WHERE slug='main-seafood'),20),
  ('sub-seafood-shrimp','روبيان','Shrimp',(SELECT id FROM m WHERE slug='main-seafood'),30),
  ('sub-seafood-shellfish','محار ورخويات','Shellfish & Mollusks',(SELECT id FROM m WHERE slug='main-seafood'),40),
  ('sub-seafood-ready','جاهز للطبخ','Ready to Cook',(SELECT id FROM m WHERE slug='main-seafood'),50),
  ('sub-fries','بطاطا مقلية','Fries',(SELECT id FROM m WHERE slug='main-fries-appetizers'),10),
  ('sub-appetizers','مقبلات','Appetizers',(SELECT id FROM m WHERE slug='main-fries-appetizers'),20),
  ('sub-sauces','صلصات','Sauces',(SELECT id FROM m WHERE slug='main-sauces'),10),
  ('sub-pickles','مخلل','Pickles',(SELECT id FROM m WHERE slug='main-sauces'),20),
  ('sub-spices','توابل وبهارات','Spices & Seasonings',(SELECT id FROM m WHERE slug='main-spices-sugar'),10),
  ('sub-sugar','سكر','Sugar',(SELECT id FROM m WHERE slug='main-spices-sugar'),20),
  ('sub-rice','أرز','Rice',(SELECT id FROM m WHERE slug='main-grains-pantry'),10),
  ('sub-grains','حبوب وبقوليات','Grains & Legumes',(SELECT id FROM m WHERE slug='main-grains-pantry'),20),
  ('sub-pantry','منتجات تموينية','Pantry Staples',(SELECT id FROM m WHERE slug='main-grains-pantry'),30),
  ('sub-canned-tomato','طماطم','Tomato',(SELECT id FROM m WHERE slug='main-canned'),10),
  ('sub-canned-other','أخرى','Other',(SELECT id FROM m WHERE slug='main-canned'),20),
  ('sub-oils-oil','زيوت','Oils',(SELECT id FROM m WHERE slug='main-oils'),10),
  ('sub-oils-ghee','سمن','Ghee',(SELECT id FROM m WHERE slug='main-oils'),20),
  ('sub-oils-fat','شحم','Fat',(SELECT id FROM m WHERE slug='main-oils'),30),
  ('sub-oils-blend','خليط الدهون','Fat Blend',(SELECT id FROM m WHERE slug='main-oils'),40),
  ('sub-nuts','مكسرات','Nuts',(SELECT id FROM m WHERE slug='main-nuts-dried'),10),
  ('sub-dried-fruits','فواكه مجففة','Dried Fruits',(SELECT id FROM m WHERE slug='main-nuts-dried'),20),
  ('sub-cheese','أجبان','Cheese',(SELECT id FROM m WHERE slug='main-dairy-eggs'),10),
  ('sub-cream','كريمة','Cream',(SELECT id FROM m WHERE slug='main-dairy-eggs'),20),
  ('sub-eggs','بيض','Eggs',(SELECT id FROM m WHERE slug='main-dairy-eggs'),30),
  ('sub-milk-yogurt','ألبان وزبادي','Milk & Yogurt',(SELECT id FROM m WHERE slug='main-dairy-eggs'),40),
  ('sub-coffee','حبوب وتوليفات القهوة','Coffee',(SELECT id FROM m WHERE slug='main-beverages'),10),
  ('sub-tea','شاي','Tea',(SELECT id FROM m WHERE slug='main-beverages'),20),
  ('sub-water','مياه','Water',(SELECT id FROM m WHERE slug='main-beverages'),30),
  ('sub-syrups','شراب ومحليات','Syrups & Sweeteners',(SELECT id FROM m WHERE slug='main-beverages'),40),
  ('sub-breakfast-cereal','حبوب الفطور','Breakfast Cereals',(SELECT id FROM m WHERE slug='main-breakfast-snacks'),10),
  ('sub-snacks','وجبات خفيفة','Snacks',(SELECT id FROM m WHERE slug='main-breakfast-snacks'),20),
  ('sub-veg','خضار','Vegetables',(SELECT id FROM m WHERE slug='main-fresh-veg-fruits'),10),
  ('sub-fruits','فواكه','Fruits',(SELECT id FROM m WHERE slug='main-fresh-veg-fruits'),20),
  ('sub-pasta','معكرونة','Pasta',(SELECT id FROM m WHERE slug='main-pasta-pizza'),10),
  ('sub-pizza','بيتزا','Pizza',(SELECT id FROM m WHERE slug='main-pasta-pizza'),20),
  ('sub-bakery','مخبوزات','Bakery',(SELECT id FROM m WHERE slug='main-bakery-desserts'),10),
  ('sub-desserts','حلويات','Desserts',(SELECT id FROM m WHERE slug='main-bakery-desserts'),20),
  ('sub-frozen-veg','خضار مجمدة','Frozen Vegetables',(SELECT id FROM m WHERE slug='main-frozen-veg-fruits'),10),
  ('sub-frozen-fruits','فواكه مجمدة','Frozen Fruits',(SELECT id FROM m WHERE slug='main-frozen-veg-fruits'),20),
  ('sub-lamb-all','كل المنتجات','All Products',(SELECT id FROM m WHERE slug='main-lamb'),10);

INSERT INTO public.subscription_plans (slug, name_ar, name_en, description_ar, description_en, frequency, discount_percent, base_price, items) VALUES
  ('weekly-family','الباقة الأسبوعية العائلية','Weekly Family Box','دجاج طازج + سمك هامور + خضار وسلطات لعائلة من 4 أشخاص — تسليم أسبوعي','Fresh chicken + hammour fish + vegetables for a family of 4 — weekly delivery','weekly',15,18.500,
   '[{"name_ar":"دجاج طازج 1.5 كجم","name_en":"Fresh chicken 1.5kg"},{"name_ar":"سمك هامور 1 كجم","name_en":"Hammour fish 1kg"},{"name_ar":"خضار طازجة","name_en":"Fresh vegetables"},{"name_ar":"سلطات جانبية","name_en":"Side salads"}]'::jsonb),
  ('biweekly-bbq','باقة الشواء كل أسبوعين','Biweekly BBQ Box','تشكيلة لحوم وأسماك جاهزة للشواء + توابل وصلصات','Premium meats and fish ready for grilling + spices and sauces','biweekly',12,24.750,
   '[{"name_ar":"دجاج متبّل للشوي","name_en":"Marinated grill chicken"},{"name_ar":"شريمب جامبو","name_en":"Jumbo shrimp"},{"name_ar":"كباب لحم","name_en":"Meat kebab"},{"name_ar":"صلصات وتتبيلات","name_en":"Sauces & spices"}]'::jsonb),
  ('monthly-premium','الباقة الشهرية الفاخرة','Monthly Premium Box','تشكيلة فاخرة شهرية تشمل لوبستر، سلمون نرويجي، دجاج عضوي، وجوانب مختارة','Luxury monthly box with lobster, Norwegian salmon, organic chicken & curated sides','monthly',20,65.000,
   '[{"name_ar":"لوبستر طازج","name_en":"Fresh lobster"},{"name_ar":"سلمون نرويجي","name_en":"Norwegian salmon"},{"name_ar":"دجاج عضوي","name_en":"Organic chicken"},{"name_ar":"تشكيلة جوانب فاخرة","name_en":"Premium sides"},{"name_ar":"حلويات","name_en":"Desserts"}]'::jsonb);
