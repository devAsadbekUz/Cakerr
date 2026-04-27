'use client';

import React, { memo, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPinned, CheckCircle2, XCircle, PackageCheck, Utensils, Truck, CheckCircle, Trash2, ChevronRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminOrder, AdminOrderListItem, AdminOrderItem } from '@/app/types/admin-order';
import { DepositModal } from './DepositModal';
import { FinalPaymentModal } from './FinalPaymentModal';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

type PaymentData = {
    deposit_amount?: number;
    final_payment_amount?: number;
};

type OrderCardProps = {
    order: AdminOrder | AdminOrderListItem;
    compact?: boolean;
    onUpdate: (id: string, status: string, paymentData?: PaymentData) => Promise<void>;
    onSelect: (order: AdminOrder | AdminOrderListItem) => void;
    onDelete?: (id: string) => Promise<void>;
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

export const OrderCard = memo(function OrderCard({ order, compact, onUpdate, onSelect, onDelete, disabled }: OrderCardProps) {
    const { lang, t } = useAdminI18n();
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [finalModalOpen, setFinalModalOpen] = useState(false);

    const statusLabels = useMemo(() => ({
        new: t('status_new'),
        confirmed: t('status_confirmed'),
        preparing: t('status_preparing'),
        ready: t('status_ready'),
        delivering: t('status_delivering'),
        completed: t('status_completed'),
        cancelled: t('status_cancelled'),
    }), [t]);

    const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS_FALLBACK;
    const s = { label: statusLabels[order.status as keyof typeof statusLabels] ?? order.status, ...sc };
    const deliveryDate = order.delivery_time ? new Date(order.delivery_time) : null;
    const isPickup = order.delivery_type === 'pickup' || !!order.branch_id || !!order.branches;

    const depositAmount = order.deposit_amount ?? 0;
    const finalPaymentAmount = order.final_payment_amount ?? 0;
    const totalPaid = depositAmount + finalPaymentAmount;
    const totalPrice = order.total_price ?? 0;
    const remaining = Math.max(0, totalPrice - totalPaid);
    const showPaymentBadge = ['confirmed', 'preparing', 'ready', 'delivering', 'completed'].includes(order.status);
    const noDepositWarning = depositAmount === 0 && ['confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);
    
    // Block confirmation if any item is a custom order with price not yet set
    const hasUnpricedCustomItem = order.status === 'new' && order.order_items?.some(
        item => (item.configuration?.mode === 'upload' || item.configuration?.mode === 'wizard') && (!item.unit_price || item.unit_price === 0)
    );

    const handleConfirmClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDepositModalOpen(true);
    };

    const handleCompleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFinalModalOpen(true);
    };

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

            <div className={styles.orderCard} onClick={() => onSelect(order)}>
                <div className={styles.orderCardHeader}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>#{order.id.slice(0, 8)}</span>
                            <span style={{
                                background: s.bg, color: s.color,
                                padding: '2px 8px', borderRadius: '6px',
                                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase'
                            }}>{s.label}</span>

                            {isPickup && (
                                <span style={{
                                    background: '#FFF1F2', color: '#BE185D',
                                    padding: '2px 8px', borderRadius: '6px',
                                    fontSize: '11px', fontWeight: 700,
                                    border: '1px solid #FFE4E6', textTransform: 'uppercase'
                                }}>
                                    🏪 {t('pickup') || 'Pickup'}
                                </span>
                            )}

                            <Link
                                href={`/admin/orders/${order.id}`}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '11px', fontWeight: 600, color: '#BE185D',
                                    textDecoration: 'none', padding: '2px 8px',
                                    borderRadius: '6px', background: 'white', border: '1.5px solid #F3F4F6'
                                }}
                            >
                                {t('viewFull' as any)} <ChevronRight size={12} />
                            </Link>

                            {order.created_by_name && (
                                <span style={{
                                    background: '#F0F9FF', color: '#0369A1',
                                    padding: '2px 8px', borderRadius: '6px',
                                    fontSize: '11px', fontWeight: 700,
                                    border: '1px solid #BAE6FD', textTransform: 'uppercase'
                                }}>
                                    🖥️ POS
                                </span>
                            )}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                            <CalendarIcon size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                            {deliveryDate ? (isToday(deliveryDate) ? t('today') : format(deliveryDate, 'd-MMM')) : '—'}, {order.delivery_slot}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                            <Clock size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                            {t('orderTime')}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(new Date(order.created_at), 'HH:mm')}</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{
                            fontWeight: 800, fontSize: '16px',
                            color: 'hsl(var(--color-primary-dark))',
                            fontVariantNumeric: 'tabular-nums'
                        }}>
                            {totalPrice.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                        </div>

                        {/* Payment badge */}
                        {showPaymentBadge && (
                            noDepositWarning ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: '#FEF3C7', color: '#92400E',
                                    padding: '2px 8px', borderRadius: '6px',
                                    fontSize: '11px', fontWeight: 700, border: '1px solid #FDE68A'
                                }}>
                                    <AlertTriangle size={10} />
                                    {lang === 'uz' ? "Avans yo'q" : "Аванс не получен"}
                                </div>
                            ) : (
                                <div style={{
                                    fontSize: '11px', fontWeight: 700,
                                    color: remaining === 0 ? '#065F46' : '#6B7280',
                                    background: remaining === 0 ? '#D1FAE5' : '#F3F4F6',
                                    padding: '2px 8px', borderRadius: '6px',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {totalPaid.toLocaleString()} / {totalPrice.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {!compact && (
                    <>
                        <div className={styles.orderCardCustomer}>
                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                                {order.customer_name || order.profiles?.full_name || t('client')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'flex-start' }}>
                                <MapPinned size={14} style={{ marginRight: 6, marginTop: 1, minWidth: '14px' }} />
                                <span style={{ lineHeight: '1.4' }}>
                                    {isPickup
                                        ? (lang === 'uz' ? (order.branches?.name_uz || '') : (order.branches?.name_ru || '')) + ' - ' +
                                          (lang === 'uz' ? (order.branches?.address_uz || '') : (order.branches?.address_ru || ''))
                                        : (order.delivery_address?.street || t('noAddress'))
                                    }
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '4px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>{t('items')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {order.order_items?.map((item: AdminOrderItem) => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: '#374151', fontWeight: 500 }}>
                                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.quantity}x</span> {item.name || t('cake')}
                                        </span>
                                        <span style={{ color: '#6B7280', fontSize: '12px' }}>{item.configuration?.portion || ''}</span>
                                    </div>
                                ))}
                                {(('items_count' in order ? order.items_count : 0) || 0) > (order.order_items?.length || 0) && (
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                                        + {((('items_count' in order ? order.items_count : 0) || 0) - (order.order_items?.length || 0))} {t('items').toLowerCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className={styles.orderActionContainer} onClick={(e) => e.stopPropagation()}>
                    {order.status === 'new' && (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button 
                                disabled={disabled || !!hasUnpricedCustomItem} 
                                onClick={handleConfirmClick} 
                                className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                                style={{ flex: 2 }}
                                title={hasUnpricedCustomItem ? (lang === 'uz' ? 'Tasdiqlashdan avval narxni belgilang' : 'Установите цену перед подтверждением') : ''}
                            >
                                <CheckCircle2 size={16} /> {t('confirmOrder')}
                            </button>
                            {hasUnpricedCustomItem && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onSelect(order); }} // Opens the modal where they can set price inline
                                    className={styles.orderActionBtn} 
                                    style={{ flex: 1, background: '#FFF1F2', color: '#BE185D', border: '1.5px solid #F9A8D4', fontSize: '12px' }}
                                >
                                    🏷️ {t('setPrice')}
                                </button>
                            )}
                        </div>
                    )}
                    {order.status === 'confirmed' && (
                        <button disabled={disabled} onClick={(e) => { e.stopPropagation(); onUpdate(order.id, 'preparing'); }} className={`${styles.orderActionBtn} ${styles.orderActionBtnPreparing}`}>
                            <Utensils size={16} /> {t('startCooking')}
                        </button>
                    )}
                    {order.status === 'preparing' && (
                        <button disabled={disabled} onClick={(e) => { e.stopPropagation(); onUpdate(order.id, 'ready'); }} className={`${styles.orderActionBtn} ${styles.orderActionBtnReady}`}>
                            <CheckCircle size={16} /> {t('finishCooking')}
                        </button>
                    )}
                    {order.status === 'ready' && !isPickup && (
                        <button disabled={disabled} onClick={(e) => { e.stopPropagation(); onUpdate(order.id, 'delivering'); }} className={`${styles.orderActionBtn} ${styles.orderActionBtnDelivering}`}>
                            <Truck size={16} /> {t('startDelivery')}
                        </button>
                    )}
                    {order.status === 'ready' && isPickup && (
                        <button disabled={disabled} onClick={handleCompleteClick} className={`${styles.orderActionBtn} ${styles.orderActionBtnSuccess}`}>
                            <CheckCircle size={16} /> {t('finish') || 'Finish'}
                        </button>
                    )}
                    {order.status === 'delivering' && (
                        <button disabled={disabled} onClick={handleCompleteClick} className={`${styles.orderActionBtn} ${styles.orderActionBtnSuccess}`}>
                            <CheckCircle size={16} /> {t('finishDelivery')}
                        </button>
                    )}
                    {onDelete && (order.status === 'new' || order.status === 'cancelled') && (
                        <button disabled={disabled} onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className={`${styles.orderActionBtn} ${styles.orderActionBtnDanger}`}>
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
});
