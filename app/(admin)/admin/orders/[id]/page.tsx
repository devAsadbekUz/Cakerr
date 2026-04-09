'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
    ArrowLeft, MapPinned, Calendar, Clock, User,
    Package, CheckCircle2, AlertCircle,
    History, ChevronDown, ChevronUp, XCircle,
    AlertTriangle, Receipt, Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { orderService } from '@/app/services/orderService';
import { updateOrderStatusAction } from '@/app/actions/admin-actions';
import type { AdminOrder, AdminOrderItem } from '@/app/types/admin-order';
import styles from '../../AdminDashboard.module.css';

type OrderLog = {
    id: string;
    old_status: string | null;
    new_status: string;
    changed_by_name: string;
    created_at: string;
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { lang, t } = useAdminI18n();
    const router = useRouter();
    const [order, setOrder] = useState<AdminOrder | null>(null);
    const [logs, setLogs] = useState<OrderLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cancel section state
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelNote, setCancelNote] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // Edit deposit state
    const [editDepositOpen, setEditDepositOpen] = useState(false);
    const [editDepositValue, setEditDepositValue] = useState('');
    const [editDepositLoading, setEditDepositLoading] = useState(false);
    const [editDepositError, setEditDepositError] = useState<string | null>(null);

    // Edit photo item price state
    const [editPriceItemId, setEditPriceItemId] = useState<string | null>(null);
    const [editPriceValue, setEditPriceValue] = useState('');
    const [editPriceLoading, setEditPriceLoading] = useState(false);
    const [editPriceError, setEditPriceError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [orderData, logData] = await Promise.all([
                orderService.getOrderAdmin(id),
                orderService.getOrderLogsAdmin(id)
            ]);

            if (!orderData) {
                setError('Order not found');
            } else {
                setOrder(orderData);
                setLogs(logData);
            }
        } catch {
            setError('Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statusColors: Record<string, { bg: string; text: string }> = {
        new: { bg: '#FEF3C7', text: '#B45309' },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
        preparing: { bg: '#FDE68A', text: '#78350F' },
        ready: { bg: '#D1FAE5', text: '#065F46' },
        delivering: { bg: '#E0E7FF', text: '#3730A3' },
        completed: { bg: '#F3F4F6', text: '#374151' },
        cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    };

    if (loading) return <div className={styles.container}><div style={{ textAlign: 'center', padding: '100px' }}>{t('loading')}</div></div>;
    if (error || !order) return (
        <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '100px' }}>
                <AlertCircle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
                <h2>{error || t('error')}</h2>
                <Link href="/admin/orders" style={{ marginTop: '16px', display: 'inline-block', color: '#BE185D', fontWeight: 700 }}>{t('backToOrders')}</Link>
            </div>
        </div>
    );

    const sc = statusColors[order.status] || { bg: '#F3F4F6', text: '#374151' };
    const canCancel = !['completed', 'cancelled'].includes(order.status);

    const depositAmount = order.deposit_amount ?? 0;
    const totalPrice = order.total_price ?? 0;
    const remaining = Math.max(0, totalPrice - depositAmount);
    const showPaymentSection = ['confirmed', 'preparing', 'ready', 'delivering', 'completed'].includes(order.status);
    const noDepositWarning = depositAmount === 0 && ['confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);

    const CANCEL_REASONS = [
        t('cancelReasonCustomerRequest'),
        t('cancelReasonOutOfStock'),
        t('cancelReasonOperational'),
        t('cancelReasonDuplicate'),
        t('cancelReasonOther'),
    ];

    const handleCancelOrder = async () => {
        if (!cancelReason) return;
        setCancelLoading(true);
        setCancelError(null);
        try {
            const fullReason = cancelNote.trim()
                ? `${cancelReason}: ${cancelNote.trim()}`
                : cancelReason;
            const result = await updateOrderStatusAction(order.id, 'cancelled', lang, fullReason);
            if (result?.error) {
                setCancelError(t('cancelError'));
            } else {
                router.push('/admin/orders');
            }
        } catch {
            setCancelError(t('cancelError'));
        } finally {
            setCancelLoading(false);
        }
    };

    const handleEditPrice = async (itemId: string) => {
        const newPrice = parseInt(editPriceValue.replace(/\D/g, ''), 10);
        if (isNaN(newPrice) || newPrice <= 0) {
            setEditPriceError(lang === 'uz' ? "Noto'g'ri summa" : "Неверная сумма");
            return;
        }
        setEditPriceLoading(true);
        setEditPriceError(null);
        try {
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ item_id: itemId, unit_price: newPrice })
            });
            if (!res.ok) {
                const data = await res.json();
                setEditPriceError(data.error || 'Error');
                return;
            }
            await fetchData();
            router.refresh();
            setEditPriceItemId(null);
            setEditPriceValue('');
        } catch {
            setEditPriceError(lang === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
        } finally {
            setEditPriceLoading(false);
        }
    };

    const handleAddPayment = async () => {
        const increment = parseInt(editDepositValue.replace(/[^\d-]/g, ''), 10);
        if (isNaN(increment) || (increment === 0)) {
            setEditDepositError(lang === 'uz' ? "Noto'g'ri summa" : "Неверная сумма");
            return;
        }
        setEditDepositLoading(true);
        setEditDepositError(null);
        try {
            const res = await fetch(`/api/admin/orders/${id}/deposit`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ payment_increment: increment })
            });
            if (!res.ok) {
                const data = await res.json();
                setEditDepositError(data.error || 'Error');
                return;
            }
            await fetchData();
            setEditDepositOpen(false);
            setEditDepositValue('');
        } catch {
            setEditDepositError(lang === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
        } finally {
            setEditDepositLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.back()} className={styles.modalClose} style={{ width: '40px', height: '40px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{t('orderNumber')} #{order.id.slice(0, 8)}</h1>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{
                                background: sc.bg, color: sc.text,
                                padding: '2px 10px', borderRadius: '6px',
                                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase'
                            }}>
                                {t(`status_${order.status}` as any) || order.status}
                            </span>
                            {order.created_by_name && (
                                <span style={{
                                    background: '#F0F9FF', color: '#0369A1',
                                    padding: '2px 10px', borderRadius: '6px',
                                    fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                                    border: '1px solid #BAE6FD'
                                }}>
                                    🖥️ POS
                                </span>
                            )}
                            <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}
                            </span>
                            {order.last_updated_by_name && (
                                <span style={{
                                    fontSize: '11px', color: '#BE185D', background: '#FFF1F2',
                                    padding: '2px 8px', borderRadius: '4px', border: '1px solid #FFE4E6',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <User size={10} /> {t('receivedBy')}: {order.last_updated_by_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Refund needed banner */}
            {order.refund_needed && (
                <div style={{
                    margin: '0 0 24px', padding: '14px 20px',
                    background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                    <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '15px' }}>
                            {lang === 'uz' ? "Qaytarish kerak" : "Необходим возврат"}
                        </div>
                        <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
                            {lang === 'uz'
                                ? `Buyurtma bekor qilindi. Mijozga ${depositAmount.toLocaleString()} so'm qaytarilishi kerak.`
                                : `Заказ отменён. Клиенту необходимо вернуть ${depositAmount.toLocaleString()} сум.`}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.orderDetailGrid}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Customer & Delivery */}
                    <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={16} /> {t('clientInfo')}
                                </h3>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{order.customer_name || order.profiles?.full_name || t('client')}</div>
                                <div style={{ fontSize: '15px', color: '#6B7280', marginTop: '4px' }}>{order.customer_phone || order.profiles?.phone_number || '-'}</div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPinned size={16} /> {(order.delivery_type === 'pickup' || !!order.branch_id || !!order.branches) ? (t('pickup') || 'Olib ketish') : t('delivery')}
                                </h3>

                                {(order.delivery_type === 'pickup' || !!order.branch_id || !!order.branches) ? (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#BE185D' }}>
                                            {lang === 'uz' ? order.branches?.name_uz : order.branches?.name_ru}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                            {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                        </div>
                                        {order.branches?.location_link && (
                                            <a href={order.branches.location_link} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, marginTop: '8px', display: 'inline-block', textDecoration: 'none' }}>
                                                {t('openInMaps') || 'Open in Maps'}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                                            {order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}
                                        </div>
                                        {order.delivery_address?.lat && order.delivery_address?.lng && (
                                            <a href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, marginTop: '8px', display: 'inline-block', textDecoration: 'none' }}>
                                                {t('openInMaps') || 'Open in Maps'}
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                    <Calendar size={14} style={{ marginRight: 4 }} />
                                    {order.delivery_time ? format(new Date(order.delivery_time), 'd MMMM, yyyy', { locale: lang === 'uz' ? uz : ru }) : '—'}, {order.delivery_slot}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Section */}
                    {showPaymentSection && (
                        <div className={styles.section} style={{
                            background: 'white', border: `1.5px solid ${noDepositWarning ? '#FDE68A' : '#BBF7D0'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={16} />
                                    {lang === 'uz' ? "To'lov holati" : "Статус оплаты"}
                                </h3>
                                <Link
                                    href={`/admin/orders/${id}/payments`}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#BE185D', textDecoration: 'none' }}
                                >
                                    <Receipt size={14} />
                                    {lang === 'uz' ? "To'lov tarixi" : "История оплат"}
                                </Link>
                            </div>

                            {/* No deposit warning */}
                            {noDepositWarning && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 14px', background: '#FEF3C7', borderRadius: '10px',
                                    marginBottom: '16px', border: '1px solid #FDE68A'
                                }}>
                                    <AlertTriangle size={16} color="#92400E" />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                                        {lang === 'uz' ? "Avans qabul qilinmagan" : "Аванс не получен"}
                                    </span>
                                </div>
                            )}

                            {/* Payment breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                                    <span style={{ color: '#6B7280' }}>{lang === 'uz' ? "Buyurtma jami:" : "Итого заказ:"}</span>
                                    <span style={{ fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                                        {totalPrice.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                                    <span style={{ color: '#6B7280' }}>{t('totalPaid')}:</span>
                                    <span style={{ fontWeight: 800, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                                        {depositAmount.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                    </span>
                                </div>
                                <div style={{ height: '1px', background: '#E5E7EB' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                                    <span style={{ fontWeight: 700, color: '#111827' }}>{lang === 'uz' ? "Qoldiq:" : "Остаток:"}</span>
                                    {remaining === 0 ? (
                                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                                            {lang === 'uz' ? "To'liq to'langan" : "Полностью оплачено"}
                                        </span>
                                    ) : (
                                        <span style={{ fontWeight: 900, color: '#BE185D', fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                                            {remaining.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Edit deposit button + inline form */}
                            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                                {!editDepositOpen ? (
                                    <button
                                        onClick={() => {
                                            setEditDepositValue('');
                                            setEditDepositError(null);
                                            setEditDepositOpen(true);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E5E7EB',
                                            background: 'white', color: '#BE185D', fontWeight: 700,
                                            fontSize: '13px', cursor: 'pointer'
                                        }}
                                    >
                                        <CheckCircle2 size={14} />
                                        {t('addPayment')}
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                                            {t('paymentIncrementLabel')}
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={editDepositValue}
                                                onChange={e => {
                                                    setEditDepositValue(e.target.value.replace(/[^\d-]/g, ''));
                                                    setEditDepositError(null);
                                                }}
                                                placeholder="80000"
                                                style={{
                                                    flex: 1, padding: '10px 12px', borderRadius: '8px',
                                                    border: `1.5px solid ${editDepositError ? '#EF4444' : '#E5E7EB'}`,
                                                    fontSize: '16px', fontWeight: 700, outline: 'none',
                                                    fontVariantNumeric: 'tabular-nums'
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleAddPayment}
                                                disabled={editDepositLoading}
                                                style={{
                                                    padding: '10px 18px', borderRadius: '8px', border: 'none',
                                                    background: '#16A34A', color: 'white', fontWeight: 700,
                                                    fontSize: '14px', cursor: 'pointer'
                                                }}
                                            >
                                                {editDepositLoading ? '...' : t('add')}
                                            </button>
                                            <button
                                                onClick={() => { setEditDepositOpen(false); setEditDepositError(null); }}
                                                style={{
                                                    padding: '10px 14px', borderRadius: '8px',
                                                    border: '1.5px solid #E5E7EB', background: 'white',
                                                    color: '#6B7280', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
                                                }}
                                            >
                                                {lang === 'uz' ? "Bekor" : "Отмена"}
                                            </button>
                                        </div>
                                        {editDepositError && (
                                            <p style={{ margin: 0, fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{editDepositError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                        <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={16} /> {t('items')} ({order.order_items?.length || 0})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {order.order_items?.map((item: AdminOrderItem) => (
                                <div key={item.id} className={styles.orderItemCard} style={{ background: '#F9FAFB', border: 'none' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                        <Image
                                            src={item.configuration?.uploaded_photo_url || item.configuration?.drawing || item.products?.image_url || '/placeholder.png'}
                                            alt={item.name}
                                            fill style={{ objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{item.name}</h4>
                                            <div style={{ fontWeight: 800, color: '#BE185D' }}>{((item.unit_price || 0) * item.quantity).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                            {item.quantity} {t('pcs')} × {(item.unit_price || 0).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '13px', background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {item.configuration?.shape && <div><strong>Shakl:</strong> {item.configuration.shape}</div>}
                                            {item.configuration?.size && <div><strong>O&apos;lcham:</strong> {item.configuration.size}</div>}
                                            {item.configuration?.sponge && <div><strong>Biskvit:</strong> {item.configuration.sponge}</div>}
                                            {item.configuration?.flavor && <div><strong>{t('flavor')}:</strong> {item.configuration.flavor}</div>}
                                            {item.configuration?.decorations && <div><strong>Bezaklar:</strong> {item.configuration.decorations}</div>}
                                            {item.configuration?.portion && !item.configuration?.size && <div><strong>{t('portion')}:</strong> {item.configuration.portion}</div>}
                                            {(item.configuration?.custom_note || item.configuration?.order_note) && (
                                                <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#BE185D' }}>&quot;{item.configuration.custom_note || item.configuration.order_note}&quot;</div>
                                            )}
                                        </div>

                                        {/* Agreed price editor — for custom cakes (photo or wizard) */}
                                        {(item.configuration?.mode === 'upload' || item.configuration?.mode === 'wizard') && (
                                            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: (item.unit_price ?? 0) === 0 ? '#FFF7ED' : '#F0FDF4', border: `1px solid ${(item.unit_price ?? 0) === 0 ? '#FED7AA' : '#BBF7D0'}` }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: (item.unit_price ?? 0) === 0 ? '#92400E' : '#065F46', marginBottom: '8px' }}>
                                                    {(item.unit_price ?? 0) === 0
                                                        ? (lang === 'uz' ? '⚠️ Kelishilgan narx belgilanmagan' : '⚠️ Согласованная цена не установлена')
                                                        : (lang === 'uz' ? '✓ Kelishilgan narx' : '✓ Согласованная цена')}
                                                </div>

                                                {editPriceItemId === item.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={editPriceValue}
                                                                onChange={e => { setEditPriceValue(e.target.value.replace(/\D/g, '')); setEditPriceError(null); }}
                                                                placeholder={lang === 'uz' ? "Narxni kiriting (so'm)" : "Введите цену (сум)"}
                                                                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${editPriceError ? '#EF4444' : '#E5E7EB'}`, fontSize: '15px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleEditPrice(item.id)}
                                                                disabled={editPriceLoading}
                                                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#16A34A', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                                            >
                                                                {editPriceLoading ? '...' : (lang === 'uz' ? 'Saqlash' : 'Сохранить')}
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditPriceItemId(null); setEditPriceError(null); }}
                                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: 'white', color: '#6B7280', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                                            >
                                                                {lang === 'uz' ? 'Bekor' : 'Отмена'}
                                                            </button>
                                                        </div>
                                                        {editPriceError && <p style={{ margin: 0, fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{editPriceError}</p>}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEditPriceItemId(item.id); setEditPriceValue(item.unit_price ? String(item.unit_price) : ''); setEditPriceError(null); }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: 'white', color: '#374151', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        <Pencil size={13} />
                                                        {(item.unit_price ?? 0) === 0
                                                            ? (lang === 'uz' ? 'Narxni belgilash' : 'Установить цену')
                                                            : (lang === 'uz' ? 'Narxni o\'zgartirish' : 'Изменить цену')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800 }}>{t('totalPayment')}:</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#BE185D' }}>{totalPrice.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity log & Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                        <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={16} /> {t('activityLog') || 'Activity Log'}
                        </h3>
                        <div className={styles.timeline}>
                            {logs.length === 0 ? (
                                <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '12px 0' }}>{t('noActivityLogs') || 'No activity logs yet.'}</div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className={styles.timelineItem}>
                                        <div className={styles.timelineDot}></div>
                                        <div className={styles.timelineContent}>
                                            <div className={styles.timelineHeader}>
                                                <span className={styles.timelineUser}>{log.changed_by_name}</span>
                                                <span className={styles.timelineTime}>{format(new Date(log.created_at), 'HH:mm')}</span>
                                            </div>
                                            <div className={styles.timelineStatus}>
                                                {log.old_status ? (
                                                    <span>{t(`status_${log.old_status}` as any) || log.old_status} → <strong>{t(`status_${log.new_status}` as any) || log.new_status}</strong></span>
                                                ) : (
                                                    <span>{t('orderPlaced' as any)} (<strong>{t(`status_${log.new_status}` as any) || log.new_status}</strong>)</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                {format(new Date(log.created_at), 'dd MMM yyyy', { locale: lang === 'uz' ? uz : ru })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.section} style={{ background: '#F3F4F6', border: 'none' }}>
                        <h3 style={{ fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '12px' }}>{t('additionalInfo') || 'Audit Info'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>{t('receivedBy') || 'Received By'}</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginTop: '2px' }}>{order.created_by_name || 'System / Telegram'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>{t('orderCreated') || 'Created Time'}</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginTop: '2px' }}>{format(new Date(order.created_at), 'HH:mm:ss, dd.MM.yyyy')}</div>
                            </div>
                            {order.cancellation_reason && (
                                <div>
                                    <div style={{ fontSize: '12px', color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>{t('cancellationReason')}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', marginTop: '2px' }}>{order.cancellation_reason}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel order danger zone */}
            {canCancel && (
                <div style={{ marginTop: '32px', border: '1.5px solid #FCA5A5', borderRadius: '16px', overflow: 'hidden' }}>
                    <button
                        onClick={() => { setCancelOpen(o => !o); setCancelError(null); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 20px', background: cancelOpen ? '#FEF2F2' : 'white',
                            border: 'none', cursor: 'pointer', transition: 'background 0.15s'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', fontWeight: 700, fontSize: '15px' }}>
                            <XCircle size={18} /> {t('cancelOrderSection')}
                        </span>
                        {cancelOpen ? <ChevronUp size={18} color="#DC2626" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </button>

                    {cancelOpen && (
                        <div style={{ padding: '0 20px 20px', background: '#FEF2F2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D', background: '#FEE2E2', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.5 }}>
                                ⚠️ {t('cancelOrderWarning')}
                            </p>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                                    {t('cancelReasonLabel')} *
                                </label>
                                <select
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        border: '1.5px solid #FCA5A5', fontSize: '14px',
                                        background: 'white', color: cancelReason ? '#111827' : '#9CA3AF',
                                        outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="">{t('cancelReasonPlaceholder')}</option>
                                    {CANCEL_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                                    {t('cancelReasonNote')}
                                </label>
                                <textarea
                                    value={cancelNote}
                                    onChange={e => setCancelNote(e.target.value)}
                                    placeholder={t('cancelReasonNotePlaceholder')}
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        border: '1.5px solid #FCA5A5', fontSize: '14px',
                                        background: 'white', resize: 'vertical', outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            {cancelError && (
                                <p style={{ margin: 0, color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>{cancelError}</p>
                            )}
                            <button
                                onClick={handleCancelOrder}
                                disabled={!cancelReason || cancelLoading}
                                style={{
                                    padding: '12px 24px', borderRadius: '10px', border: 'none',
                                    cursor: cancelReason && !cancelLoading ? 'pointer' : 'not-allowed',
                                    background: cancelReason && !cancelLoading ? '#DC2626' : '#FCA5A5',
                                    color: 'white', fontWeight: 700, fontSize: '15px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'background 0.15s'
                                }}
                            >
                                <XCircle size={18} />
                                {cancelLoading ? t('cancellingBtn') : t('cancelConfirmBtn')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
