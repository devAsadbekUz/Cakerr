'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ShoppingCart, Plus } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { useAdminCart } from '@/app/context/AdminCartContext';
import { getLocalized } from '@/app/utils/i18n';
import { Product, Variant } from '@/app/types';

type Props = {
    product: Product;
    onClose: () => void;
};

export function POSProductDetailModal({ product, onClose }: Props) {
    const { t, lang } = useAdminI18n();
    const { addItem } = useAdminCart();

    const variants: Variant[] = Array.isArray(product.variants) ? product.variants : [];
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
        variants.length > 0 ? variants[0] : null
    );

    const currentPrice = selectedVariant?.price ?? Number(product.base_price);
    const currentPortion = selectedVariant?.label ?? (lang === 'uz' ? 'Standart' : 'Стандарт');

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            name: getLocalized(product.title, lang),
            price: currentPrice,
            image: product.image_url,
            portion: currentPortion,
            flavor: '',
            quantity: 1,
            configuration: { unit_price: currentPrice },
        });
        onClose();
    };

    const displayImage =
        (Array.isArray(product.images) && product.images.length > 0)
            ? product.images[0]
            : product.image_url || '/images/placeholder.jpg';

    const title = getLocalized(product.title, lang);
    const subtitle = getLocalized(product.subtitle, lang);
    const description = getLocalized(product.description, lang);

    const details = product.details ?? {};
    const hasDetails = (
        (details.flavors?.length ?? 0) > 0 ||
        (details.coating?.length ?? 0) > 0 ||
        (details.innerCoating?.length ?? 0) > 0
    );

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(15,23,42,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white', borderRadius: '20px',
                    width: '100%', maxWidth: '480px',
                    maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                    position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '14px', right: '14px', zIndex: 10,
                        background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0',
                        borderRadius: '50%', width: '36px', height: '36px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#64748b',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Image */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '20px 20px 0 0', overflow: 'hidden', background: '#f1f5f9' }}>
                    <Image
                        src={displayImage}
                        alt={title}
                        fill
                        style={{ objectFit: 'cover' }}
                    />
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px 24px' }}>
                    {/* Title + price */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                            {title}
                        </h2>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0ea5e9', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {currentPrice.toLocaleString()} {t('som')}
                        </span>
                    </div>

                    {subtitle && (
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                            {subtitle}
                        </p>
                    )}

                    {description && (
                        <div style={{
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            borderRadius: '10px', padding: '10px 14px',
                            fontSize: '13px', color: '#166534', lineHeight: 1.5,
                            marginBottom: '16px',
                        }}>
                            {description}
                        </div>
                    )}

                    {/* Variants */}
                    {variants.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                {t('portionSize')}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {variants.map((v) => {
                                    const isSelected = selectedVariant?.value === v.value;
                                    return (
                                        <button
                                            key={v.value}
                                            onClick={() => setSelectedVariant(v)}
                                            style={{
                                                padding: '8px 14px', borderRadius: '10px',
                                                border: isSelected ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                                                background: isSelected ? '#f0f9ff' : 'white',
                                                color: isSelected ? '#0369a1' : '#374151',
                                                fontWeight: 700, fontSize: '13px',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                            }}
                                        >
                                            <span>{v.label ?? v.value}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#0ea5e9' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                                                {v.price.toLocaleString()} {t('som')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Detail chips */}
                    {hasDetails && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            {details.flavors && details.flavors.length > 0 && (
                                <ChipRow label={t('flavorsLabel')} items={details.flavors} color="#fce7f3" textColor="#be185d" lang={lang} />
                            )}
                            {details.coating && details.coating.length > 0 && (
                                <ChipRow label={t('coatingLabel')} items={details.coating} color="#dbeafe" textColor="#1e40af" lang={lang} />
                            )}
                            {details.innerCoating && details.innerCoating.length > 0 && (
                                <ChipRow label={t('flavorCream')} items={details.innerCoating} color="#ffedd5" textColor="#c2410c" lang={lang} />
                            )}
                        </div>
                    )}

                    {/* Add to cart button */}
                    <button
                        onClick={handleAddToCart}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            background: '#0ea5e9', color: 'white',
                            fontWeight: 700, fontSize: '15px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            cursor: 'pointer', border: 'none',
                            transition: 'background 0.15s',
                        }}
                    >
                        <ShoppingCart size={18} />
                        {lang === 'uz' ? 'Savatga qo\'shish' : 'Добавить в корзину'}
                        {' — '}
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{currentPrice.toLocaleString()} {t('som')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChipRow({ label, items, color, textColor, lang }: { label: string; items: any[]; color: string; textColor: string; lang: 'uz' | 'ru' }) {
    return (
        <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {items.map((item, i) => {
                    const text = typeof item === 'string' ? item : getLocalized(item, lang);
                    return (
                        <span
                            key={i}
                            style={{
                                background: color, color: textColor,
                                padding: '4px 10px', borderRadius: '6px',
                                fontSize: '12px', fontWeight: 600,
                            }}
                        >
                            {text}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
