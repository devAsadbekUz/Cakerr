import { createClient } from '@/app/utils/supabase/server';
import HeroBanner from '@/app/components/home/HeroBanner';
import ProductGrid from '@/app/components/products/ProductGrid';
import HomepageShell from '@/app/components/home/HomepageShell';
import ActiveOrderSection from '@/app/components/home/ActiveOrderSection';
import { Product } from '@/app/types';

export const revalidate = 60; // Revalidate cached data every 60 seconds

export default async function HomePage() {
  const supabase = await createClient();

  // --- Server-side data fetching (parallel) ---
  const [categoriesResult, productsResult, bannersResult] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, title, subtitle, description, base_price, image_url, category_id, is_available, is_ready, variants, details')
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('hero_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  const categories = categoriesResult.data || [];
  const banners = bannersResult.data || [];

  // Map DB products to application Product type
  const products: Product[] = (productsResult.data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    base_price: item.base_price || 0,
    price: item.base_price || 0,
    image_url: item.image_url || '',
    image: item.image_url || '',
    category_id: item.category_id,
    category: 'Boshqa',
    categoryId: item.category_id,
    is_available: item.is_available,
    is_ready: item.is_ready || false,
    variants: Array.isArray(item.variants) ? item.variants : [],
    details: item.details,
  }));

  return (
    <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh', paddingTop: '260px' }}>
      <HomepageShell categories={categories}>
        <div style={{ padding: '0 20px' }}>
          {/* Active order (client-side, user-specific) */}
          <ActiveOrderSection />

          {/* Product catalog (server-rendered) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
            <HeroBanner banners={banners} />

            {categories.filter((c: any) => c.id !== 'custom').map((cat: any) => {
              const productsInCategory = products.filter(p => (p.categoryId || p.category_id) === cat.id);
              if (productsInCategory.length === 0) return null;

              return (
                <section
                  key={cat.id}
                  id={`category-${cat.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>{cat.label || cat.name}</h2>
                    <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{productsInCategory.length} tortlar</span>
                  </div>
                  <ProductGrid products={productsInCategory} />
                </section>
              );
            })}
          </div>
        </div>
      </HomepageShell>
    </main>
  );
}
