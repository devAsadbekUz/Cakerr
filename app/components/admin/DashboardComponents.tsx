'use client';

import { useState, memo, useMemo } from 'react';
import {
    Calendar as CalendarIcon, CheckCircle2,
    XCircle, Info, MapPinned, Clock, Truck, PackageCheck, ZoomIn, X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { format, isToday } from 'date-fns';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminOrderCardData, AdminOrderItem } from '@/app/types/admin-order';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

// Colors never change with language — define once at module level
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    new:        { color: '#FB923C',                      bg: '#FFF7ED' },
    confirmed:  { color: '#3B82F6',                      bg: '#EFF6FF' },
    preparing:  { color: '#8B5CF6',                      bg: '#F5F3FF' },
    ready:      { color: '#10B981',                      bg: '#F0FDF4' },
    delivering: { color: 'hsl(var(--color-primary-dark))', bg: 'hsla(var(--color-primary), 0.1)' },
    completed:  { color: '#059669',                      bg: '#ECFDF5' },
    cancelled:  { color: '#EF4444',                      bg: '#FEF2F2' },
};
const STATUS_COLORS_FALLBACK = { color: '#6B7280', bg: '#F3F4F6' };

type StatusActionsProps = {
    orderId: string;
    status: string;
    onUpdate: (id: string, status: string) => void;
    variant: 'card' | 'modal';
};

function StatusActions({ orderId, status, onUpdate, variant }: StatusActionsProps) {
    const { t } = useAdminI18n();
    const isModal = variant === 'modal';
    const pad    = isModal ? '14px' : '12px';
    const radius = isModal ? '12px' : '10px';
    const fSize  = isModal ? '14px' : '13px';
    const fWeight = isModal ? 700 : 600;

    const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
        flex: 1, background: bg, color: 'white', border: 'none',
        padding: pad, borderRadius: radius, fontSize: fSize, fontWeight: fWeight,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        ...extra,
    });

    return (
        <>
            {status === 'new' && (
                <>
                    <button onClick={() => onUpdate(orderId, 'confirmed')} style={btn('#3B82F6', isModal ? {} : { minWidth: '120px' })}>
                        {!isModal && <CheckCircle2 size={16} />} {t('confirmOrder')}
                    </button>
                    {isModal ? (
                        <button onClick={() => onUpdate(orderId, 'cancelled')} style={btn('#FEF2F2', { color: '#EF4444', flex: 0.5 })}>
                            {t('cancel')}
                        </button>
                    ) : (
                        <button onClick={() => onUpdate(orderId, 'cancelled')} style={{ width: '44px', height: '44px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <XCircle size={18} />
                        </button>
                    )}
                </>
            )}
            {status === 'confirmed' && (
                <button onClick={() => onUpdate(orderId, 'preparing')} style={btn('#8B5CF6')}>
                    {!isModal && <Info size={16} />} {t('startCooking')}
                </button>
            )}
            {status === 'preparing' && (
                <button onClick={() => onUpdate(orderId, 'ready')} style={btn('#10B981')}>
                    {!isModal && <PackageCheck size={16} />} {t('finishCooking')}
                </button>
            )}
            {status === 'ready' && (
                <button onClick={() => onUpdate(orderId, 'delivering')} style={btn('hsl(var(--color-primary-dark))')}>
                    {!isModal && <Truck size={16} />} {t('startDelivery')}
                </button>
            )}
            {status === 'delivering' && (
                <button onClick={() => onUpdate(orderId, 'completed')} style={btn('#059669')}>
                    {!isModal && <CheckCircle2 size={16} />} {isModal ? t('finishDelivery') : t('completeOrder')}
                </button>
            )}
        </>
    );
}

// Image Preview Modal Component
function ImagePreviewModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                zIndex: 10000,
                cursor: 'zoom-out'
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001
                }}
            >
                <X size={24} />
            </button>
            <div style={{ position: 'absolute', inset: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image
                    src={imageUrl}
                    alt="Preview"
                    onClick={(e) => e.stopPropagation()}
                    fill
                    style={{
                        objectFit: 'contain',
                        borderRadius: '12px',
                        cursor: 'default'
                    }}
                    unoptimized
                />
            </div>
        </div>
    );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className={styles.sectionTitle}>{children}</h2>;
}

type StatCardProps = {
    title: React.ReactNode;
    value: React.ReactNode;
    icon: LucideIcon;
    color: 'orange' | 'blue' | 'purple' | 'green';
    subtitle?: React.ReactNode;
};

