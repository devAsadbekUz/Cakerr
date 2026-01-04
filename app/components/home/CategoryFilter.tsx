'use client';

import { useRef, useEffect } from 'react';
import styles from './CategoryFilter.module.css';
import { useRouter } from 'next/navigation';

interface Category {
    id: string;
    label: string;
    icon: string;
    image_url?: string;
}

interface CategoryFilterProps {
    activeCategory: string;
    onSelectCategory: (id: string) => void;
    categories: Category[];
}

export default function CategoryFilter({ activeCategory, onSelectCategory, categories }: CategoryFilterProps) {
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
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    className={`${styles.item} ${activeCategory === cat.id ? styles.active : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                    data-active={activeCategory === cat.id}
                >
                    <div className={styles.imageWrapper}>
                        {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '24px' }}>
                                {cat.icon || '🍰'}
                            </span>
                        )}
                    </div>
                    <span className={styles.label}>{cat.label}</span>
                </button>
            ))}
        </div>
    );
}
