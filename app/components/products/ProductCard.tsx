'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart } from 'lucide-react';
import styles from './ProductCard.module.css';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import { Variant } from '@/app/types';
import { flyToCart } from '@/app/utils/animations';

interface ProductProps {
    id: string;
    title: string | { uz: string; ru: string };
    price: string | number;
    image: string;
    images?: string[];
    tag?: string | { uz: string; ru: string };
    isReady?: boolean;
    variants?: Variant[];
    priority?: boolean;
}

function ProductCardComponent({ id, title, price, image, images, tag, isReady, variants, priority }: ProductProps) {
    const { lang, t } = useLanguage();
    const { addItem } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const favorited = isFavorite(id);

    // Primary image fallback
    const displayImage = image || (images && images.length > 0 ? images[0] : '');

    // If variants exist, show the lowest price (fallback to base price if variant price is 0)
    const displayPrice = variants && variants.length > 0
        ? Math.min(...variants.map(v => v.price > 0 ? v.price : Number(price)))
        : Number(price);

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addItem({
            id,
            name: getLocalized(title, lang),
            price: displayPrice,
            image: displayImage,
            quantity: 1,
            portion: variants?.[0]?.value || '',
            flavor: 'Shokoladli'
        });

        // Trigger the flying animation
        flyToCart(e, displayImage || '');
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
    };

    return (
        <Link href={`/mahsulot/${id}`} className={`${styles.card} ${favorited ? styles.favoritedCard : ''}`} data-product-title={title}>
            <div className={styles.imageContainer}>
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={getLocalized(title, lang)}
                        className={styles.productImage}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={priority}
                    />
                ) : (
                    <div className={styles.productImage} style={{
                        background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E91E63',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        {t('rasmYoq')}
                    </div>
                )}

                <button
                    className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
                    onClick={handleToggleFavorite}
                >
                    <Heart size={16} fill={favorited ? "currentColor" : "none"} />
                </button>

                {isReady && <span className={styles.readyBadge}>{t('tayyor')}</span>}
                {tag && <span className={styles.tag}>{getLocalized(tag, lang)}</span>}
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{getLocalized(title, lang)}</h3>
                <div className={styles.bottomRow}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p className={styles.price}>
                            {displayPrice.toLocaleString('en-US')} {t('som')}
                        </p>
                        <p className={styles.subText}>{t('danBoshlab')}</p>
                    </div>

                    <button className={styles.addButton} onClick={handleQuickAdd}>
                        <ShoppingCart size={20} color="white" />
                    </button>
                </div>
            </div>
        </Link>
    );
}

const ProductCard = memo(ProductCardComponent);
export default ProductCard;
