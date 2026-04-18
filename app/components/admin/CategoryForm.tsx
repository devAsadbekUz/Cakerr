'use client';

import { useState, useEffect } from 'react';
import { getLocalized } from '@/app/utils/i18n';
import { X, Loader2, Save, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/app/components/admin/ImageUpload';
import LanguageTabs from '@/app/components/admin/LanguageTabs';
import { adminInsert, adminUpdate } from '@/app/utils/adminApi';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';

interface CategoryFormProps {
    isOpen: boolean;
    onClose: () => void;
    category?: any; // If passed, we are in Edit mode
    onSuccess: (saved: any) => void;
}

export default function CategoryForm({ isOpen, onClose, category, onSuccess }: CategoryFormProps) {
    const { t } = useAdminI18n();
    const [activeTab, setActiveTab ] = useState<'uz' | 'ru'>('uz');
    const [label, setLabel] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [icon, setIcon] = useState('🎂');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (category) {
            const getInitialLabel = (val: any) => {
                if (!val) return { uz: '', ru: '' };
                
                // Already an object
                if (typeof val === 'object') {
                    return { uz: val.uz || '', ru: val.ru || '' };
                }

                // If it's a string, it might be stringified JSON
                if (typeof val === 'string' && val.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(val.trim());
                        return { 
                            uz: getLocalized(parsed, 'uz'), 
                            ru: getLocalized(parsed, 'ru') 
                        };
                    } catch (e) {
                        // Not valid JSON, treat as uz
                    }
                }
                return { uz: val, ru: '' };
            };
            setLabel(getInitialLabel(category.label));
            setIcon(category.icon || '🎂');
            setImageUrl(category.image_url || '');
        } else {
            setLabel({ uz: '', ru: '' });
            setIcon('🎂');
            setImageUrl('');
            setActiveTab('uz');
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
            let saved: any;
            if (category?.id) {
                // Update
                const result = await adminUpdate('categories', category.id, categoryData);
                if (!result) throw new Error('Update failed via Admin API');
                saved = { ...category, ...categoryData, ...result };
            } else {
                // Create
                const result = await adminInsert('categories', categoryData);
                if (!result) throw new Error('Insert failed via Admin API');
                saved = result;
            }

            onSuccess(saved);
            onClose();
            router.refresh();
        } catch (error: any) {
            console.error('Error saving category:', error);
            alert(`${t('errorPrefix')}: ` + (error.message || JSON.stringify(error)));
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
                        {category ? t('editCategory') : t('newCategory')}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <LanguageTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <X size={24} color="#6B7280" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            {t('titleLabel')} - {activeTab.toUpperCase()}
                        </label>
                        <input
                            type="text"
                            value={label[activeTab]}
                            onChange={e => setLabel(prev => ({ ...prev, [activeTab]: e.target.value }))}
                            placeholder={t('categoryPlaceholder')}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                border: '1px solid #E5E7EB', fontSize: '15px'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            {t('categoryLabel')} {t('image')}
                        </label>
                        <ImageUpload value={imageUrl} onChange={setImageUrl} />
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                            {t('recommendedSize')}: 400x400px ({t('square')})
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                            {t('icon')} (Emoji) - {t('iconFallback')}
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
                        {t('saveCategory')}
                    </button>
                </form>
            </div>
        </div>
    );
}
