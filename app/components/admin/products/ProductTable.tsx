'use client';

import React from 'react';
import Image from 'next/image';
import { Edit2, Trash2, Eye, EyeOff, Package as PackageIcon } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';

interface ProductTableProps {
    products: any[];
    onEdit: (product: any) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, current: boolean) => void;
    onToggleReady: (id: string, current: boolean) => void;
    processingIds: Set<string>;
}

export function ProductTable({
    products,
    onEdit,
    onDelete,
    onToggleAvailability,
    onToggleReady,
    processingIds
}: ProductTableProps) {
    const { lang, t } = useAdminI18n();

    return (
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
                    {products.map((p) => {
                        const isProcessing = processingIds.has(p.id);
                        return (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', opacity: isProcessing ? 0.6 : 1 }}>
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
                                        {getLocalized(p.category, lang) || t('other')}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {p.base_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <button
                                        onClick={() => onToggleAvailability(p.id, p.is_available)}
                                        disabled={isProcessing}
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
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {p.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {p.is_available ? t('yes') : t('no')}
                                    </button>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <button
                                        onClick={() => onToggleReady(p.id, p.is_ready)}
                                        disabled={isProcessing}
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
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <PackageIcon size={14} />
                                        {p.is_ready ? t('ready') : t('waiting')}
                                    </button>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => onEdit(p)}
                                        style={{
                                            padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                                            borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '8px'
                                        }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(p.id)}
                                        style={{
                                            padding: '8px', background: '#FEF2F2', color: '#DC2626',
                                            borderRadius: '8px', border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
