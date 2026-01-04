'use client';

import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { X, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/app/components/admin/ImageUpload';
import { useEffect } from 'react';

interface CategoryFormProps {
    isOpen: boolean;
    onClose: () => void;
    category?: any; // If passed, we are in Edit mode
    onSuccess: () => void;
}

export default function CategoryForm({ isOpen, onClose, category, onSuccess }: CategoryFormProps) {
    const [label, setLabel] = useState('');
    const [icon, setIcon] = useState('🎂');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (category) {
            setLabel(category.label);
            setIcon(category.icon || '🎂');
            setImageUrl(category.image_url || '');
        } else {
            setLabel('');
            setIcon('🎂');
            setImageUrl('');
        }
    }, [category]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const categoryData = {
            label,
            icon,
            image_url: imageUrl,
        };

        try {
            if (category?.id) {
                // Update
                const { error } = await supabase
                    .from('categories')
                    .update(categoryData)
                    .eq('id', category.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('categories')
                    .insert([categoryData]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
            router.refresh();
        } catch (error: any) {
            console.error('Error saving category:', error);
            alert('Xatolik: ' + (error.message || JSON.stringify(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
            <div style={{
                background: 'white', padding: '24px', borderRadius: '16px',
                width: '100%', maxWidth: '400px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                        {category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#6B7280" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            Nomi (Label)
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Masalan: Tug'ilgan kun"
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                border: '1px solid #E5E7EB', fontSize: '15px'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            Kategoriya Rasmi
                        </label>
                        <ImageUpload value={imageUrl} onChange={setImageUrl} />
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                            Tavsiya etilgan o'lcham: 400x400px (Kvadrat)
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            Belgi (Icon / Emoji) - Fallback
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['🎂', '🍰', '🧁', '🍪', '🥐', '🥯', '🥞', '🧇'].map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    style={{
                                        fontSize: '24px',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: icon === emoji ? '#FCE7F3' : '#F3F4F6',
                                        border: icon === emoji ? '2px solid #BE185D' : '2px solid transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', background: '#BE185D', color: 'white',
                            padding: '12px', borderRadius: '12px', fontWeight: 600,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Saqlash
                    </button>
                </form>
            </div>
        </div>
    );
}
