'use client';

import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import styles from './ProductCard.module.css';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';
import { Variant } from '@/app/types';
import { flyToCart } from '@/app/utils/animations';

interface ProductProps {
    id: string;
    title: string;
    price: string | number;
    image: string;
    tag?: string;
    isReady?: boolean;
    variants?: Variant[];
}

export default function ProductCard({ id, title, price, image, tag, isReady, variants }: ProductProps) {
    const { addItem } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const favorited = isFavorite(id);

    // If variants exist, show the lowest price (fallback to base price if variant price is 0)
    const displayPrice = variants && variants.length > 0
        ? Math.min(...variants.map(v => v.price > 0 ? v.price : Number(price)))
        : Number(price);

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addItem({
            id,
            name: title,
            price: displayPrice,
            image,
            quantity: 1,
            portion: variants?.[0]?.value || '2',
            flavor: 'Shokoladli'
        });

        // Trigger the flying animation
        flyToCart(e, image || '');
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
    };

    return (
        <Link href={`/mahsulot/${id}`} className={`${styles.card} ${favorited ? styles.favoritedCard : ''}`}>
            <div className={styles.imageContainer}>
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        className={styles.productImage}
                        loading="lazy"
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
                        Rasm yo'q
                    </div>
                )}

                <button
                    className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
                    onClick={handleToggleFavorite}
                >
                    <Heart size={16} fill={favorited ? "currentColor" : "none"} />
                </button>

                {isReady && <span className={styles.readyBadge}>Tayyor</span>}
                {tag && <span className={styles.tag}>{tag}</span>}
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <div className={styles.bottomRow}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p className={styles.price}>
                            {displayPrice.toLocaleString('en-US')} so'm
                        </p>
                        <p className={styles.subText}>dan boshlab</p>
                    </div>

                    <button className={styles.addButton} onClick={handleQuickAdd}>
                        <ShoppingCart size={20} color="white" />
                    </button>
                </div>
            </div>
        </Link>
    );
}
