'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    XCircle, MapPinned, Calendar as CalendarIcon, PackageCheck,
    CheckCircle2, Utensils, Truck, CheckCircle, ZoomIn, History,
    Banknote, CreditCard, Coins, Tag
} from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminOrder, AdminOrderListItem, AdminOrderItem, AdminOrderCardData } from '@/app/types/admin-order';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

type OrderDetailsModalProps = {
    order: AdminOrderCardData;
    onClose: () => void;
    onUpdate: (id: string, status: string) => void;
    loading?: boolean;
    disabled?: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    new: { bg: '#FEF3C7', color: '#92400E' },
    confirmed: { bg: '#DBEAFE', color: '#1E40AF' },
    preparing: { bg: '#F3E8FF', color: '#6B21A8' },
    ready: { bg: '#D1FAE5', color: '#065F46' },
    delivering: { bg: '#E0F2FE', color: '#075985' },
    completed: { bg: '#F3F4F6', color: '#374151' },
    cancelled: { bg: '#FEE2E2', color: '#991B1B' },
};

const STATUS_COLORS_FALLBACK = { bg: '#F3F4F6', color: '#374151' };

function ImagePreviewModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
            <div style={{ position: 'relative', width: '90vw', height: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image src={imageUrl} alt="Order Preview" fill style={{ objectFit: 'contain' }} />
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', borderRadius: '50%', padding: '8px', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                    <XCircle size={24} color="#111827" />
                </button>
            </div>
        </div>
    );
}

