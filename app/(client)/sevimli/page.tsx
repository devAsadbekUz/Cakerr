'use client';

import ProductGrid from '@/app/components/products/ProductGrid';
import { MOCK_PRODUCTS } from '@/app/lib/mockData';
import { useFavorites } from '@/app/context/FavoritesContext';
import styles from './page.module.css';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function SevimliPage() {
    const { favorites } = useFavorites();
    const favoriteProducts = MOCK_PRODUCTS.filter(p => favorites.includes(p.id));

    return (
        <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            <div className={styles.header}>
                <h1 className={styles.title}>Sevimlilar</h1>
                <p className={styles.subtitle}>{favoriteProducts.length} mahsulot</p>
            </div>

            <div style={{ padding: '20px' }}>
                {favoriteProducts.length > 0 ? (
                    <ProductGrid products={favoriteProducts} />
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <Heart size={48} color="#E91E63" fill="#E91E63" />
                        </div>
                        <h2 className={styles.emptyTitle}>Sevimli tortlaringiz yo'q</h2>
                        <p className={styles.emptyDescription}>
                            Yoqtirgan tortlaringizni savatga qo'shing va ular shu yerda ko'rinadi!
                        </p>
                        <Link href="/" className={styles.primaryBtn}>
                            Asosiyga o'tish
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
