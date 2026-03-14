'use client';

import { useState } from 'react';
import {
    Calendar as CalendarIcon, CheckCircle2,
    XCircle, Info, MapPinned, Clock, AlertCircle, ShoppingBag, Truck, PackageCheck, ZoomIn, X, MessageSquare
} from 'lucide-react';
import Image from 'next/image';
import { format, isToday } from 'date-fns';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

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

export function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colors: any = {
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

export function Section({ title, count, children, emptyMsg, highlight }: any) {
    if (count === 0 && emptyMsg === "Yangi buyurtmalar yo'q") return null;
    return (
        <div className={`${styles.section} ${highlight ? styles.sectionHighlight : ''}`}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} style={{ color: highlight ? '#BE185D' : '#111827' }}>{title}</h2>
                <span className={styles.badge} style={{ background: highlight ? '#BE185D' : '#6B7280' }}>{count}</span>
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

export function OrderCard({ order, compact, onUpdate, onClick }: any) {
    const statusMeta: any = {
        new: { label: 'Yangi', color: '#FB923C', bg: '#FFF7ED' },
        confirmed: { label: 'Tasdiqlangan', color: '#3B82F6', bg: '#EFF6FF' },
        preparing: { label: 'Pishirilmoqda', color: '#8B5CF6', bg: '#F5F3FF' },
        ready: { label: 'Tayyor', color: '#10B981', bg: '#F0FDF4' },
        delivering: { label: 'Yo\'lda', color: '#BE185D', bg: '#FDF2F8' },
        completed: { label: 'Yetkazildi', color: '#059669', bg: '#ECFDF5' },
        cancelled: { label: 'Bekor qilindi', color: '#EF4444', bg: '#FEF2F2' },
    };

    const s = statusMeta[order.status] || { label: order.status, color: '#6B7280', bg: '#F3F4F6' };
    const deliveryDate = new Date(order.delivery_time);

    return (
        <div className={styles.orderCard} onClick={onClick}>
            <div className={styles.orderCardHeader}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px' }}>#{order.id.slice(0, 8)}</span>
                        <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                        <CalendarIcon size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {isToday(deliveryDate) ? 'Bugun' : format(deliveryDate, 'd-MMM')}, {order.delivery_slot}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        Buyurtma: {format(new Date(order.created_at), 'HH:mm')}
                    </p>
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: '#BE185D' }}>{order.total_price.toLocaleString()} so'm</div>
                </div>
            </div>

            {!compact && (
                <>
                    <div className={styles.orderCardCustomer}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{order.profiles?.full_name || 'Mijoz'}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'flex-start' }}>
                            <MapPinned size={14} style={{ marginRight: 6, marginTop: 1, minWidth: '14px' }} />
                            <span style={{ lineHeight: '1.4' }}>{order.delivery_address?.street || 'Manzil ko\'rsatilmagan'}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>Mahsulotlar</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {order.order_items?.map((item: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{item.quantity}x {item.name || 'Tort'}</span>
                                    <span style={{ color: '#6B7280', fontSize: '12px' }}>{item.configuration?.portion || ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
                {order.status === 'new' && (
                    <>
                        <button onClick={() => onUpdate(order.id, 'confirmed')} style={{ flex: 1, minWidth: '120px', background: '#3B82F6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Tasdiqlash</button>
                        <button onClick={() => onUpdate(order.id, 'cancelled')} style={{ width: '44px', height: '44px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={18} /></button>
                    </>
                )}
                {order.status === 'confirmed' && (
                    <button onClick={() => onUpdate(order.id, 'preparing')} style={{ flex: 1, background: '#8B5CF6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Info size={16} /> Pishirishni boshlash</button>
                )}
                {order.status === 'preparing' && (
                    <button onClick={() => onUpdate(order.id, 'ready')} style={{ flex: 1, background: '#10B981', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><PackageCheck size={16} /> Tayyor bo'ldi</button>
                )}
                {order.status === 'ready' && (
                    <button onClick={() => onUpdate(order.id, 'delivering')} style={{ flex: 1, background: '#BE185D', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Truck size={16} /> Yetkazilmoqda</button>
                )}
                {order.status === 'delivering' && (
                    <button onClick={() => onUpdate(order.id, 'completed')} style={{ flex: 1, background: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Yakunlash</button>
                )}
            </div>
        </div>
    );
}

export function OrderDetailsModal({ order, onClose, onUpdate }: { order: any, onClose: () => void, onUpdate: (id: string, status: string) => void }) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const statusMeta: any = {
        new: { label: 'Yangi', color: '#FB923C', bg: '#FFF7ED' },
        confirmed: { label: 'Tasdiqlangan', color: '#3B82F6', bg: '#EFF6FF' },
        preparing: { label: 'Pishirilmoqda', color: '#8B5CF6', bg: '#F5F3FF' },
        ready: { label: 'Tayyor', color: '#10B981', bg: '#F0FDF4' },
        delivering: { label: 'Yo\'lda', color: '#BE185D', bg: '#FDF2F8' },
        completed: { label: 'Yetkazildi', color: '#059669', bg: '#ECFDF5' },
        cancelled: { label: 'Bekor qilindi', color: '#EF4444', bg: '#FEF2F2' },
    };

    const s = statusMeta[order.status] || { label: order.status, color: '#6B7280', bg: '#F3F4F6' };

    return (
        <>
            {previewImage && (
                <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
            )}
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                    <header className={styles.modalHeader}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Buyurtma #{order.id.slice(0, 8)}</h2>
                            <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginTop: '8px', display: 'inline-block' }}>{s.label}</span>
                        </div>
                        <button className={styles.modalClose} onClick={onClose}>
                            <XCircle size={20} />
                        </button>
                    </header>

                    <div className={styles.modalContent}>
                        <div className={styles.customerCard}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#BE185D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
                                {order.profiles?.full_name?.[0] || 'U'}
                            </div>
                            <div className={styles.infoSection}>
                                <div className={styles.infoLabel}>Mijoz ma'lumotlari</div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{order.profiles?.full_name || 'Mijoz'}</div>
                                <div style={{ fontSize: '14px', color: '#6B7280' }}>{order.profiles?.phone_number || 'Telefon kiritilmagan'}</div>
                            </div>
                        </div>

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>Yetkazib berish</div>
                            <div style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <MapPinned size={18} color="#BE185D" />
                                <span>{order.delivery_address?.street || 'Manzil kiritilmagan'}{order.delivery_address?.apartment ? `, ${order.delivery_address.apartment}` : ''}</span>
                                {order.delivery_address?.lat && order.delivery_address?.lng && (
                                    <a
                                        href={`https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#0EA5E9',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            textDecoration: 'underline',
                                            marginLeft: '4px'
                                        }}
                                    >
                                        joylashuvni ko'rish
                                    </a>
                                )}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                <CalendarIcon size={14} style={{ marginRight: 4 }} />
                                {format(new Date(order.delivery_time), 'd-MMMM, yyyy')}, {order.delivery_slot}
                            </div>
                        </div>

                        {order.comment && (
                            <div className={styles.infoSection} style={{ background: '#F0F9FF', padding: '12px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                                <div className={styles.infoLabel} style={{ color: '#0369A1' }}>Qo'shimcha izoh</div>
                                <div style={{ fontSize: '14px', color: '#0C4A6E', fontStyle: 'italic' }}>
                                    "{order.comment}"
                                </div>
                            </div>
                        )}

                        <div className={styles.infoSection}>
                            <div className={styles.infoLabel}>Mahsulotlar</div>
                            <div style={{ marginTop: '12px' }}>
                                {order.order_items?.map((item: any, idx: number) => (
                                    <div key={idx} className={styles.orderItemCard}>
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
                                            <h3 className={styles.itemName}>{item.name || 'Tort'}</h3>
                                            <div className={styles.itemConfig}>
                                                {/* Custom Cake Specific Fields */}
                                                {item.configuration?.mode === 'upload' ? (
                                                    <div style={{ color: '#BE185D', fontWeight: 700, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>📸 Mijoz rasmi asosida</div>
                                                ) : item.configuration?.mode === 'builder' ? (
                                                    <div style={{ color: '#0369A1', fontWeight: 700, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>🎂 Konstruktor orqali</div>
                                                ) : null}

                                                {item.configuration?.portion && <div>Hajm/Portsiya: {item.configuration.portion}</div>}
                                                {item.configuration?.flavor && <div>Lazzat/Krem: {item.configuration.flavor}</div>}

                                                {item.configuration?.shape && <div>Shakl: {item.configuration.shape}</div>}
                                                {item.configuration?.sponge && <div>Biskvit: {item.configuration.sponge}</div>}
                                                {item.configuration?.decorations && (
                                                    <div>Bezaklar: <span style={{ color: '#BE185D', fontWeight: 600 }}>{item.configuration.decorations}</span></div>
                                                )}

                                                {/* Notes and Comments */}
                                                {(item.configuration?.custom_note || item.configuration?.order_note) && (
                                                    <div style={{ marginTop: '4px', padding: '6px', background: '#FFF5F7', borderRadius: '6px', borderLeft: '3px solid #BE185D' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#BE185D', textTransform: 'uppercase' }}>
                                                            {item.configuration?.mode === 'upload' ? 'Mijoz izohi:' : 'Tabrik yozuvi:'}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#111827' }}>
                                                            {item.configuration.custom_note || item.configuration.order_note}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.itemPriceQty}>
                                                <div className={styles.itemPrice}>{(item.unit_price * item.quantity).toLocaleString()} so'm</div>
                                                <div className={styles.itemQtyBadge}>{item.quantity} dona</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderTop: '2px solid #F3F4F6', marginTop: '16px' }}>
                                <span style={{ fontWeight: 800, fontSize: '20px' }}>Jami to'lov:</span>
                                <span style={{ fontWeight: 800, fontSize: '20px', color: '#BE185D' }}>{order.total_price.toLocaleString()} so'm</span>
                            </div>
                        </div>
                    </div>

                    <footer className={styles.modalFooter}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {order.status === 'new' && (
                                <>
                                    <button onClick={() => onUpdate(order.id, 'confirmed')} style={{ flex: 2, background: '#3B82F6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Tasdiqlash</button>
                                    <button onClick={() => onUpdate(order.id, 'cancelled')} style={{ flex: 1, background: '#FEF2F2', color: '#EF4444', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Bekor qilish</button>
                                </>
                            )}
                            {order.status === 'confirmed' && (
                                <button onClick={() => onUpdate(order.id, 'preparing')} style={{ flex: 1, background: '#8B5CF6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Pishirishni boshlash</button>
                            )}
                            {order.status === 'preparing' && (
                                <button onClick={() => onUpdate(order.id, 'ready')} style={{ flex: 1, background: '#10B981', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Tayyor bo'ldi</button>
                            )}
                            {order.status === 'ready' && (
                                <button onClick={() => onUpdate(order.id, 'delivering')} style={{ flex: 1, background: '#BE185D', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Yetkazishni boshlash</button>
                            )}
                            {order.status === 'delivering' && (
                                <button onClick={() => onUpdate(order.id, 'completed')} style={{ flex: 1, background: '#059669', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Yetkazildi</button>
                            )}
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
