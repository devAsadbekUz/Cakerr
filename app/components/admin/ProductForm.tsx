'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2, Save, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MultiImageUpload from '@/app/components/admin/MultiImageUpload';
import LanguageTabs from '@/app/components/admin/LanguageTabs';
import { Product } from '@/app/types';
import { adminInsert, adminUpdate } from '@/app/utils/adminApi';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: any; // We'll cast to partial Product
    categories: any[];
    onSuccess: (savedProduct: any) => void;
}

export default function ProductForm({ isOpen, onClose, product, categories, onSuccess }: ProductFormProps) {
    const { t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<'uz' | 'ru'>('uz');
    const [title, setTitle] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [subtitle, setSubtitle] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [description, setDescription] = useState<{ uz: string; ru: string }>({ uz: '', ru: '' });
    const [basePrice, setBasePrice] = useState<number | string>(0);
    const [categoryId, setCategoryId] = useState('');
    const [images, setImages] = useState<string[]>([]);

    // Variants State: [{ label: '1.5 kg', value: '1.5 kg', price: 250000 }]
    const [variants, setVariants] = useState<{ label: string; value: string; price: number | string }[]>([]);

    // Details/Attributes State
    const [flavors, setFlavors] = useState('');
    const [coating, setCoating] = useState('');
    const [isAvailable, setIsAvailable] = useState(true);
    const [isReady, setIsReady] = useState(false);

    const [loading, setLoading] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const router = useRouter();

    // Reset form when modal opens for a new product (product is null)
    // This ensures the form is always clean when creating a new product
    useEffect(() => {
        if (isOpen && !product) {
            resetForm();
        }
    }, [isOpen, product]);

    // Populate form when editing an existing product
    useEffect(() => {
        setShowErrors(false);
        if (product) {
            // Helper to handle legacy string data, stringified JSON, or existing JSONB
            const getInitialValue = (val: any) => {
                if (!val) return { uz: '', ru: '' };
                if (typeof val === 'object') return { uz: val.uz || '', ru: val.ru || '' };
                if (typeof val === 'string') {
                    if (val.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(val);
                            return { uz: parsed.uz || '', ru: parsed.ru || '' };
                        } catch (_) {}
                    }
                    return { uz: val, ru: '' };
                }
                return { uz: '', ru: '' };
            };

            setTitle(getInitialValue(product.title));
            setSubtitle(getInitialValue(product.subtitle));
            setDescription(getInitialValue(product.description));
            setBasePrice(product.base_price || 0);
            setCategoryId(product.category_id || product.categoryId || '');
            
            // Handle image migration/population
            const productImages = Array.isArray(product.images) ? product.images : (product.image_url ? [product.image_url] : []);
            setImages(productImages);

            setVariants(Array.isArray(product.variants) ? product.variants.map((v: any) => ({
                ...v,
                value: v.value || v.label || '', // Ensure value exists
                price: v.price || 0
            })) : []);

            // Populate Attributes
            if (product.details) {
                setFlavors(Array.isArray(product.details.flavors) ? product.details.flavors.join(', ') : '');
                setCoating(Array.isArray(product.details.coating) ? product.details.coating.join(', ') : '');
            } else {
                setFlavors('');
                setCoating('');
            }
            setIsAvailable(product.is_available ?? true);
            setIsReady(product.is_ready ?? false);
        }
    }, [product]);

    const resetForm = () => {
        setTitle({ uz: '', ru: '' });
        setSubtitle({ uz: '', ru: '' });
        setDescription({ uz: '', ru: '' });
        setBasePrice(0);
        setActiveTab('uz');
        setCategoryId(categories.length > 0 ? categories[0].id : '');
        setImages([]);
        setVariants([]);
        setFlavors('');
        setCoating('');
        setIsAvailable(true);
        setIsReady(false);
        setShowErrors(false);
    };

    const handleAddVariant = () => {
        setVariants([...variants, { label: '', value: '', price: basePrice === 0 ? '' : basePrice }]);
    };

    const handleVariantChange = (index: number, field: 'label' | 'price', value: any) => {
        const newVariants = [...variants];
        if (field === 'label') {
            newVariants[index] = { ...newVariants[index], label: value, value: value }; // Keep value in sync with label
        } else {
            // Allow empty string for better UX
            const val = value === '' ? '' : Number(value);
            newVariants[index] = { ...newVariants[index], price: val };
        }
        setVariants(newVariants);
    };

    const handleRemoveVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const handleDataChange = (field: 'title' | 'subtitle' | 'description', value: string) => {
        if (field === 'title') setTitle(prev => ({ ...prev, [activeTab]: value }));
        else if (field === 'subtitle') setSubtitle(prev => ({ ...prev, [activeTab]: value }));
        else if (field === 'description') setDescription(prev => ({ ...prev, [activeTab]: value }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Custom validation
        const hasBasePrice = Number(basePrice) > 0;
        const allVariantsHavePrice = variants.every(v => v.price !== '' && Number(v.price) > 0);
        const hasTitle = title.uz.trim().length > 0 || title.ru.trim().length > 0;

        if (!hasBasePrice || !allVariantsHavePrice || !hasTitle) {
            setShowErrors(true);
            return;
        }

        setLoading(true);

        const categoryLabel = categories.find(c => c.id === categoryId)?.label || t('other');

        const productData = {
            title,
            subtitle,
            description,
            base_price: Number(basePrice),
            price: Number(basePrice),
            category_id: categoryId,
            category: categoryLabel,
            image_url: images.length > 0 ? images[0] : '', 
            images: images,
            variants: variants.map(v => ({ ...v, price: Number(v.price) })),
            details: {
                flavors: flavors.split(',').map(s => s.trim()).filter(Boolean),
                coating: coating.split(',').map(s => s.trim()).filter(Boolean),
            },
            is_available: isAvailable,
            is_ready: isReady
        };

        try {
            let result;
            if (product?.id) {
                result = await adminUpdate('products', product.id, productData);
                if (!result) throw new Error('Update failed via Admin API');
            } else {
                result = await adminInsert('products', productData);
                if (!result) throw new Error('Insert failed via Admin API');
            }
            onSuccess(result);
            onClose();
            router.refresh(); // Refresh server components
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(`${t('errorPrefix')}: ` + error.message);
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
                background: 'white',
                padding: 'clamp(16px, 4vw, 24px)',
                borderRadius: '16px',
                width: '95%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                        {product ? t('editProduct') : t('newProduct')}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <LanguageTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <X size={24} color="#6B7280" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
                    gap: '24px'
                }}>
                    {/* Left Column: Basic Info */}
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('titleLabel')} - {activeTab.toUpperCase()}
                            </label>
                            <input
                                value={title[activeTab]}
                                onChange={e => handleDataChange('title', e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: `1px solid ${showErrors && !title.uz.trim() && !title.ru.trim() ? '#EF4444' : '#E5E7EB'}`,
                                    background: showErrors && !title.uz.trim() && !title.ru.trim() ? '#FEF2F2' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            />
                            {showErrors && !title.uz.trim() && !title.ru.trim() && (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                    {t('titleRequired')}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('subtitleLabel')} - {activeTab.toUpperCase()}
                            </label>
                            <input
                                value={subtitle[activeTab]} 
                                onChange={e => handleDataChange('subtitle', e.target.value)}
                                placeholder={t('placeholderSubtitle')}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('categoryLabel')}
                            </label>
                            <select
                                value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white' }}
                                required
                            >
                                <option value="">{t('all')}</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('priceLabel')}
                            </label>
                            <input
                                type="number"
                                value={basePrice === 0 ? '' : basePrice}
                                onChange={e => setBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: `1px solid ${showErrors && Number(basePrice) <= 0 ? '#EF4444' : '#E5E7EB'}`,
                                    background: showErrors && Number(basePrice) <= 0 ? '#FEF2F2' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            />
                            {showErrors && Number(basePrice) <= 0 && (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                    {t('priceError')}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('imagesLabel')}
                            </label>
                            <MultiImageUpload value={images} onChange={setImages} />
                        </div>

                        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#F9FAFB', padding: '12px', borderRadius: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', flex: 1 }} htmlFor="isAvailable">
                                {t('availableLabel')}
                            </label>
                            <input
                                id="isAvailable"
                                type="checkbox"
                                checked={isAvailable}
                                onChange={e => setIsAvailable(e.target.checked)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#BE185D' }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#F9FAFB', padding: '12px', borderRadius: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', flex: 1 }} htmlFor="isReady">
                                {t('readyLabel')}
                            </label>
                            <input
                                id="isReady"
                                type="checkbox"
                                checked={isReady}
                                onChange={e => setIsReady(e.target.checked)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#BE185D' }}
                            />
                        </div>
                    </div>

                    {/* Right Column: Description & Variants */}
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                {t('descriptionLabel')} - {activeTab.toUpperCase()}
                            </label>
                            <textarea
                                value={description[activeTab]} 
                                onChange={e => handleDataChange('description', e.target.value)}
                                rows={6}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', minHeight: '120px' }}
                            />
                        </div>

                        {/* Attributes Section */}
                        <div style={{ background: '#FFF7ED', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #FFEDD5' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9A3412', marginBottom: '12px' }}>
                                {t('attributesLabel')} ({t('commaSeparated')})
                            </label>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    {t('flavorsLabel')}
                                </label>
                                <input
                                    value={flavors} onChange={e => setFlavors(e.target.value)}
                                    placeholder={t('placeholderFlavors')}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    {t('coatingLabel')}
                                </label>
                                <input
                                    value={coating} onChange={e => setCoating(e.target.value)}
                                    placeholder={t('placeholderCoating')}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                    {t('variantsLabel')}
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddVariant}
                                    style={{ background: '#DBEAFE', color: '#1D4ED8', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {t('addVariant')}
                                </button>
                            </div>

                            {variants.map((variant, index) => (
                                <div key={index} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            placeholder={t('placeholderName')}
                                            value={variant.label}
                                            onChange={e => handleVariantChange(index, 'label', e.target.value)}
                                            style={{
                                                flex: 2,
                                                padding: '8px',
                                                borderRadius: '6px',
                                                border: `1px solid ${showErrors && !variant.label ? '#EF4444' : '#E5E7EB'}`,
                                                fontSize: '13px'
                                            }}
                                        />
                                        <input
                                            type="number"
                                            placeholder={t('placeholderPrice')}
                                            value={variant.price === 0 ? '' : variant.price}
                                            onChange={e => handleVariantChange(index, 'price', e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: '6px',
                                                border: `1px solid ${showErrors && Number(variant.price) <= 0 ? '#EF4444' : '#E5E7EB'}`,
                                                fontSize: '13px'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVariant(index)}
                                            style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {showErrors && (Number(variant.price) <= 0 || !variant.label) && (
                                        <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                                            {!variant.label ? t('titleError') : t('priceError')}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {variants.length === 0 && (
                                <p style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                    {t('noVariants')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', background: '#BE185D', color: 'white',
                                padding: '14px', borderRadius: '12px', fontWeight: 600,
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {t('saveProduct')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
