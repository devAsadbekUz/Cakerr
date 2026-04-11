'use client';

import React, { useState, useEffect, useRef, ChangeEvent, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import ContactSheet from '@/app/components/home/ContactSheet';
import { Product } from '@/app/types';
import { useLanguage } from '@/app/context/LanguageContext';

interface HomepageShellProps {
    categories: any[];
    productsByCategory: Record<string, Product[]>;
    children: React.ReactNode;
}

// Context for efficient search consumption
const SearchContext = createContext({ searchTerm: '' });
export const useSearch = () => useContext(SearchContext);

export default function HomepageShell({ categories, productsByCategory, children }: HomepageShellProps) {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const lastScrollY = useRef(0);
    const isScrollingRef = useRef(false);
    const isCollapsedRef = useRef(false);

    // --- Category click → smooth scroll ---
    const handleCategorySelect = (id: string) => {
        setActiveCategory(id);
        isScrollingRef.current = true;
        const element = document.getElementById(`category-${id}`);
        if (element) {
            const headerOffset = isHeaderCollapsed ? 210 : 275;
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

    const [isBooted, setIsBooted] = useState(false);
    const activeCategoryRef = useRef(activeCategory);

    // --- Staged Booting: Delay non-critical background math ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBooted(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        activeCategoryRef.current = activeCategory;
    }, [activeCategory]);

    // --- IntersectionObserver for Scroll-Spy (Performance optimized) ---
    useEffect(() => {
        // Disable Scroll-Spy during the first 1.5s of boot to prevent 100% CPU lock
        if (!isBooted || categories.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px', // Trigger when section is in the upper middle
            threshold: 0
        };

        const lastUpdateTime = { current: 0 };
        const THROTTLE_MS = 150;

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingRef.current) return;

            const now = Date.now();
            if (now - lastUpdateTime.current < THROTTLE_MS) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace('category-', '');
                    if (id !== activeCategoryRef.current) {
                        setActiveCategory(id);
                        lastUpdateTime.current = now;
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        categories.forEach((cat) => {
            const el = document.getElementById(`category-${cat.id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories, isBooted]);

    // --- Header Collapse logic ---
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const collapsed = isCollapsedRef.current;

            // Hysteresis: collapse past 150px, only expand once back below 120px.
            // Prevents rapid state toggling when scrolling near the threshold.
            const next = collapsed ? currentScrollY > 120 : currentScrollY > 150;

            if (next !== collapsed) {
                isCollapsedRef.current = next;
                setIsHeaderCollapsed(next);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                    {t('noProducts')} 😔
                </div>
            )}

            <ContactSheet isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </SearchContext.Provider>
    );
}
