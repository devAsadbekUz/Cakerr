'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/app/utils/supabase/client';
import { Plus, Edit2, Trash2, Package as PackageIcon, LayoutGrid, List, Eye, EyeOff } from 'lucide-react';
import ProductForm from '@/app/components/admin/ProductForm';
import { productService } from '@/app/services/productService';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';

export default function ProductsPage() {
    const { lang, t } = useAdminI18n();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [mounted, setMounted] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [productsData, categoriesRes] = await Promise.all([
            productService.getAllProductsAdmin(),
            supabase.from('categories').select('*')
        ]);

        setProducts(productsData || []);
        setCategories(categoriesRes.data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        setMounted(true);
        fetchData();

        // Auto-switch to grid on mobile
        if (window.innerWidth < 1024) {
            setViewMode('grid');
        }
    }, [fetchData]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;

        const { error } = await productService.deleteProduct(id);

        if (error) {
            console.error('Delete error:', error);
            alert(t('error') + ': ' + error.message);
        } else {
            setProducts(prev => prev.filter(p => p.id !== id));
        }
    }, [t]);

    const handleToggleAvailability = useCallback(async (id: string, currentStatus: boolean) => {
        const { error } = await productService.toggleProductAvailability(id, !currentStatus);
        if (error) {
            alert(t('error') + ': ' + error.message);
        } else {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_available: !currentStatus } : p));
        }
    }, [t]);

    const handleToggleReady = useCallback(async (id: string, currentStatus: boolean) => {
        const { error } = await productService.toggleProductReady(id, !currentStatus);
        if (error) {
            alert('Xatolik: ' + error.message);
        } else {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_ready: !currentStatus } : p));
        }
    }, []);

    const handleFormSuccess = useCallback((savedProduct: any) => {
        const mapped = {
            ...savedProduct,
            image: savedProduct.image_url,
            images: Array.isArray(savedProduct.images) ? savedProduct.images : (savedProduct.image_url ? [savedProduct.image_url] : []),
            price: savedProduct.base_price,
            is_ready: savedProduct.is_ready || false,
        };
        setProducts(prev => {
            const exists = prev.some(p => p.id === mapped.id);
            return exists
                ? prev.map(p => p.id === mapped.id ? mapped : p)
                : [mapped, ...prev];
        });
    }, []);

    if (!mounted) return null;

    return (
        <div className="admin-page-container">
            <style jsx>{`
                .header-wrapper {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 32px;
                }
                .admin-product-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 24px;
                }
                @media (max-width: 1200px) {
                    .admin-product-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 900px) {
                    .admin-product-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 16px;
                    }
                }
                @media (max-width: 640px) {
                    .header-wrapper {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .actions-group {
                        width: 100%;
                        justify-content: space-between;
                    }
                }
            `}</style>
            <div className="header-wrapper">
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: 0 }}>{t('products')}</h1>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="actions-group">
                    <div style={{ display: 'flex', background: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                background: viewMode === 'table' ? 'white' : 'transparent',
                                color: viewMode === 'table' ? 'hsl(var(--color-primary-dark))' : '#6B7280',
                                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                background: viewMode === 'grid' ? 'white' : 'transparent',
                                color: viewMode === 'grid' ? 'hsl(var(--color-primary-dark))' : '#6B7280',
                                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
                        style={{
                            background: 'hsl(var(--color-primary-dark))', color: 'white', padding: '10px 20px',
                            borderRadius: '10px', border: 'none', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} />
                        {t('add')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div>{t('loading')}</div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <PackageIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>{t('noProducts')}</p>
                </div>
            ) : viewMode === 'table' ? (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <tr>
                                <th style={{ padding: '16px' }}>{t('image')}</th>
                                <th style={{ padding: '16px' }}>{t('name')}</th>
                                <th style={{ padding: '16px' }}>{t('category')}</th>
                                <th style={{ padding: '16px' }}>{t('price')}</th>
                                <th style={{ padding: '16px' }}>{t('visibility')}</th>
                                <th style={{ padding: '16px' }}>{t('isReady')}</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6', position: 'relative' }}>
                                            {p.image_url ? (
                                                <Image src={p.image_url} alt={getLocalized(p.title, lang)} fill style={{ objectFit: 'cover' }} sizes="48px" />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍰</div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                                        {getLocalized(p.title, lang)}
                                        {p.subtitle && <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>{getLocalized(p.subtitle, lang)}</div>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ background: '#F3F4F6', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                                            {getLocalized(p.category, lang)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 700 }}>
                                        {p.base_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button
                                            onClick={() => handleToggleAvailability(p.id, p.is_available)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: p.is_available ? '#DCFCE7' : '#F3F4F6',
                                                color: p.is_available ? '#166534' : '#6B7280',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {p.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                                            {p.is_available ? t('yes') : t('no')}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button
                                            onClick={() => handleToggleReady(p.id, p.is_ready)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: p.is_ready ? '#DBEAFE' : '#FFF7ED',
                                                color: p.is_ready ? '#1D4ED8' : '#9A3412',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <PackageIcon size={14} />
                                            {p.is_ready ? t('ready') : t('waiting')}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                                            style={{
                                                padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                                                borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '8px'
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={{
                                                padding: '8px', background: '#FEF2F2', color: '#DC2626',
                                                borderRadius: '8px', border: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="admin-product-grid">
                    {products.map((p) => (
                        <div key={p.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', paddingTop: '75%', background: '#F3F4F6' }}>
                                {p.image_url ? (
                                    <Image src={p.image_url} alt={getLocalized(p.title, lang)} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 50vw, 25vw" />
                                ) : (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🍰</div>
                                )}
                                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                    <button
                                        onClick={() => handleToggleAvailability(p.id, p.is_available)}
                                        title={p.is_available ? t('visible') : t('hidden')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '5px 10px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            backdropFilter: 'blur(6px)',
                                            background: p.is_available ? 'rgba(22, 163, 74, 0.85)' : 'rgba(107, 114, 128, 0.75)',
                                            color: 'white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        {p.is_available ? <Eye size={13} /> : <EyeOff size={13} />}
                                        {p.is_available ? t('yes') : t('no')}
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ background: '#F3F4F6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
                                        {getLocalized(p.category, lang)}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{getLocalized(p.title, lang)}</h3>
                                {p.subtitle && <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>{getLocalized(p.subtitle, lang)}</p>}
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800, color: 'hsl(var(--color-primary-dark))', fontSize: '18px' }}>
                                        {p.base_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                                            style={{
                                                padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                                                borderRadius: '8px', border: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={{
                                                padding: '8px', background: '#FEF2F2', color: '#DC2626',
                                                borderRadius: '8px', border: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ProductForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                product={editingProduct}
                categories={categories}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}
