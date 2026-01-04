'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Header from '@/app/components/layout/Header';
import HeroBanner from '@/app/components/home/HeroBanner';
import ProductGrid from '@/app/components/products/ProductGrid';
import ContactSheet from '@/app/components/home/ContactSheet';
import ActiveOrderCard from '@/app/components/home/ActiveOrderCard';
import { useSupabase } from '@/app/context/SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';
import { productService } from '@/app/services/productService';

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('birthday');
  const [searchTerm, setSearchTerm] = useState('');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isScrollingRef = useRef(false);
  const supabase = createClient();
  const { user } = useSupabase();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Fetch Categories
      const { data: cData } = await supabase
        .from('categories')
        .select('*');

      const loadedCategories = cData || [];
      // Ensure 'custom' category is present if not in DB, though it should be.
      // Assuming 'custom' was added via seed, if not we can push it manually or rely on DB.
      // Based on seed, 'custom' is in DB.
      setCategories(loadedCategories);

      // 2. Fetch Products via Service
      const pData = await productService.getActiveProducts();
      setProducts(pData);

      // 3. Fetch Active Order (Only if user exists)
      if (user) {
        const { data: oData } = await supabase
          .from('orders')
          .select('id, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5); // Fetch recent orders

        if (oData) {
          // Filter in JS to be 100% sure it matches Profile logic
          const active = oData.find(o => !['completed', 'cancelled'].includes(o.status));
          if (active) setActiveOrder(active);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [user]); // Re-run when user auth state loads/changes

  // Filter products based on search
  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    isScrollingRef.current = true;
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const headerOffset = 220;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      if (categories.length === 0) return;

      const categoryElements = categories.filter(c => c.id !== 'custom').map(c => ({
        id: c.id,
        element: document.getElementById(`category-${c.id}`)
      }));

      const scrollPosition = window.scrollY + 250;

      for (const section of categoryElements) {
        if (section.element) {
          const { offsetTop, offsetHeight } = section.element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  return (
    <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>

      <Header
        searchTerm={searchTerm}
        onSearchChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
        onContactClick={() => setIsContactOpen(true)}
        categories={categories}
      />

      <div style={{ padding: '0 20px', marginTop: '10px' }}>
        {activeOrder && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>Faol buyurtmalar</h3>
            <ActiveOrderCard
              orderId={activeOrder.id}
              status={activeOrder.status === 'new' ? 'Yangi' :
                activeOrder.status === 'confirmed' ? 'Tasdiqlandi' :
                  activeOrder.status === 'preparing' ? 'Tayyorlanmoqda' :
                    activeOrder.status === 'delivering' ? 'Yetkazilmoqda' : activeOrder.status}
            />
          </div>
        )}
        <HeroBanner />
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '40px', marginTop: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Yuklanmoqda...</h2>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Pishiriqlarimizni tayyorlayapmiz ✨</p>
          </div>
        ) : (
          <>
            {categories.filter(c => c.id !== 'custom').map((cat) => {
              const productsInCategory = filteredProducts.filter(p => p.categoryId === cat.id);

              if (productsInCategory.length === 0) return null;

              return (
                <section key={cat.id} id={`category-${cat.id}`} style={{ scrollMarginTop: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>{cat.label}</h2>
                    <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{productsInCategory.length} tortlar</span>
                  </div>
                  <ProductGrid products={productsInCategory} />
                </section>
              );
            })}

            {searchTerm && filteredProducts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                Hech narsa topilmadi 😔
              </div>
            )}
          </>
        )}
      </div>

      <ContactSheet isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </main>
  );
}
