'use client';

import Link from 'next/link';
import { Plus, Heart } from 'lucide-react';
import styles from './ProductCard.module.css';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';

interface ProductProps {
    id: string;
    title: string;
    price: string | number;
    image: string;
    tag?: string;
    variants?: { id: string; value: string; label: string; price: number; diameter?: string }[];
}

export default function ProductCard({ id, title, price, image, tag = 'Tayyor', variants }: ProductProps) {
    const { addItem } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const favorited = isFavorite(id);

    // If variants exist, show the lowest price and its diameter
    const sortedVariants = variants?.sort((a, b) => a.price - b.price);
    const displayPrice = sortedVariants?.length
        ? sortedVariants[0].price
        : Number(price);

    const displayDiameter = sortedVariants?.length ? sortedVariants[0].diameter : null;

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
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
    };

    return (
        <Link href={`/mahsulot/${id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                <div
                    className={styles.placeholderImage}
                    style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover' }}
                />

                <button
                    className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
                    onClick={handleToggleFavorite}
                >
                    <Heart size={16} fill={favorited ? "currentColor" : "none"} />
                </button>

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
                        <Plus size={20} color="white" />
                    </button>
                </div>
            </div>
        </Link>
    );
}
