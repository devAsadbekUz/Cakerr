'use client';

import React from 'react';
import Image from 'next/image';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import styles from '@/app/(admin)/admin/products/Products.module.css';

interface ProductGridProps {
    products: any[];
    onEdit: (product: any) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, current: boolean) => void;
    processingIds: Set<string>;
}

export function ProductGrid({
    products,
    onEdit,
    onDelete,
    onToggleAvailability,
    processingIds
}: ProductGridProps) {
    const { lang, t } = useAdminI18n();

    return (
        <div className={styles.productGrid}>
            {products.map((p) => {
                const isProcessing = processingIds.has(p.id);
                return (
                    <div 
                        key={p.id} 
                        className={styles.pCard}
                        style={{ opacity: isProcessing ? 0.6 : 1 }}
                    >
                        <div className={styles.imageWrapper}>
                            {p.image_url ? (
                                <Image src={p.image_url} alt={getLocalized(p.title, lang)} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 50vw, 25vw" />
                            ) : (
                                <div className={styles.placeholder}>🍰</div>
                            )}
                            <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                <button
                                    onClick={() => onToggleAvailability(p.id, p.is_available)}
                                    title={p.is_available ? t('visible') : t('hidden')}
                                    disabled={isProcessing}
                                    className={`${styles.visibilityBtn} ${p.is_available ? styles.visible : styles.hidden}`}
                                >
                                    {p.is_available ? <Eye size={13} /> : <EyeOff size={13} />}
                                    {p.is_available ? t('yes') : t('no')}
                                </button>
                            </div>
                        </div>
                        <div className={styles.pInfo}>
                            <div style={{ marginBottom: '12px' }}>
                                <span className={styles.pCategory}>
                                    {getLocalized(p.category, lang) || t('other')}
                                </span>
                            </div>
                            <h3 className={styles.pTitle}>{getLocalized(p.title, lang)}</h3>
                            {p.subtitle && <p className={styles.pSubtitle}>{getLocalized(p.subtitle, lang)}</p>}
                            <div className={styles.pFooter}>
                                <div className={styles.pPrice} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {p.base_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                </div>
                                <div className={styles.pActions}>
                                    <button
                                        onClick={() => onEdit(p)}
                                        className={styles.editBtn}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(p.id)}
                                        className={styles.deleteBtn}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
