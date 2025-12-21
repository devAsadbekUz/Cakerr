'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Header from '@/app/components/layout/Header';

import HeroBanner from '@/app/components/home/HeroBanner';
import CategoryFilter from '@/app/components/home/CategoryFilter';
import ProductGrid from '@/app/components/products/ProductGrid';
import { CATEGORIES, MOCK_PRODUCTS } from '@/app/lib/mockData';



export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('birthday');
  const [searchTerm, setSearchTerm] = useState('');
  const isScrollingRef = useRef(false);

  // Filter products based on search
  const filteredProducts = MOCK_PRODUCTS.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    isScrollingRef.current = true;
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const headerOffset = 180;
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

      const categoryElements = CATEGORIES.filter(c => c.id !== 'custom').map(c => ({
        id: c.id,
        element: document.getElementById(`category-${c.id}`)
      }));

      const scrollPosition = window.scrollY + 250; // Increased offset to trigger earlier

      // Check sections from bottom to top or top to bottom? Top to bottom, find the last one that satisfies condition?
      // Actually standard way: Find the one that covers the viewport top.

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
  }, []);

  return (
    <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>

      <Header searchTerm={searchTerm} onSearchChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} />

      <div style={{ padding: '0 20px' }}>
        <HeroBanner />
      </div>

      <div style={{
        position: 'sticky',
        top: '130px', // Aproxx height of header + search
        zIndex: 40,
        backgroundColor: '#F9FAFB',
        paddingTop: '10px',
        paddingBottom: '10px'
      }}>
        <CategoryFilter activeCategory={activeCategory} onSelectCategory={handleCategorySelect} />
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '40px', marginTop: '20px' }}>
        {CATEGORIES.filter(c => c.id !== 'custom').map((cat) => {
          const products = filteredProducts.filter(p => p.categoryId === cat.id);

          if (products.length === 0 && searchTerm) return null;

          // If not searching, we should probably show all sections even if empty? 
          // Or just show sections with products. Mock data has products for all.

          return (
            <section key={cat.id} id={`category-${cat.id}`} style={{ scrollMarginTop: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>{cat.label}</h2>
                <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{products.length} tortlar</span>
              </div>
              <ProductGrid products={products} />
            </section>
          );
        })}

        {searchTerm && filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            Hech narsa topilmadi 😔
          </div>
        )}
      </div>
    </main>
  );
}

