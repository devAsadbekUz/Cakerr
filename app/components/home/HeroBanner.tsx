'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import Link from 'next/link';
import styles from './HeroBanner.module.css';

interface Banner {
    id: string;
    badge_text: string;
    title_text: string;
    button_text: string;
    link_url: string;
    bg_color: string;
    sort_order: number;
}

export default function HeroBanner() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        async function fetchBanners() {
            try {
                const { data, error } = await supabase
                    .from('hero_banners')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (data) setBanners(data);
            } catch (err) {
                console.error('Error fetching banners:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBanners();
    }, []);

    const handleScroll = () => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const scrollLeft = container.scrollLeft;
            const itemWidth = container.offsetWidth;
            const gap = 12; // Matches CSS gap

            const index = Math.round(scrollLeft / (itemWidth + gap));
            setActiveIndex(index);
        }
    };

    if (loading) return <div className={styles.skeleton} />;
    if (banners.length === 0) return null;

    return (
        <div className={styles.wrapper}>
            <div className={styles.carouselMask}>
                <div
                    className={styles.carouselContainer}
                    ref={scrollRef}
                    onScroll={handleScroll}
                >
                    {banners.map((banner) => (
                        <Link
                            key={banner.id}
                            href={banner.link_url || '/'}
                            className={styles.banner}
                            style={{ backgroundColor: banner.bg_color }}
                        >
                            <div className={styles.content}>
                                <span className={styles.badge}>{banner.badge_text}</span>
                                <h2 className={styles.title}>{banner.title_text}</h2>
                                <button className={styles.button}>{banner.button_text}</button>
                            </div>
                            <div className={styles.decoration}></div>
                            <div className={styles.decoration2}></div>
                        </Link>
                    ))}
                </div>
            </div>

            {banners.length > 1 && (
                <div className={styles.indicators}>
                    {banners.map((_, idx) => (
                        <div
                            key={idx}
                            className={`${styles.dot} ${idx === activeIndex ? styles.activeDot : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
