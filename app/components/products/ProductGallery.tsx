'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ProductGallery.module.css';

interface ProductGalleryProps {
    images: string[];
    title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Actual gallery content: support multiple images or fallback to the single array
    const galleryImages = images && images.length > 0 ? images : [];

    const handleScroll = () => {
        if (!scrollRef.current) return;
        
        const scrollPosition = scrollRef.current.scrollLeft;
        const width = scrollRef.current.offsetWidth;
        const index = Math.round(scrollPosition / width);
        
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    if (galleryImages.length === 0) {
        return (
            <div className={styles.emptyGallery}>
                🍰
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div 
                className={styles.scrollContainer} 
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {galleryImages.map((src, index) => (
                    <div 
                        key={src + index} 
                        className={styles.slide}
                    >
                        <Image
                            src={src}
                            alt={`${title} - Rasm ${index + 1}`}
                            fill
                            className={styles.image}
                            sizes="(max-width: 1024px) 100vw, 800px"
                            priority={index === 0}
                            loading={index === 0 ? 'eager' : 'lazy'} // Performance optimization
                        />
                    </div>
                ))}
            </div>

            {/* Pagination Dots (Only if more than 1 image) */}
            {galleryImages.length > 1 && (
                <div className={styles.pagination}>
                    {galleryImages.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.active : ''}`}
                            onClick={() => {
                                scrollRef.current?.scrollTo({
                                    left: index * scrollRef.current.offsetWidth,
                                    behavior: 'smooth'
                                });
                            }}
                            aria-label={`Rasm ${index + 1} ni ko'rish`}
                        />
                    ))}
                </div>
            )}
            
            {/* Image Counter Badge */}
            {galleryImages.length > 1 && (
                <div className={styles.counter} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {currentIndex + 1} / {galleryImages.length}
                </div>
            )}
        </div>
    );
}
