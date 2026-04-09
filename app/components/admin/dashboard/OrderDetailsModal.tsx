'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    XCircle, MapPinned, Calendar as CalendarIcon, PackageCheck,
    CheckCircle2, Utensils, Truck, CheckCircle, ZoomIn, History,
    Banknote, CreditCard, Coins, Tag, AlertTriangle, Receipt, AlertCircle,
    Check, X, Loader2
} from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminOrderItem, AdminOrderCardData } from '@/app/types/admin-order';
import { DepositModal } from './DepositModal';
import { FinalPaymentModal } from './FinalPaymentModal';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

type PaymentData = {
    deposit_amount?: number;
    final_payment_amount?: number;
};

type OrderDetailsModalProps = {
    order: AdminOrderCardData;
    onClose: () => void;
    onUpdate: (id: string, status: string, paymentData?: PaymentData) => void;
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
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [finalModalOpen, setFinalModalOpen] = useState(false);

    // Inline price editing state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    const handleSavePrice = async (itemId: string) => {
        const price = parseFloat(editValue);
        if (isNaN(price) || price < 0) return;

        setIsSavingPrice(true);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({ item_id: itemId, unit_price: price })
            });

            if (!response.ok) throw new Error('Failed to update price');
            
            // Successfully updated price! 
            // We need to refresh the UI. Since the Dashboard parent usually
            // handles data fetching, we can call refresh if it's passed or
            // just clear the state and wait for the next periodic refresh.
            // Better: let's use router.refresh() to trigger server component update if applicable
            // or just rely on the parent's poll if it exists.
            setEditingItemId(null);
            router.refresh(); 
            // NOTE: In many cases on this project, we might need a more direct way
            // to update the order object prop. For now, clearing state is first step.
        } catch (err) {
            console.error('[OrderDetailsModal] Save error:', err);
            alert('Xatolik yuz berdi narxni saqlashda');
        } finally {
            setIsSavingPrice(false);
        }
    };

    const statusLabels = useMemo(() => ({
        new: t('status_new'),
        confirmed: t('status_confirmed'),
        preparing: t('status_preparing'),
        ready: t('status_ready'),
        delivering: t('status_delivering'),
        completed: t('status_completed'),
        cancelled: t('status_cancelled'),
    }), [t]);

    // Also check order.branches — guards against existing POS orders where
    // delivery_type was silently stored as 'delivery' due to a missing ::delivery_type
    // cast in the create_pos_order RPC (fixed in migration 91).
    const isPickup = order.delivery_type === 'pickup' || !!order.branch_id || !!order.branches;
    const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS_FALLBACK;
    const s = { label: statusLabels[order.status as keyof typeof statusLabels] ?? order.status, ...sc };

    const depositAmount = order.deposit_amount ?? 0;
    const totalPrice = order.total_price ?? 0;
    const remaining = Math.max(0, totalPrice - depositAmount);
    const showPaymentSection = ['confirmed', 'preparing', 'ready', 'delivering', 'completed'].includes(order.status);
    const noDepositWarning = depositAmount === 0 && ['confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);

    // Block confirmation if any item is a custom order with price not yet set
    const hasUnpricedCustomItem = order.status === 'new' && order.order_items?.some(
        item => (item.configuration?.mode === 'upload' || item.configuration?.mode === 'wizard') && (!item.unit_price || item.unit_price === 0)
    );

    const handleDepositConfirm = (amount: number) => {
        setDepositModalOpen(false);
        onUpdate(order.id, 'confirmed', { deposit_amount: amount });
    };

    const handleFinalPaymentConfirm = (amount: number) => {
        setFinalModalOpen(false);
        onUpdate(order.id, 'completed', { final_payment_amount: amount });
    };

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
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{
                                    background: s.bg, color: s.color,
                                    padding: '4px 12px', borderRadius: '8px',
                                    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                }}>
                                    {s.label}
                                </span>
                                {order.created_by_name && (
                                    <span style={{
                                        background: '#F0F9FF', color: '#0369A1',
                                        padding: '4px 12px', borderRadius: '8px',
                                        fontSize: '12px', fontWeight: 700,
                                        textTransform: 'uppercase', border: '1px solid #BAE6FD'
                                    }}>
                                        🖥️ {t('pos')}
                                    </span>
                                )}
                            </div>
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
                        {/* Customer */}
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
                                padding: '12px', borderRadius: '12px',
                                border: '1px solid rgba(55, 65, 81, 0.08)', marginBottom: '16px'
                            }}>
                                <div className={styles.infoLabel}>{t('acceptedBy')}</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PackageCheck size={18} color="#6B7280" />
                                    {order.created_by_name === 'Owner' ? t('owner') : order.created_by_name}
                                </div>
                            </div>
                        )}

                        {/* Delivery */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>{isPickup ? t('branch') : t('delivery')}</div>
                            <div style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <MapPinned size={18} color="hsl(var(--color-primary-dark))" />
                                {isPickup ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700 }}>
                                            {lang === 'uz' ? order.branches?.name_uz : order.branches?.name_ru}
                                        </span>
                                        {order.branches?.location_link ? (
                                            <a href={order.branches.location_link} target="_blank" rel="noopener noreferrer"
                                                style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>
                                                {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: '13px' }}>
                                                {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    order.delivery_address?.lat && order.delivery_address?.lng ? (
                                        <a href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                                            {order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}
                                        </a>
                                    ) : (
                                        <span>{order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}</span>
                                    )
                                )}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                                <CalendarIcon size={14} style={{ marginRight: 4 }} />
                                {order.delivery_time ? format(new Date(order.delivery_time), 'd MMMM, yyyy') : '—'}, {order.delivery_slot}
                            </div>
                        </div>

                        {/* Comment */}
                        {order.comment && (
                            <div className={styles.infoSection} style={{ background: '#F0F9FF', padding: '12px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                                <div className={styles.infoLabel} style={{ color: '#0369A1' }}>{t('orderComment')}</div>
                                <div style={{ fontSize: '14px', color: '#0C4A6E', fontStyle: 'italic' }}>
                                    &ldquo;{order.comment}&rdquo;
                                </div>
                            </div>
                        )}

                        {/* Payment method */}
                        {(order.payment_method || (order.coins_spent ?? 0) > 0 || (order.promo_discount ?? 0) > 0) && (
                            <div className={styles.infoSection} style={{ background: '#F9FAFB', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '4px' }}>
                                <div className={styles.infoLabel}>{t('paymentMethod')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                    {order.payment_method && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                            {order.payment_method === 'cash' ? <Banknote size={16} color="#059669" /> : <CreditCard size={16} color="#3B82F6" />}
                                            {order.payment_method === 'cash' ? t('paymentCash') : t('paymentCard')}
                                        </div>
                                    )}
                                    {(order.promo_discount ?? 0) > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#BE185D' }}>
                                            <Tag size={14} />
                                            {t('promoDiscount')}: <strong>-{(order.promo_discount ?? 0).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</strong>
                                        </div>
                                    )}
                                    {(order.coins_spent ?? 0) > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D97706' }}>
                                            <Coins size={14} />
                                            {t('coinsUsed')}: <strong>-{(order.coins_spent ?? 0).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Deposit & Payment Status ── */}
                        {showPaymentSection && (
                            <div className={styles.infoSection} style={{
                                background: noDepositWarning ? '#FFFBEB' : '#F0FDF4',
                                padding: '14px 16px', borderRadius: '12px',
                                border: `1px solid ${noDepositWarning ? '#FDE68A' : '#BBF7D0'}`,
                                marginBottom: '4px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div className={styles.infoLabel} style={{ color: noDepositWarning ? '#92400E' : '#065F46' }}>
                                        {t('paymentStatus')}
                                    </div>
                                    <Link
                                        href={`/admin/orders/${order.id}/payments`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#BE185D', textDecoration: 'none' }}
                                    >
                                        <Receipt size={13} />
                                        {t('tarix')}
                                    </Link>
                                </div>

                                {noDepositWarning && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', padding: '8px 10px', background: '#FEF3C7', borderRadius: '8px' }}>
                                        <AlertTriangle size={14} color="#92400E" />
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                                            {t('noDepositWarning')}
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280' }}>
                                        <span>{t('total')}:</span>
                                        <span style={{ fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                                            {totalPrice.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280' }}>
                                        <span>{lang === 'uz' ? 'Avans' : 'Аванс'}:</span>
                                        <span style={{ fontWeight: 700, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                                            {depositAmount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                        </span>
                                    </div>
                                    <div style={{ height: '1px', background: '#E5E7EB' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ fontWeight: 700, color: '#111827' }}>
                                            {t('remaining')}:
                                        </span>
                                        {remaining === 0 ? (
                                            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                                {t('paid')}
                                            </span>
                                        ) : (
                                            <span style={{ fontWeight: 800, color: '#BE185D', fontVariantNumeric: 'tabular-nums' }}>
                                                {remaining.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Items */}
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
                                            <h3 className={styles.itemName} style={{ fontSize: '15px', fontWeight: 700 }}>{item.name || t('cake')}</h3>
                                            <div className={styles.itemConfig} style={{ fontSize: '12px' }}>
                                                {item.configuration?.mode === 'upload' ? (
                                                    <div style={{ color: 'hsl(var(--color-primary-dark))', fontWeight: 700, fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>📸 {t('basedOnPhoto')}</div>
                                                ) : item.configuration?.mode === 'wizard' ? (
                                                    <div style={{ color: '#0369A1', fontWeight: 700, fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>🎂 {t('viaBuilder')}</div>
                                                ) : null}
                                                {item.configuration?.shape && <div>Shakl: {item.configuration.shape}</div>}
                                                {item.configuration?.size && <div>O&apos;lcham: {item.configuration.size}</div>}
                                                {item.configuration?.sponge && <div>{t('sponge')}: {item.configuration.sponge}</div>}
                                                {item.configuration?.flavor && <div>{t('flavorCream')}: {item.configuration.flavor}</div>}
                                                {item.configuration?.decorations && <div>Bezaklar: {item.configuration.decorations}</div>}
                                                {item.configuration?.portion && !item.configuration?.size && <div>{t('portionSize')}: {item.configuration.portion}</div>}
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
                                                <div className={styles.itemPrice} style={{ fontVariantNumeric: 'tabular-nums', flex: 1 }}>
                                                    {editingItemId === item.id ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className={styles.posSearchInput} // Reuse POS styles for basic input
                                                                style={{ padding: '4px 8px', width: '90px', height: '32px', fontSize: '13px' }}
                                                                autoFocus
                                                                placeholder={t('price')}
                                                            />
                                                            <button 
                                                                disabled={isSavingPrice}
                                                                onClick={() => handleSavePrice(item.id)}
                                                                style={{ padding: '6px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                                                            >
                                                                {isSavingPrice ? <Loader2 size={16} className={styles.spinner} /> : <Check size={16} />}
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingItemId(null)}
                                                                style={{ padding: '6px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span>
                                                                {item.unit_price && item.unit_price > 0 ? (
                                                                    <>{((item.unit_price || 0) * item.quantity).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</>
                                                                ) : (
                                                                    <span style={{ color: '#BE185D', fontWeight: 800 }}>{t('negotiable')}</span>
                                                                )}
                                                            </span>
                                                            {order.status === 'new' && (
                                                                <button 
                                                                    onClick={() => { setEditingItemId(item.id); setEditValue(item.unit_price?.toString() || ''); }}
                                                                    style={{ 
                                                                        border: 'none', padding: '4px 8px', 
                                                                        borderRadius: '6px', cursor: 'pointer', color: '#BE185D', 
                                                                        fontSize: '11px', fontWeight: 700, background: '#FFF1F2' 
                                                                    }}
                                                                >
                                                                    {item.unit_price && item.unit_price > 0 ? t('edit') : `🏷️ ${t('setPrice')}`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
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
                                    {totalPrice.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <footer className={styles.modalFooter}>
                        {order.status === 'new' && cancelConfirm && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginBottom: '10px', padding: '10px 12px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                                <span style={{ flex: 1, fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>{t('cancelConfirmQuestion')}</span>
                                <button disabled={disabled} onClick={() => { onUpdate(order.id, 'cancelled'); setCancelConfirm(false); }} className={`${styles.orderActionBtn} ${styles.orderActionBtnDanger}`} style={{ width: 'auto', padding: '8px 16px' }}>✓</button>
                                <button disabled={disabled} onClick={() => setCancelConfirm(false)} className={styles.orderActionBtn} style={{ width: 'auto', padding: '8px 16px', background: '#F3F4F6', color: '#374151' }}>✗</button>
                            </div>
                        )}
                        <div className={styles.modalActionsGroup}>
                            {order.status === 'new' && (
                                <>
                                    {hasUnpricedCustomItem && (
                                        <div style={{
                                            width: '100%', marginBottom: '12px', padding: '12px 14px',
                                            background: '#FFF7ED', border: '1px solid #FDBA74',
                                            borderRadius: '12px', fontSize: '13px', color: '#9A3412',
                                            lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '4px'
                                        }}>
                                            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertCircle size={16} /> {t('confirmPriceFirst')}
                                            </div>
                                            <button
                                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                                                style={{
                                                    background: '#BE185D', color: 'white', border: 'none',
                                                    borderRadius: '8px', padding: '6px 12px', fontWeight: 700,
                                                    cursor: 'pointer', fontSize: '12px', alignSelf: 'flex-start',
                                                    marginTop: '4px'
                                                }}
                                            >
                                                {t('setPrice')}
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        disabled={disabled || !!hasUnpricedCustomItem}
                                        onClick={() => setDepositModalOpen(true)}
                                        className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                                        title={hasUnpricedCustomItem ? (lang === 'uz' ? 'Tasdiqlashdan avval narxni belgilang' : 'Установите цену перед подтверждением') : ''}
                                    >
                                        <CheckCircle2 size={18} /> {t('confirmOrder')}
                                    </button>
                                    <button disabled={disabled} onClick={() => setCancelConfirm(true)} className={`${styles.orderActionBtn} ${styles.orderActionBtnDanger}`}>
                                        <XCircle size={18} /> {t('cancelNewOrder')}
                                    </button>
                                </>
                            )}
                            {order.status === 'confirmed' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'preparing')} className={`${styles.orderActionBtn} ${styles.orderActionBtnPreparing}`}>
                                    <Utensils size={18} /> {t('startCooking')}
                                </button>
                            )}
                            {order.status === 'preparing' && (
                                <button disabled={disabled} onClick={() => onUpdate(order.id, 'ready')} className={`${styles.orderActionBtn} ${styles.orderActionBtnReady}`}>
                                    <CheckCircle size={18} /> {t('finishCooking')}
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button
                                    disabled={disabled}
                                    onClick={() => isPickup ? setFinalModalOpen(true) : onUpdate(order.id, 'delivering')}
                                    className={`${styles.orderActionBtn} ${isPickup ? styles.orderActionBtnSuccess : styles.orderActionBtnDelivering}`}
                                >
                                    {isPickup ? <CheckCircle size={18} /> : <Truck size={18} />}
                                    {isPickup ? (t('finish') || 'Finish') : t('startDelivery')}
                                </button>
                            )}
                            {order.status === 'delivering' && (
                                <button disabled={disabled} onClick={() => setFinalModalOpen(true)} className={`${styles.orderActionBtn} ${styles.orderActionBtnSuccess}`}>
                                    <CheckCircle size={18} /> {t('finishDelivery')}
                                </button>
                            )}
                            <button onClick={() => router.push(`/admin/orders/${order.id}`)} className={styles.orderActionBtn} style={{ background: 'white', color: '#BE185D', border: '1.5px solid #F9A8D4', flex: 1 }}>
                                <History size={18} /> {t('viewFull')}
                            </button>
                            <button onClick={onClose} className={styles.orderActionBtn} style={{ background: '#F3F4F6', color: '#374151', flex: 1 }}>
                                {t('close')}
                            </button>
                        </div>
                        {['confirmed', 'preparing', 'ready', 'delivering'].includes(order.status) && (
                            <div style={{ marginTop: '10px', textAlign: 'center', width: '100%' }}>
                                <button onClick={() => router.push(`/admin/orders/${order.id}`)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                                    ⚠️ {t('cancelOrderLink')}
                                </button>
                            </div>
                        )}
                    </footer>
                </div>
            </div>
            <DepositModal
                isOpen={depositModalOpen}
                onClose={() => setDepositModalOpen(false)}
                onConfirm={handleDepositConfirm}
                totalPrice={totalPrice}
                lang={lang as 'uz' | 'ru'}
                disabled={disabled}
            />
            <FinalPaymentModal
                isOpen={finalModalOpen}
                onClose={() => setFinalModalOpen(false)}
                onConfirm={handleFinalPaymentConfirm}
                totalPrice={totalPrice}
                depositAmount={depositAmount}
                lang={lang as 'uz' | 'ru'}
                disabled={disabled}
            />
        </>
    );
}