export function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
    const colors: Record<StatCardProps['color'], { bg: string; text: string; icon: string }> = {
        orange: { bg: '#FFF7ED', text: '#9A3412', icon: '#FB923C' },
        blue: { bg: '#EFF6FF', text: '#1E40AF', icon: '#3B82F6' },
        purple: { bg: '#F5F3FF', text: '#5B21B6', icon: '#8B5CF6' },
        green: { bg: '#F0FDF4', text: '#166534', icon: '#22C55E' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ background: c.bg, color: c.icon }}>
                <Icon size={24} />
            </div>
            <div className={styles.statCardInfo}>
                <p className={styles.statCardTitle}>{title}</p>
                <p className={styles.statCardValue}>{value}</p>
                {subtitle && <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{subtitle}</p>}
            </div>
        </div>
    );
}

type SectionProps = {
    title: React.ReactNode;
    count: number;
    children: React.ReactNode;
    emptyMsg?: React.ReactNode;
    highlight?: boolean;
};

export function Section({ title, count, children, emptyMsg, highlight }: SectionProps) {
    const { t } = useAdminI18n();
    if (count === 0 && emptyMsg === t('noNewOrders')) return null;
    return (
        <div className={`${styles.section} ${highlight ? styles.sectionHighlight : ''}`}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} style={{ color: highlight ? 'hsl(var(--color-primary-dark))' : '#111827' }}>{title}</h2>
                <span className={styles.badge} style={{ background: highlight ? 'hsl(var(--color-primary-dark))' : '#6B7280' }}>{count}</span>
            </div>
            <div className={styles.orderGrid}>
                {count === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', border: '2px dashed #E5E7EB', borderRadius: '16px', color: '#9CA3AF' }}>
                        {emptyMsg}
                    </div>
                ) : children}
            </div>
        </div>
    );
}

type OrderCardProps = {
    order: AdminOrderCardData;
    compact?: boolean;
    onUpdate: (id: string, status: string) => void;
    onSelect: (order: AdminOrderCardData) => void;
};

