'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import styles from './HeroBanner.module.css';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';

interface Banner {
    id: string;
    badge_text: any;
    title_text: any;
    button_text: any;
    link_url: string;
    bg_color: string;
    sort_order: number;
}

interface HeroBannerProps {
    banners: Banner[];
}

export default function HeroBanner({ banners }: HeroBannerProps) {
    const { lang } = useLanguage();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const scrollLeft = container.scrollLeft;
            const itemWidth = container.offsetWidth;
            const gap = 12;

            const index = Math.round(scrollLeft / (itemWidth + gap));
            setActiveIndex(index);
        }
    };

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
                                <span className={styles.badge}>{getLocalized(banner.badge_text, lang)}</span>
                                <h2 className={styles.title}>{getLocalized(banner.title_text, lang)}</h2>
                                <button className={styles.button}>{getLocalized(banner.button_text, lang)}</button>
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
