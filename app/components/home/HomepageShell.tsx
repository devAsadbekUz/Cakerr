'use client';

import React, { useState, useEffect, useRef, ChangeEvent, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import ContactSheet from '@/app/components/home/ContactSheet';
import { Product } from '@/app/types';

interface HomepageShellProps {
    categories: any[];
    productsByCategory: Record<string, Product[]>;
    children: React.ReactNode;
}

// Context for efficient search consumption
const SearchContext = createContext({ searchTerm: '' });
export const useSearch = () => useContext(SearchContext);

export default function HomepageShell({ categories, productsByCategory, children }: HomepageShellProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const lastScrollY = useRef(0);
    const isScrollingRef = useRef(false);

    // --- Category click → smooth scroll ---
    const handleCategorySelect = (id: string) => {
        setActiveCategory(id);
        isScrollingRef.current = true;
        const element = document.getElementById(`category-${id}`);
        if (element) {
            const headerOffset = isHeaderCollapsed ? 120 : 250;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // Re-enable scroll spy after animation
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 800);
        }
    };

    // --- IntersectionObserver for Scroll-Spy (Performance optimized) ---
    useEffect(() => {
        if (categories.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px', // Trigger when section is in the upper middle
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingRef.current) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace('category-', '');
                    setActiveCategory(id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        categories.forEach((cat) => {
            const el = document.getElementById(`category-${cat.id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories]);

    // --- Header Collapse logic ---
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Simple threshold-based collapse for better performance than continuous delta checks
            if (currentScrollY > 150) {
                if (!isHeaderCollapsed) setIsHeaderCollapsed(true);
            } else {
                if (isHeaderCollapsed) setIsHeaderCollapsed(false);
            }
            
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isHeaderCollapsed]);

    return (
        <SearchContext.Provider value={{ searchTerm }}>
            <Header
                searchTerm={searchTerm}
                onSearchChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                activeCategory={activeCategory}
                onSelectCategory={handleCategorySelect}
                onContactClick={() => setIsContactOpen(true)}
                categories={categories}
                isCollapsed={isHeaderCollapsed}
            />

            {children}

            {searchTerm && (
                <div
                    id="no-results-message"
                    style={{ textAlign: 'center', padding: '40px', color: '#6B7280', display: 'none' }}
                >
                    Hech narsa topilmadi 😔
                </div>
            )}

            <ContactSheet isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </SearchContext.Provider>
    );
}
