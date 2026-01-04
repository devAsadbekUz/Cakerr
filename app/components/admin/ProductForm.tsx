'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { X, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/app/components/admin/ImageUpload';
import { Product } from '@/app/types';

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: any; // We'll cast to partial Product
    categories: any[];
    onSuccess: () => void;
}

export default function ProductForm({ isOpen, onClose, product, categories, onSuccess }: ProductFormProps) {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [description, setDescription] = useState('');
    const [basePrice, setBasePrice] = useState<number>(0);
    const [categoryId, setCategoryId] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // Variants State: [{ label: '1.5 kg', value: '1.5 kg', price: 250000 }]
    const [variants, setVariants] = useState<{ label: string; value: string; price: number }[]>([]);

    // Details/Attributes State
    const [shapes, setShapes] = useState('');
    const [flavors, setFlavors] = useState('');
    const [coating, setCoating] = useState('');
    const [isAvailable, setIsAvailable] = useState(true);
    const [isReady, setIsReady] = useState(false);

    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (product) {
            setTitle(product.title || '');
            setSubtitle(product.subtitle || '');
            setDescription(product.description || '');
            setBasePrice(product.base_price || 0);
            setCategoryId(product.category_id || product.categoryId || ''); // Handle flexible naming if needed
            setImageUrl(product.image_url || '');
            setVariants(Array.isArray(product.variants) ? product.variants.map((v: any) => ({
                ...v,
                value: v.value || v.label || '' // Ensure value exists
            })) : []);

            // Populate Attributes
            if (product.details) {
                setShapes(Array.isArray(product.details.shapes) ? product.details.shapes.join(', ') : '');
                setFlavors(Array.isArray(product.details.flavors) ? product.details.flavors.join(', ') : '');
                setCoating(Array.isArray(product.details.coating) ? product.details.coating.join(', ') : '');
            } else {
                setShapes('');
                setFlavors('');
                setCoating('');
            }
            setIsAvailable(product.is_available ?? true);
            setIsReady(product.is_ready ?? false);
        } else {
            resetForm();
        }
    }, [product]);

    const resetForm = () => {
        setTitle('');
        setSubtitle('');
        setDescription('');
        setBasePrice(0);
        setCategoryId(categories.length > 0 ? categories[0].id : '');
        setImageUrl('');
        setVariants([]);
        setShapes('');
        setFlavors('');
        setCoating('');
        setIsAvailable(true);
        setIsReady(false);
    };

    const handleAddVariant = () => {
        setVariants([...variants, { label: '', value: '', price: basePrice }]);
    };

    const handleVariantChange = (index: number, field: 'label' | 'price', value: any) => {
        const newVariants = [...variants];
        if (field === 'label') {
            newVariants[index] = { ...newVariants[index], label: value, value: value }; // Keep value in sync with label
        } else {
            newVariants[index] = { ...newVariants[index], [field]: value };
        }
        setVariants(newVariants);
    };

    const handleRemoveVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const categoryLabel = categories.find(c => c.id === categoryId)?.label || 'Boshqa';

        const productData = {
            title,
            subtitle,
            description,
            base_price: Number(basePrice),
            price: Number(basePrice), // Keep redundant for now
            category_id: categoryId,
            category: categoryLabel, // Denormalize for easier client reading
            image_url: imageUrl,
            variants: variants,
            details: {
                shapes: shapes.split(',').map(s => s.trim()).filter(Boolean),
                flavors: flavors.split(',').map(s => s.trim()).filter(Boolean),
                coating: coating.split(',').map(s => s.trim()).filter(Boolean),
            },
            is_available: isAvailable, // Use state value
            is_ready: isReady
        };

        try {
            if (product?.id) {
                const { error } = await supabase.from('products').update(productData).eq('id', product.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert([productData]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
            router.refresh(); // Refresh server components
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert('Xatolik: ' + error.message);
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
                        {product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#6B7280" />
                    </button>
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
                                Nom (Title)
                            </label>
                            <input
                                value={title} onChange={e => setTitle(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                "Subtitle" (Qisqa tarif)
                            </label>
                            <input
                                value={subtitle} onChange={e => setSubtitle(e.target.value)}
                                placeholder="Masalan: Eng shirin tort"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Kategoriya
                            </label>
                            <select
                                value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white' }}
                                required
                            >
                                <option value="">Tanlang</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Asosiy Narx (so'm)
                            </label>
                            <input
                                type="number"
                                value={basePrice} onChange={e => setBasePrice(Number(e.target.value))}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Rasm (Image)
                            </label>
                            <ImageUpload value={imageUrl} onChange={setImageUrl} />
                        </div>

                        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#F9FAFB', padding: '12px', borderRadius: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', flex: 1 }} htmlFor="isAvailable">
                                Sotuvda mavjud (Visible to customers)
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
                                Tayyor (Hozir yetkazish imkoniyati bor)
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
                                Batafsil Tavsif (Description)
                            </label>
                            <textarea
                                value={description} onChange={e => setDescription(e.target.value)}
                                rows={6}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', minHeight: '120px' }}
                            />
                        </div>

                        {/* Attributes Section */}
                        <div style={{ background: '#FFF7ED', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #FFEDD5' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9A3412', marginBottom: '12px' }}>
                                Mahsulot xususiyatlari (Vergul bilan ajrating)
                            </label>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    Shakl (Shape)
                                </label>
                                <input
                                    value={shapes} onChange={e => setShapes(e.target.value)}
                                    placeholder="Masalan: Dumaloq, Kvadrat"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    Ichki ta'mlar (Flavors)
                                </label>
                                <input
                                    value={flavors} onChange={e => setFlavors(e.target.value)}
                                    placeholder="Masalan: Shokoladli, Vanilli"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    Ustki qoplama (Coating)
                                </label>
                                <input
                                    value={coating} onChange={e => setCoating(e.target.value)}
                                    placeholder="Masalan: Krem-chiz, Velur"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                    O'lcham va Variantlar
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddVariant}
                                    style={{ background: '#DBEAFE', color: '#1D4ED8', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    + Qo'shish
                                </button>
                            </div>

                            {variants.map((variant, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        placeholder="Nomi (Masalan: Kichik)"
                                        value={variant.label}
                                        onChange={e => handleVariantChange(index, 'label', e.target.value)}
                                        style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Narx"
                                        value={variant.price}
                                        onChange={e => handleVariantChange(index, 'price', Number(e.target.value))}
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '13px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveVariant(index)}
                                        style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {variants.length === 0 && (
                                <p style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                    Variantlar yo'q (Asosiy narx ishlatiladi)
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
                            Mahsulotni Saqlash
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
