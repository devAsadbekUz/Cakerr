'use client';

import { useRef, useEffect } from 'react';
import styles from './CategoryFilter.module.css';
import { CATEGORIES } from '@/app/lib/mockData';
import { useRouter } from 'next/navigation';

interface CategoryFilterProps {
    activeCategory: string;
    onSelectCategory: (id: string) => void;
}

export default function CategoryFilter({ activeCategory, onSelectCategory }: CategoryFilterProps) {
    const router = useRouter();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll the active category into view
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeCategory]);

    const handleCategoryClick = (id: string) => {
        if (id === 'custom') {
            router.push('/yaratish');
        } else {
            onSelectCategory(id);
        }
    };

    return (
        <div className={styles.container} ref={scrollContainerRef}>
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    className={`${styles.item} ${activeCategory === cat.id ? styles.active : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                    data-active={activeCategory === cat.id}
                >
                    <div className={styles.imageWrapper}>
                        {/* Placeholder emoji icons for now until real assets are moved */}
                        <span style={{ fontSize: '24px' }}>
                            {cat.id === 'birthday' && '🎂'}
                            {cat.id === 'wedding' && '💍'}
                            {cat.id === 'anniversary' && '💑'}
                            {cat.id === 'kids' && '🧸'}
                            {cat.id === 'joy' && '🥳'}
                            {cat.id === 'love' && '❤️'}
                            {cat.id === 'custom' && '✨'}
                        </span>
                    </div>
                    <span className={styles.label}>{cat.label}</span>
                </button>
            ))}
        </div>
    );
}
