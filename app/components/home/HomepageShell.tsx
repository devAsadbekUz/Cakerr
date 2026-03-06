'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import Header from '@/app/components/layout/Header';
import ContactSheet from '@/app/components/home/ContactSheet';

interface HomepageShellProps {
    categories: any[];
    children: React.ReactNode;
}

export default function HomepageShell({ categories, children }: HomepageShellProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const isScrollingRef = useRef(false);

    // --- Category click → smooth scroll ---
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

    // --- Scroll-spy: update active category + collapse header ---
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

    // --- Search: hide/show category sections via CSS ---
    useEffect(() => {
        const term = searchTerm.toLowerCase();
        categories.filter(c => c.id !== 'custom').forEach(cat => {
            const section = document.getElementById(`category-${cat.id}`);
            if (!section) return;

            // Find all product cards within this section
            const cards = section.querySelectorAll('[data-product-title]');
            let visibleCount = 0;

            cards.forEach(card => {
                const title = (card.getAttribute('data-product-title') || '').toLowerCase();
                const match = !term || title.includes(term);
                (card as HTMLElement).style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            // Hide entire section if no products match
            (section as HTMLElement).style.display = visibleCount > 0 ? '' : 'none';
        });
    }, [searchTerm, categories]);

    return (
        <>
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
        </>
    );
}