export const OrderCard = memo(function OrderCard({ order, compact, onUpdate, onSelect }: OrderCardProps) {
    const { lang, t } = useAdminI18n();
    const statusLabels = useMemo(() => ({
        new: t('status_new'), confirmed: t('status_confirmed'), preparing: t('status_preparing'),
        ready: t('status_ready'), delivering: t('status_delivering'),
        completed: t('status_completed'), cancelled: t('status_cancelled'),
    }), [t]);

    const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS_FALLBACK;
    const s = { label: statusLabels[order.status as keyof typeof statusLabels] ?? order.status, ...sc };
    const deliveryDate = new Date(order.delivery_time);

    return (
        <div className={styles.orderCard} onClick={() => onSelect(order)}>
            <div className={styles.orderCardHeader}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px' }}>#{order.id.slice(0, 8)}</span>
                        <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                        <CalendarIcon size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {isToday(deliveryDate) ? t('today') : format(deliveryDate, 'd-MMM')}, {order.delivery_slot}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {t('orderTime')}: {format(new Date(order.created_at), 'HH:mm')}
                    </p>
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'hsl(var(--color-primary-dark))' }}>{order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                </div>
            </div>

            {!compact && (
                <>
                    <div className={styles.orderCardCustomer}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{order.profiles?.full_name || t('client')}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'flex-start' }}>
                            <MapPinned size={14} style={{ marginRight: 6, marginTop: 1, minWidth: '14px' }} />
                            <span style={{ lineHeight: '1.4' }}>{order.delivery_address?.street || t('noAddress')}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>{t('items')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {order.order_items?.map((item: AdminOrderItem) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{item.quantity}x {item.name || t('cake')}</span>
                                    <span style={{ color: '#6B7280', fontSize: '12px' }}>{item.configuration?.portion || ''}</span>
                                </div>
                            ))}
                            {(('items_count' in order ? order.items_count : 0) || 0) > (order.order_items?.length || 0) && (
                                <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                                    +{((('items_count' in order ? order.items_count : 0) || 0) - (order.order_items?.length || 0))} {t('items').toLowerCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <StatusActions orderId={order.id} status={order.status} onUpdate={onUpdate} variant="card" />
            </div>
        </div>
    );
});

type OrderDetailsModalProps = {
    order: AdminOrderCardData;
    onClose: () => void;
    onUpdate: (id: string, status: string) => void;
    loading?: boolean;
};

export function OrderDetailsModal({ order, onClose, onUpdate, loading = false }: OrderDetailsModalProps) {
    const { lang, t } = useAdminI18n();
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const statusLabels = useMemo(() => ({
        new: t('status_new'), confirmed: t('status_confirmed'), preparing: t('status_preparing'),
        ready: t('status_ready'), delivering: t('status_delivering'),
        completed: t('status_completed'), cancelled: t('status_cancelled'),
    }), [t]);

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
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{t('orderNumber')} #{order.id.slice(0, 8)}</h2>
                            <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginTop: '8px', display: 'inline-block' }}>{s.label}</span>
                            {loading && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
                                    {t('loading')}
                                </div>
                            )}
                        </div>
                        <button className={styles.modalClose} onClick={onClose}>
                            <XCircle size={20} />
                        </button>
                    </header>

                    <div className={styles.modalContent}>
                        <div className={styles.customerCard}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'hsl(var(--color-primary))', color: 'hsl(var(--color-primary-text))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
                                {order.profiles?.full_name?.[0] || 'U'}
                            </div>
                            <div className={styles.infoSection}>
                                <div className={styles.infoLabel}>{t('clientInfo')}</div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{order.profiles?.full_name || t('client')}</div>
                                <div style={{ fontSize: '14px', color: '#6B7280' }}>{order.profiles?.phone_number || t('noPhone')}</div>
                            </div>
                        </div>

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>{t('delivery')}</div>
                            <div style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <MapPinned size={18} color="hsl(var(--color-primary-dark))" />
                                {order.delivery_address?.lat && order.delivery_address?.lng ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#3B82F6', // Blue link
                                            fontWeight: 600,
                                            textDecoration: 'none'
                                        }}
                                    >
                                        {order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}
                                    </a>
                                ) : (
                                    <span>{order.delivery_address?.street || t('noAddress')}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}</span>
                                )}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                <CalendarIcon size={14} style={{ marginRight: 4 }} />
                                {format(new Date(order.delivery_time), 'd-MMMM, yyyy')}, {order.delivery_slot}
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

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>{t('items')}</div>
                            <div style={{ marginTop: '12px' }}>
                                {order.order_items?.map((item: AdminOrderItem) => (
                                    <div key={item.id} className={styles.orderItemCard}>
                                        <div
                                            style={{ position: 'relative', cursor: 'pointer' }}
                                            onClick={() => {
                                                const imgUrl = item.configuration?.uploaded_photo_url || item.configuration?.drawing || item.products?.image_url;
                                                if (imgUrl) setPreviewImage(imgUrl);
                                            }}
                                        >
                                            <Image
                                                src={item.configuration?.uploaded_photo_url || item.configuration?.drawing || item.products?.image_url || '/placeholder.png'}
                                                alt={item.name}
                                                className={styles.itemImage}
                                                style={{ cursor: 'pointer' }}
                                                width={90}
                                                height={90}
                                            />
                                            {(item.configuration?.uploaded_photo_url || item.configuration?.drawing) && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '4px',
                                                    right: '4px',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <ZoomIn size={14} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <h3 className={styles.itemName}>{item.name || (lang === 'uz' ? 'Tort' : 'Торт')}</h3>
                                            <div className={styles.itemConfig}>
                                                {/* Custom Cake Specific Fields */}
                                                {item.configuration?.mode === 'upload' ? (
                                                    <div style={{ color: 'hsl(var(--color-primary-dark))', fontWeight: 700, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>📸 {t('basedOnPhoto')}</div>
                                                ) : item.configuration?.mode === 'builder' ? (
                                                    <div style={{ color: '#0369A1', fontWeight: 700, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>🎂 {t('viaBuilder')}</div>
                                                ) : null}

                                                {item.configuration?.portion && <div>{t('portionSize')}: {item.configuration.portion}</div>}
                                                {item.configuration?.flavor && <div>{t('flavorCream')}: {item.configuration.flavor}</div>}

                                                {item.configuration?.shape && <div>{t('shape')}: {item.configuration.shape}</div>}
                                                {item.configuration?.sponge && <div>{t('sponge')}: {item.configuration.sponge}</div>}
                                                {item.configuration?.decorations && (
                                                    <div>{t('decorations')}: <span style={{ color: 'hsl(var(--color-primary-dark))', fontWeight: 600 }}>{item.configuration.decorations}</span></div>
                                                )}

                                                {/* Notes and Comments */}
                                                {(item.configuration?.custom_note || item.configuration?.order_note) && (
                                                    <div style={{ marginTop: '4px', padding: '6px', background: 'hsla(var(--color-primary), 0.05)', borderRadius: '6px', borderLeft: '3px solid hsl(var(--color-primary-dark))' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'hsl(var(--color-primary-dark))', textTransform: 'uppercase' }}>
                                                            {item.configuration?.mode === 'upload' ? `${t('customerNote')}:` : `${t('congratulationNote')}:`}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#111827' }}>
                                                            {item.configuration.custom_note || item.configuration.order_note}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.itemPriceQty}>
                                                <div className={styles.itemPrice}>{((item.unit_price || 0) * item.quantity).toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                                                <div className={styles.itemQtyBadge}>{item.quantity} {t('pcs')}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderTop: '2px solid #F3F4F6', marginTop: '16px' }}>
                                <span style={{ fontWeight: 800, fontSize: '20px' }}>{t('totalPayment')}:</span>
                                <span style={{ fontWeight: 800, fontSize: '20px', color: 'hsl(var(--color-primary-dark))' }}>{order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</span>
                            </div>
                        </div>
                    </div>

                    <footer className={styles.modalFooter}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <StatusActions orderId={order.id} status={order.status} onUpdate={onUpdate} variant="modal" />
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
