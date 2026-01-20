'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import Header from '@/app/components/layout/Header';
import HeroBanner from '@/app/components/home/HeroBanner';
import ProductGrid from '@/app/components/products/ProductGrid';
import ContactSheet from '@/app/components/home/ContactSheet';
import ActiveOrderCard from '@/app/components/home/ActiveOrderCard';
import { useSupabase } from '@/app/context/SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';
import { productService } from '@/app/services/productService';

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('birthday');
  const [searchTerm, setSearchTerm] = useState('');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  const isScrollingRef = useRef(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const supabase = React.useMemo(() => createClient(), []);
  const { user } = useSupabase();

  const fetchData = async () => {
    // Only show full-screen loading if we have no data at all
    if (products.length === 0) setLoading(true);

    try {
      // 1. Fetch Categories
      const { data: cData } = await supabase
        .from('categories')
        .select('*');

      const loadedCategories = cData || [];
      setCategories(loadedCategories);

      // 2. Fetch Products via Service
      const pData = await productService.getActiveProducts();
      setProducts(pData);

      // 3. Fetch Active Order (Only if user exists)
      if (user) {
        const { data: oData } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (oData) {
          const active = oData.find(o => !['completed', 'cancelled'].includes(o.status));
          setActiveOrder(active || null);
        } else {
          setActiveOrder(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrder = async () => {
    if (!user) return;
    const { data: oData } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (oData) {
      const active = oData.find(o => !['completed', 'cancelled'].includes(o.status));
      setActiveOrder(active || null);
    }
  };

  useEffect(() => {
    fetchData();

    if (user) {
      const channel = supabase
        .channel(`user-orders-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            console.log('[Realtime] Order change:', payload.eventType, payload.new?.status);
            if (payload.eventType === 'UPDATE') {
              setActiveOrder((prev: any) => {
                if (!prev) return null;
                if (prev.id === payload.new.id) {
                  return { ...prev, status: payload.new.status };
                }
                return prev;
              });
            } else if (payload.eventType === 'INSERT') {
              fetchActiveOrder();
            }
          }
        )
        .subscribe((status, err) => {
          setRealtimeStatus(status);
          if (err) console.error('[Realtime] Error:', err);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        setIsHeaderCollapsed(true);
      } else if (currentScrollY < lastScrollY) {
        setIsHeaderCollapsed(false);
      }
      setLastScrollY(currentScrollY);

      if (isScrollingRef.current) return;
      if (categories.length === 0) return;

      const categoryElements = categories.filter(c => c.id !== 'custom').map(c => ({
        id: c.id,
        element: document.getElementById(`category-${c.id}`)
      }));

      const scrollPosition = currentScrollY + (isHeaderCollapsed ? 120 : 250);
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, lastScrollY, isHeaderCollapsed]);

  return (
    <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh', paddingTop: '260px' }}>
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed', bottom: 80, right: 10,
          background: realtimeStatus === 'SUBSCRIBED' ? '#10B981' : realtimeStatus === 'CHANNEL_ERROR' ? '#EF4444' : '#F59E0B',
          color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          RT: {realtimeStatus}
        </div>
      )}

      <Header
        searchTerm={searchTerm}
        onSearchChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
        onContactClick={() => setIsContactOpen(true)}
        categories={categories}
        isCollapsed={isHeaderCollapsed}
      />

      <div style={{ padding: '0 20px' }}>
        {activeOrder && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>Faol buyurtmalar</h3>
            <ActiveOrderCard
              orderId={activeOrder.id}
              itemName={activeOrder.order_items?.[0]?.name || 'Buyurtma'}
              status={activeOrder.status === 'new' ? 'Yangi' :
                activeOrder.status === 'confirmed' ? 'Tasdiqlandi' :
                  activeOrder.status === 'preparing' ? 'Tayyorlanmoqda' :
                    activeOrder.status === 'ready' ? 'Tayyor' :
                      activeOrder.status === 'delivering' ? 'Yetkazilmoqda' : activeOrder.status}
            />
          </div>
        )}

        {loading && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Yuklanmoqda...</h2>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Pishiriqlarimizni tayyorlayapmiz ✨</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginTop: '20px' }}>
            <HeroBanner />

            {categories.filter(c => c.id !== 'custom').map((cat) => {
              const productsInCategory = filteredProducts.filter(p => (p.categoryId || p.category_id) === cat.id);
              if (productsInCategory.length === 0) return null;

              return (
                <section
                  key={cat.id}
                  id={`category-${cat.id}`}
                  style={{
                    scrollMarginTop: isHeaderCollapsed ? '120px' : '260px',
                    transition: 'scroll-margin-top 0.4s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>{cat.label || cat.name}</h2>
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
          </div>
        )}
      </div>

      <ContactSheet isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </main>
  );
}
