'use client';

import { useState, useEffect } from 'react';
import ProductGrid from '@/app/components/products/ProductGrid';
import { useFavorites } from '@/app/context/FavoritesContext';
import styles from './page.module.css';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/app/utils/supabase/client';
import { useLanguage } from '@/app/context/LanguageContext';

export default function SevimliPage() {
    const { t } = useLanguage();
    const { favorites, loading: favoritesLoading, initialLoadDone } = useFavorites();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Don't fetch until the initial favorites load is complete
        if (!initialLoadDone) return;

        async function fetchFavoriteProducts() {
            if (favorites.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .in('id', favorites)
                .is('deleted_at', null);

            if (data && !error) {
                const mappedProducts = data.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    price: p.base_price,
                    image: p.image_url,
                    category: p.category,
                    variants: p.variants,
                    is_ready: p.is_ready
                }));
                setProducts(mappedProducts);
            }
            setLoading(false);
        }

        fetchFavoriteProducts();
    }, [favorites, initialLoadDone]);

    // Show loading until both favorites context and product fetch are done
    if (!initialLoadDone || favoritesLoading || loading) {
        return <div className={styles.container} style={{ padding: '100px', textAlign: 'center' }}>{t('loading')}</div>;
    }

    return (
        <main style={{ paddingBottom: '100px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('favorites')}</h1>
                <p className={styles.subtitle}>{products.length} {t('mahsulot')}</p>
            </div>

            <div style={{ padding: '20px' }}>
                {products.length > 0 ? (
                    <ProductGrid products={products} />
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <Heart size={48} color="#E91E63" fill="#E91E63" />
                        </div>
                        <h2 className={styles.emptyTitle}>{t('noFavorites')}</h2>
                        <p className={styles.emptyDescription}>{t('noFavoritesDesc')}</p>
                        <Link href="/" className={styles.primaryBtn}>
                            {t('goHome')}
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
