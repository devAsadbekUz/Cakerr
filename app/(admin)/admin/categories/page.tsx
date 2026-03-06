'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import CategoryForm from '@/app/components/admin/CategoryForm';
import { adminFetch, adminDelete } from '@/app/utils/adminApi';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const fetchCategories = async () => {
        setLoading(true);
        const data = await adminFetch({ table: 'categories', orderBy: 'created_at', orderAsc: true });
        setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return;

        const success = await adminDelete('categories', id);
        if (success) {
            fetchCategories();
        } else {
            alert('Xatolik yuz berdi');
        }
    };

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Kategoriyalar</h1>
                <button
                    onClick={() => { setEditingCategory(null); setIsFormOpen(true); }}
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

            {loading ? (
                <div>Yuklanmoqda...</div>
            ) : categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <FolderOpen size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>Hozircha kategoriyalar yo'q</p>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '500px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Belgi</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Nomi</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '16px', fontSize: '24px' }}>
                                        {cat.image_url ? (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6', position: 'relative' }}>
                                                <Image src={cat.image_url} alt={cat.label} fill style={{ objectFit: 'cover' }} sizes="40px" />
                                            </div>
                                        ) : (
                                            <span>{cat.icon}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>{cat.label}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => { setEditingCategory(cat); setIsFormOpen(true); }}
                                            style={{
                                                padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                                                borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '8px'
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
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
            )}

            <CategoryForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                category={editingCategory}
                onSuccess={fetchCategories}
            />
        </div>
    );
}
