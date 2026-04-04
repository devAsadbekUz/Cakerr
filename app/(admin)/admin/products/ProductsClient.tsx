'use client';

import { useState, useMemo, useCallback, useOptimistic, useTransition, useEffect } from 'react';
import { Plus, LayoutGrid, List, Package as PackageIcon } from 'lucide-react';
import ProductForm from '@/app/components/admin/ProductForm';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { deleteProductAction, toggleProductAvailabilityAction, toggleProductReadyAction } from '@/app/actions/product-actions';
import { ProductTable } from '@/app/components/admin/products/ProductTable';
import { ProductGrid } from '@/app/components/admin/products/ProductGrid';
import styles from './Products.module.css';

interface ProductsClientProps {
    initialProducts: any[];
    categories: any[];
}

export default function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
    const { t } = useAdminI18n();
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isPending, startTransition] = useTransition();
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Optimistic UI for toggles
    const [optimisticProducts, addOptimisticProduct] = useOptimistic(
        initialProducts,
        (state, { id, field, value }: { id: string, field: 'is_available' | 'is_ready', value: boolean }) => {
            return state.map(p => p.id === id ? { ...p, [field]: value } : p);
        }
    );

    // Auto-switch to grid on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setViewMode('grid');
        }
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;
        
        setProcessingIds(prev => new Set(prev).add(id));
        const result = await deleteProductAction(id);
        
        if (result?.error) {
            alert(t('error') + ': ' + result.error);
        }
        setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, [t]);

    const handleToggleAvailability = useCallback(async (id: string, current: boolean) => {
        const nextValue = !current;
        startTransition(async () => {
            addOptimisticProduct({ id, field: 'is_available', value: nextValue });
            const result = await toggleProductAvailabilityAction(id, nextValue);
            if (result?.error) {
                alert(t('error') + ': ' + result.error);
            }
        });
    }, [addOptimisticProduct, t]);

    const handleToggleReady = useCallback(async (id: string, current: boolean) => {
        const nextValue = !current;
        startTransition(async () => {
            addOptimisticProduct({ id, field: 'is_ready', value: nextValue });
            const result = await toggleProductReadyAction(id, nextValue);
            if (result?.error) {
                alert(t('error') + ': ' + result.error);
            }
        });
    }, [addOptimisticProduct, t]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('products')}</h1>
                <div className={styles.actionsGroup}>
                    <div className={styles.viewToggle}>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.toggleBtnActive : ''}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
                        className={styles.addBtn}
                    >
                        <Plus size={18} />
                        {t('add')}
                    </button>
                </div>
            </div>

            {optimisticProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
                    <PackageIcon size={64} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p style={{ fontSize: '18px', fontWeight: 500 }}>{t('noProducts')}</p>
                </div>
            ) : viewMode === 'table' ? (
                <ProductTable
                    products={optimisticProducts}
                    onEdit={setEditingProduct}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                    onToggleReady={handleToggleReady}
                    processingIds={processingIds}
                />
            ) : (
                <ProductGrid
                    products={optimisticProducts}
                    onEdit={setEditingProduct}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                    processingIds={processingIds}
                />
            )}

            <ProductForm
                isOpen={isFormOpen || !!editingProduct}
                onClose={() => { setIsFormOpen(false); setEditingProduct(null); }}
                product={editingProduct}
                categories={categories}
                onSuccess={() => {
                    setIsFormOpen(false);
                    setEditingProduct(null);
                    // Native revalidation from Server Action will update initialProducts
                }}
            />
        </div>
    );
}
