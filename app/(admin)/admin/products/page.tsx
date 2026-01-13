'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Plus, Edit2, Trash2, Package as PackageIcon, LayoutGrid, List, Eye, EyeOff } from 'lucide-react';
import ProductForm from '@/app/components/admin/ProductForm';
import { productService } from '@/app/services/productService';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [mounted, setMounted] = useState(false);
    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        // Fetch Products via Service (which filters out deleted items)
        const productsData = await productService.getAllProductsAdmin();
        // Fetch Categories
        const { data: categoriesData } = await supabase.from('categories').select('*');

        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        fetchData();

        // Auto-switch to grid on mobile
        if (window.innerWidth < 1024) {
            setViewMode('grid');
        }
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return;

        // Use Hard Delete from Service
        const { error } = await productService.deleteProduct(id);

        if (error) {
            console.error('Delete error:', error);
            alert('Xatolik (Product deletion): ' + error.message);
        } else {
            fetchData();
        }
    };

    const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
        const { error } = await productService.toggleProductAvailability(id, !currentStatus);
        if (error) {
            alert('Xatolik: ' + error.message);
        } else {
            // Optimistic update or just refetch
            setProducts(products.map(p => p.id === id ? { ...p, is_available: !currentStatus } : p));
        }
    };

    const handleToggleReady = async (id: string, currentStatus: boolean) => {
        const { error } = await productService.toggleProductReady(id, !currentStatus);
        if (error) {
            alert('Xatolik: ' + error.message);
        } else {
            setProducts(products.map(p => p.id === id ? { ...p, is_ready: !currentStatus } : p));
        }
    };

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
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: 0 }}>Mahsulotlar</h1>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="actions-group">
                    <div style={{ display: 'flex', background: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                background: viewMode === 'table' ? 'white' : 'transparent',
                                color: viewMode === 'table' ? '#BE185D' : '#6B7280',
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
                                color: viewMode === 'grid' ? '#BE185D' : '#6B7280',
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
                            background: '#BE185D', color: 'white', padding: '10px 20px',
                            borderRadius: '10px', border: 'none', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} />
                        Qo'shish
                    </button>
                </div>
            </div>

            {loading ? (
                <div>Yuklanmoqda...</div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <PackageIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>Hozircha mahsulotlar yo'q</p>
                </div>
            ) : viewMode === 'table' ? (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <tr>
                                <th style={{ padding: '16px' }}>Rasm</th>
                                <th style={{ padding: '16px' }}>Nom</th>
                                <th style={{ padding: '16px' }}>Kategoriya</th>
                                <th style={{ padding: '16px' }}>Narx</th>
                                <th style={{ padding: '16px' }}>Ko'rinishi</th>
                                <th style={{ padding: '16px' }}>Tayyor</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6' }}>
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍰</div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                                        {p.title}
                                        {p.subtitle && <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>{p.subtitle}</div>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ background: '#F3F4F6', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                                            {p.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 700 }}>
                                        {p.base_price?.toLocaleString()} so'm
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
                                            {p.is_available ? 'Ha' : 'Yo\'q'}
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
                                            {p.is_ready ? 'Tayyor' : 'Kutish'}
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
                                    <img src={p.image_url} alt={p.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🍰</div>
                                )}
                                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleToggleAvailability(p.id, p.is_available)}
                                        style={{
                                            padding: '8px', background: 'white', borderRadius: '10px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer',
                                            color: p.is_available ? '#166534' : '#6B7280'
                                        }}
                                        title={p.is_available ? 'Ko\'rinadigan' : 'Yashirin'}
                                    >
                                        {p.is_available ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ background: '#F3F4F6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
                                        {p.category}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{p.title}</h3>
                                {p.subtitle && <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>{p.subtitle}</p>}
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800, color: '#BE185D', fontSize: '18px' }}>
                                        {p.base_price?.toLocaleString()} so'm
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
                onSuccess={fetchData}
            />
        </div>
    );
}