export function OrderDetailsModal({ order, onClose, onUpdate, loading = false, disabled = false }: OrderDetailsModalProps) {
    const { lang, t } = useAdminI18n();
    const router = useRouter();
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const statusLabels = useMemo(() => ({
        new: t('status_new'), 
        confirmed: t('status_confirmed'), 
        preparing: t('status_preparing'),
        ready: t('status_ready'), 
        delivering: t('status_delivering'),
        completed: t('status_completed'), 
        cancelled: t('status_cancelled'),
    }), [t]);

    const isPickup = order.delivery_type === 'pickup' || !!order.branch_id;

    const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS_FALLBACK;
    const s = { label: statusLabels[order.status as keyof typeof statusLabels] ?? order.status, ...sc };

    return (
        <>
            {previewImage && (
                <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
            )}
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                    <header className={styles.modalHeader}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                                {t('orderNumber')} <span style={{ fontVariantNumeric: 'tabular-nums' }}>#{order.id.slice(0, 8)}</span>
                            </h2>
                            <span style={{ 
                                background: s.bg, 
                                color: s.color, 
                                padding: '4px 12px', 
                                borderRadius: '8px', 
                                fontSize: '12px', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                marginTop: '8px', 
                                display: 'inline-block' 
                            }}>
                                {s.label}
                            </span>
                            {loading && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
                                    {t('loading')}…
                                </div>
                            )}
                        </div>
                        <button className={styles.modalClose} onClick={onClose}>
                            <XCircle size={20} />
                        </button>
                    </header>

                    <div className={styles.modalContent}>
                        <div className={styles.customerCard}>
                            <div style={{ 
                                width: '56px', height: '56px', borderRadius: '50%', 
                                background: 'hsl(var(--color-primary))', 
                                color: 'hsl(var(--color-primary-text))', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: '24px', fontWeight: 800 
                            }}>
                                {order.customer_name?.[0] || order.profiles?.full_name?.[0] || 'U'}
                            </div>
                            <div className={styles.infoSection}>
                                <div className={styles.infoLabel}>{t('clientInfo')}</div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                                    {order.customer_name || order.profiles?.full_name || t('client')}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                                    {order.customer_phone || order.profiles?.phone_number || t('noPhone')}
                                </div>
                            </div>
                        </div>

                        {order.created_by_name && (
                            <div className={styles.infoSection} style={{ 
                                background: 'rgba(55, 65, 81, 0.03)', 
                                padding: '12px', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(55, 65, 81, 0.08)', 
                                marginBottom: '16px' 
                            }}>
                                <div className={styles.infoLabel}>{t('acceptedBy')}</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PackageCheck size={18} color="#6B7280" /> 
                                    {order.created_by_name === 'Owner' ? (lang === 'uz' ? 'Asosiy rahbar' : 'Владелец') : order.created_by_name}
                                </div>
                            </div>
                        )}

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>{isPickup ? t('branch') : t('delivery')}</div>
                            <div style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <MapPinned size={18} color="hsl(var(--color-primary-dark))" />
                                {isPickup ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700 }}>
                                                {lang === 'uz' ? order.branches?.name_uz : order.branches?.name_ru}
                                            </span>
                                            {order.branches?.location_link ? (
                                                <a
                                                    href={order.branches.location_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}
                                                >
                                                    {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: '13px' }}>
                                                    {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    order.delivery_address?.lat && order.delivery_address?.lng ? (
                                        <a
                                            href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            {order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}
                                        </a>
                                    ) : (
                                        <span>{order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}</span>
                                    )
                                )}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                                <CalendarIcon size={14} style={{ marginRight: 4 }} />
                                {format(new Date(order.delivery_time), 'd MMMM, yyyy')}, {order.delivery_slot}
                            </div>
                        </div>

                        {order.comment && (
                            <div className={styles.infoSection} style={{ background: '#F0F9FF', padding: '12px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                                <div className={styles.infoLabel} style={{ color: '#0369A1' }}>{t('orderComment')}</div>
                                <div style={{ fontSize: '14px', color: '#0C4A6E', fontStyle: 'italic' }}>
                                    &ldquo;{order.comment}&rdquo;
                                </div>
                            </div>
                        )}

                        {(order.payment_method || (order.coins_spent ?? 0) > 0 || (order.promo_discount ?? 0) > 0) && (
                            <div className={styles.infoSection} style={{ background: '#F9FAFB', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '4px' }}>
                                <div className={styles.infoLabel}>{t('paymentMethod')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                    {order.payment_method && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                            {order.payment_method === 'cash'
                                                ? <Banknote size={16} color="#059669" />
                                                : <CreditCard size={16} color="#3B82F6" />}
                                            {order.payment_method === 'cash' ? t('paymentCash') : t('paymentCard')}
                                        </div>
                                    )}
                                    {(order.promo_discount ?? 0) > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#BE185D' }}>
                                            <Tag size={14} />
                                            {t('promoDiscount')}: <strong>-{(order.promo_discount ?? 0).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</strong>
                                        </div>
                                    )}
                                    {(order.coins_spent ?? 0) > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D97706' }}>
                                            <Coins size={14} />
                                            {t('coinsUsed')}: <strong>-{(order.coins_spent ?? 0).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>{t('items')}</div>
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {order.order_items?.map((item: AdminOrderItem) => (
                                    <div key={item.id} className={styles.orderItemCard}>
                                        <div
                                            style={{ position: 'relative', cursor: 'pointer' }}
                                            onClick={() => {
                                                const imgUrl = item.configuration?.uploaded_photo_url || item.configuration?.drawing || item.products?.image_url;
                                                if (imgUrl) setPreviewImage(imgUrl as string);
                                            }}
                                        >
                                            <Image
                                                src={item.configuration?.uploaded_photo_url || item.configuration?.drawing || item.products?.image_url || '/placeholder.png'}
                                                alt={item.name}
                                                className={styles.itemImage}
                                                style={{ cursor: 'pointer', borderRadius: '8px', objectFit: 'cover' }}
                                                width={80}
                                                height={80}
                                            />
                                            {(item.configuration?.uploaded_photo_url || item.configuration?.drawing) && (
                                                <div style={{
                                                    position: 'absolute', bottom: '4px', right: '4px',
                                                    width: '24px', height: '24px', borderRadius: '6px',
                                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <ZoomIn size={14} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <h3 className={styles.itemName} style={{ fontSize: '15px', fontWeight: 700 }}>{item.name || (lang === 'uz' ? 'Tort' : 'Торт')}</h3>
                                            <div className={styles.itemConfig} style={{ fontSize: '12px' }}>
                                                {item.configuration?.mode === 'upload' ? (
                                                    <div style={{ color: 'hsl(var(--color-primary-dark))', fontWeight: 700, fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>📸 {t('basedOnPhoto')}</div>
                                                ) : item.configuration?.mode === 'builder' ? (
                                                    <div style={{ color: '#0369A1', fontWeight: 700, fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>🎂 {t('viaBuilder')}</div>
                                                ) : null}

                                                {item.configuration?.portion && <div>{t('portionSize')}: {item.configuration.portion}</div>}
                                                {item.configuration?.flavor && <div>{t('flavorCream')}: {item.configuration.flavor}</div>}
                                                {item.configuration?.shape && <div>{t('shape')}: {item.configuration.shape}</div>}
                                                {item.configuration?.sponge && <div>{t('sponge')}: {item.configuration.sponge}</div>}
                                                
                                                {(item.configuration?.custom_note || item.configuration?.order_note) && (
                                                    <div style={{ marginTop: '4px', padding: '6px', background: 'hsla(var(--color-primary), 0.05)', borderRadius: '6px', borderLeft: '3px solid hsl(var(--color-primary-dark))' }}>
                                                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'hsl(var(--color-primary-dark))', textTransform: 'uppercase' }}>
                                                            {item.configuration?.mode === 'upload' ? `${t('customerNote')}:` : `${t('congratulationNote')}:`}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#111827' }}>
                                                            {item.configuration.custom_note || item.configuration.order_note}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.itemPriceQty}>
                                                <div className={styles.itemPrice} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {((item.unit_price || 0) * item.quantity).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                                </div>
                                                <div className={styles.itemQtyBadge} style={{ fontVariantNumeric: 'tabular-nums' }}>{item.quantity} {t('pcs')}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid #F3F4F6', marginTop: '16px' }}>
                                <span style={{ fontWeight: 800, fontSize: '18px' }}>{t('totalPayment')}:</span>
                                <span style={{ fontWeight: 800, fontSize: '20px', color: 'hsl(var(--color-primary-dark))', fontVariantNumeric: 'tabular-nums' }}>
                                    {order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <footer className={styles.modalFooter}>
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                            {order.status === 'new' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'confirmed')} className={styles.modalActionBtn} style={{ background: '#F59E0B', color: 'white' }}>
                                    <CheckCircle2 size={18} /> {t('confirmOrder')}
                                </button>
                            )}
                            {order.status === 'confirmed' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'preparing')} className={styles.modalActionBtn} style={{ background: '#8B5CF6', color: 'white' }}>
                                    <Utensils size={18} /> {t('startCooking')}
                                </button>
                            )}
                            {order.status === 'preparing' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'ready')} className={styles.modalActionBtn} style={{ background: '#10B981', color: 'white' }}>
                                    <CheckCircle size={18} /> {t('finishCooking')}
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button 
                                    disabled={disabled} 
                                    onClick={() => onUpdate(order.id, isPickup ? 'completed' : 'delivering')} 
                                    className={styles.modalActionBtn} 
                                    style={{ background: isPickup ? '#059669' : '#3B82F6', color: 'white' }}
                                >
                                    {isPickup ? <CheckCircle size={18} /> : <Truck size={18} />} 
                                    {isPickup ? (t('finish' as any) || 'Finish') : t('startDelivery')}
                                </button>
                            )}
                            {order.status === 'delivering' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'completed')} className={styles.modalActionBtn} style={{ background: '#059669', color: 'white' }}>
                                    <CheckCircle size={18} /> {t('finishDelivery')}
                                </button>
                            )}
                            <button 
                                onClick={() => router.push(`/admin/orders/${order.id}`)} 
                                className={styles.modalActionBtn} 
                                style={{ background: 'white', color: '#BE185D', border: '1.5px solid #F3F4F6' }}
                            >
                                <History size={18} /> {t('viewFull' as any)}
                            </button>
                            <button onClick={onClose} className={styles.modalActionBtn} style={{ background: '#F3F4F6', color: '#374151' }}>
                                {t('close')}
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
