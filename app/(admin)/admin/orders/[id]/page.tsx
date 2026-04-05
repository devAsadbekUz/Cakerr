'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
    ArrowLeft, MapPinned, Calendar, Clock, User, Phone,
    Package, CheckCircle2, AlertCircle, ShoppingBag,
    ClipboardList, History, ChevronDown, ChevronUp, XCircle
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
        } catch (err) {
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.back()} className={styles.modalClose} style={{ width: '40px', height: '40px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{t('orderNumber')} #{order.id.slice(0, 8)}</h1>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span style={{ 
                                background: sc.bg, color: sc.text, 
                                padding: '2px 10px', borderRadius: '6px', 
                                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' 
                            }}>
                                {t(`status_${order.status}` as any) || order.status}
                            </span>
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

            <div className={styles.orderDetailGrid}>
                {/* Left Column: Order Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Customer & Delivery Card */}
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
                                    <MapPinned size={16} /> {order.delivery_type === 'pickup' ? (t('pickup') || 'Olib ketish') : t('delivery')}
                                </h3>
                                
                                {order.delivery_type === 'pickup' ? (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#BE185D' }}>
                                            {lang === 'uz' ? order.branches?.name_uz : order.branches?.name_ru}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                            {lang === 'uz' ? order.branches?.address_uz : order.branches?.address_ru}
                                        </div>
                                        {order.branches?.location_link && (
                                            <a 
                                                href={order.branches.location_link}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, marginTop: '8px', display: 'inline-block', textDecoration: 'none' }}
                                            >
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
                                            <a 
                                                href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 600, marginTop: '8px', display: 'inline-block', textDecoration: 'none' }}
                                            >
                                                {t('openInMaps') || 'Open in Maps'}
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                    <Calendar size={14} style={{ marginRight: 4 }} /> 
                                    {format(new Date(order.delivery_time), 'd MMMM, yyyy', { locale: lang === 'uz' ? uz : ru })}, {order.delivery_slot}
                                </div>
                            </div>
                        </div>
                    </div>

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
                                        <div style={{ marginTop: '8px', fontSize: '13px', background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                                            {item.configuration?.flavor && <div><strong>{t('flavor')}:</strong> {item.configuration.flavor}</div>}
                                            {item.configuration?.portion && <div><strong>{t('portion')}:</strong> {item.configuration.portion}</div>}
                                            {(item.configuration?.custom_note || item.configuration?.order_note) && (
                                                <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#BE185D' }}>&quot;{item.configuration.custom_note || item.configuration.order_note}&quot;</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800 }}>{t('totalPayment')}:</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#BE185D' }}>{order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Timeline & Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Activity Log */}
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

                    {/* Metadata Card */}
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

            {/* ── Danger zone: Cancel order ── */}
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

                            {/* Reason dropdown */}
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

                            {/* Optional note */}
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
                                    padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: cancelReason && !cancelLoading ? 'pointer' : 'not-allowed',
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
