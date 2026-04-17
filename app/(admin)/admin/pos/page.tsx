'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    ShoppingCart, 
    User, 
    MapPin, 
    Calendar, 
    Clock, 
    Plus, 
    Minus, 
    Trash2, 
    Cake, 
    Image as ImageIcon,
    X,
    CheckCircle2,
    AlertCircle,
    Phone
} from 'lucide-react';
import { useAdminCart } from '@/app/context/AdminCartContext';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { adminFetch } from '@/app/utils/adminApi';
import { availabilityService, GlobalTimeSlot } from '@/app/services/availabilityService';
import { format } from 'date-fns';
import { createClient } from '@/app/utils/supabase/client';
import { Product, Category } from '@/app/types';
import { getLocalized } from '@/app/utils/i18n';
import WizardShell from '@/app/components/yaratish/WizardShell';
import { LanguageProvider } from '@/app/context/LanguageContext';
// PhotoUploadForm removed
import { POSProductDetailModal } from '@/app/components/admin/pos/POSProductDetailModal';
import styles from './page.module.css';
import Image from 'next/image';

const DELIVERY_FEE = 40000;

export default function PosPage() {
    // ── Contexts ──────────────────────────────────────────────────────────────
    const { 
        cart, 
        addItem, 
        removeItem, 
        updateQuantity, 
        customerInfo, 
        setCustomerInfo,
        deliveryInfo,
        setDeliveryInfo,
        subtotal,
        totalItems,
        clearCart
    } = useAdminCart();
    
    const { reset: resetBuilder, setMode: setBuilderMode } = useCustomCake();
    const { lang, t } = useAdminI18n();
    const supabase = createClient();

    // ── Local State ───────────────────────────────────────────────────────────
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [slots, setSlots] = useState<GlobalTimeSlot[]>([]);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [orderNote, setOrderNote] = useState('');

    // Delivery vs Pickup
    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    // Modals
    const [showBuilder, setShowBuilder] = useState<'wizard' | 'upload' | null>(null);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    // Mobile: toggle cart panel
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Sidebar view toggle (Step 1: Order, Step 2: Checkout)
    const [sidebarTab, setSidebarTab] = useState<'cart' | 'checkout'>('cart');

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const today = new Date();
                const rangeEnd = new Date();
                rangeEnd.setDate(today.getDate() + 45);
                const startDate = format(today, 'yyyy-MM-dd');
                const endDate = format(rangeEnd, 'yyyy-MM-dd');

                const [pData, cData, sData, ovData] = await Promise.all([
                    adminFetch<Product>({ table: 'products', filterColumn: 'is_available', filterValue: 'true', filterNull: 'deleted_at' }),
                    adminFetch<Category>({ table: 'categories', orderBy: 'sort_order', orderAsc: true }),
                    availabilityService.getGlobalSlots(),
                    availabilityService.getOverrides(startDate, endDate)
                ]);
                setProducts(pData);
                setCategories(cData);
                setSlots(sData);
                setOverrides(ovData || []);
            } catch (err) {
                console.error('POS Load error:', err);
            } finally {
                setLoading(false);
            }
        };
        const fetchBranches = async () => {
            const { data } = await supabase
                .from('branches')
                .select('*')
                .eq('is_active', true)
                .order('name_uz', { ascending: true });
            if (data) {
                setBranches(data);
                if (data.length > 0) setSelectedBranchId(data[0].id);
            }
        };

        loadData();
        fetchBranches();
    }, []);

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Filter out system products with 0 price (placeholders)
            if (Number(p.base_price) === 0) return false;

            const localizedTitle = getLocalized(p.title, lang);
            const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
            const matchesSearch = localizedTitle.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, activeCategory, searchQuery, lang]);

    // ── Availability Helpers ──────────────────────────────────────────────────
    const isDateFullyBlocked = (dateStr: string) =>
        overrides.some(o => o.date === dateStr && o.slot === null);

    const isSlotBlocked = (slotLabel: string) => {
        if (!deliveryInfo.date) return false;
        const dateStr = deliveryInfo.date.toISOString().split('T')[0];
        
        // 1. Check DB overrides
        const hasOverride = overrides.some(o => o.date === dateStr && (o.slot === null || o.slot === slotLabel));
        if (hasOverride) return true;

        // 2. Check if the slot has already passed today
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) {
            const match = slotLabel.match(/^(\d{2}):/);
            if (match) {
                const slotStartHour = parseInt(match[1], 10);
                const currentHour = new Date().getHours();
                // Block if the current hour is at or past the slot's start hour
                if (currentHour >= slotStartHour) {
                    return true;
                }
            }
        }

        return false;
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAddStandard = (product: Product) => {
        addItem({
            id: product.id,
            name: getLocalized(product.title, lang),
            price: Number(product.base_price),
            image: product.image_url,
            portion: 'Standart',
            flavor: '',
            quantity: 1
        });
    };

    const handleBuilderComplete = (item: any) => {
        addItem(item);
        setShowBuilder(null);
        resetBuilder();
    };

    const handleSubmit = async () => {
        // Validation
        if (!customerInfo.name) {
            setError(t('titleError'));
            setSidebarTab('checkout');
            return;
        }

        const phoneRegex = /^\+998\d{9}$/;
        if (!phoneRegex.test(customerInfo.phone)) {
            setError(t('invalidPhone'));
            setSidebarTab('checkout');
            return;
        }

        if (deliveryType === 'delivery' && (!deliveryInfo.address || deliveryInfo.address.trim().length < 5)) {
            setError(lang === 'uz' ? "Manzil to'liq emas" : "Адрес неполный");
            setSidebarTab('checkout');
            return;
        }

        if (deliveryType === 'pickup' && !selectedBranchId) {
            setError(t('selectBranch'));
            setSidebarTab('checkout');
            return;
        }

        if (!deliveryInfo.date || !deliveryInfo.slot) {
            setError(t('error'));
            setSidebarTab('checkout');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/pos/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    customerInfo,
                    deliveryInfo: {
                        date: deliveryInfo.date?.toISOString(),
                        delivery_type: deliveryType,
                        branch_id: deliveryType === 'pickup' ? selectedBranchId : null,
                        address: deliveryInfo.address,
                        slot: deliveryInfo.slot
                    },
                    totalPrice: subtotal + (deliveryType === 'delivery' && cart.length > 0 ? DELIVERY_FEE : 0),
                    orderNote: orderNote.trim() || null
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Xatolik yuz berdi');

            setOrderSuccess(result.orderId);
            setOrderNote('');
            clearCart();
            setDeliveryType('delivery');
            setSelectedBranchId(branches.length > 0 ? branches[0].id : null);
            setSidebarTab('cart'); // Reset to cart after success
            setTimeout(() => setOrderSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render Helpers ─────────────────────────────────────────────────────────
    if (loading) {
        return <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>{t('loading')}</div>;
    }

    return (
        <div className={styles.container}>
            {/* Mobile cart FAB */}
            {totalItems > 0 && (
                <button
                    className={styles.cartFab}
                    onClick={() => setShowMobileCart(true)}
                >
                    <ShoppingCart size={22} />
                    <span className={styles.cartFabBadge}>{totalItems}</span>
                    <span className={styles.cartFabTotal}>{(subtotal + (deliveryType === 'delivery' && totalItems > 0 ? DELIVERY_FEE : 0)).toLocaleString()} {t('som')}</span>
                </button>
            )}

            {/* Mobile cart backdrop */}
            {showMobileCart && (
                <div className={styles.mobileBackdrop} onClick={() => setShowMobileCart(false)} />
            )}

            {/* 1. Main POS Section */}
            <section className={styles.productSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles.categoryNav}>
                        <button 
                            className={`${styles.categoryBtn} ${activeCategory === 'all' ? styles.active : ''}`}
                            onClick={() => setActiveCategory('all')}
                        >
                            {t('all')}
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.active : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                {getLocalized(cat.label, lang)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.searchContainer}>
                    <Search className={styles.searchIcon} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')} 
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.grid}>
                    {/* Special Interaction Cards */}
                    <div className={styles.productCard} onClick={() => { resetBuilder(); setBuilderMode('wizard'); setShowBuilder('wizard'); }}>
                        <div className={styles.specialCard} style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
                            <div className={styles.specialIcon}>
                                <Cake size={32} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16 }}>{t('viaBuilder')}</div>
                                <div style={{ fontSize: 12, opacity: 0.9 }}>{lang === 'uz' ? 'Bosqichma-bosqich' : 'Пошагово'}</div>
                            </div>
                        </div>
                    </div>

                    {/* 'Based on Photo' card removed */}

                    {/* Standard Products */}
                    {filteredProducts.map(product => (
                        <div key={product.id} className={styles.productCard}>
                            <div className={styles.imageWrapper} onClick={() => handleAddStandard(product)} style={{ cursor: 'pointer' }}>
                                <Image
                                    src={product.image_url || '/images/placeholder.jpg'}
                                    alt={getLocalized(product.title, lang)}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/f8fafc/94a3b8?text=no+image'; }}
                                />
                            </div>
                            <div className={styles.productInfo} onClick={() => setDetailProduct(product)} style={{ cursor: 'pointer' }}>
                                <div className={styles.productTitle}>{getLocalized(product.title, lang)}</div>
                                <div className={styles.productPrice}>{Number(product.base_price).toLocaleString()} {t('som')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. Order Sidebar */}
            <aside className={`${styles.sidebar} ${showMobileCart ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarTitle}>{t('posCurrentOrder')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{totalItems} {t('pcs')}</div>
                        <button className={styles.sidebarCloseBtn} onClick={() => setShowMobileCart(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Desktop Step Switcher */}
                    <div className={styles.stepTabs}>
                        <button 
                            className={`${styles.stepTab} ${sidebarTab === 'cart' ? styles.activeTab : ''}`}
                            onClick={() => setSidebarTab('cart')}
                        >
                            <ShoppingCart size={14} />
                            {lang === 'uz' ? 'Buyurtma' : 'Заказ'}
                        </button>
                        <button 
                            className={`${styles.stepTab} ${sidebarTab === 'checkout' ? styles.activeTab : ''}`}
                            onClick={() => {
                                if (cart.length === 0) {
                                    alert(lang === 'uz' ? 'Savat bo\'sh' : 'Корзина пуста');
                                    return;
                                }
                                setSidebarTab('checkout');
                            }}
                        >
                            <User size={14} />
                            {lang === 'uz' ? "Ma'lumotlar" : 'Оформление'}
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    {sidebarTab === 'cart' ? (
                        <div className={styles.cartList}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    <p style={{ fontWeight: 500 }}>{t('emptyCart')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.cartItemsScroll}>
                                        {cart.map(item => (
                                            <div key={item.cartId} className={styles.cartItem}>
                                                <div className={styles.itemInfo}>
                                                    <div className={styles.itemTitle}>{item.name}</div>
                                                    <div className={styles.itemMeta}>
                                                        {item.portion} {item.flavor ? `• ${item.flavor}` : ''}
                                                    </div>
                                                    {item.configuration && (
                                                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                            {item.configuration.type_uz && `${item.configuration.type_uz}`}
                                                            {item.configuration.nachinka_uz && ` • ${item.configuration.nachinka_uz}`}
                                                            {item.configuration.size_uz && ` • ${item.configuration.size_uz}`}
                                                        </div>
                                                    )}
                                                    <div className={styles.itemPrice}>
                                                         {!item.price ? (
                                                             <span style={{ color: '#BE185D', fontStyle: 'italic' }}>{t('negotiable')}</span>
                                                         ) : (
                                                             <>{(Number(item.price) * item.quantity).toLocaleString()} {t('som')}</>
                                                         )}
                                                     </div>
                                                </div>
                                                <div className={styles.itemQuantity}>
                                                    <button 
                                                        className={styles.qtyBtn} 
                                                        onClick={() => {
                                                            if (item.quantity === 1) {
                                                                removeItem(item.cartId);
                                                            } else {
                                                                updateQuantity(item.cartId, item.quantity - 1);
                                                            }
                                                        }}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                                    <button className={styles.qtyBtn} onClick={() => updateQuantity(item.cartId, item.quantity + 1)}><Plus size={14} /></button>
                                                    <button 
                                                        onClick={() => removeItem(item.cartId)}
                                                        style={{ marginLeft: 8, color: '#f87171', display: 'flex', padding: 4 }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className={styles.cartSummaryMini}>
                                        <div className={styles.totalRowMini}>
                                            <span>{t('total')}:</span>
                                            <span>
                                                 {cart.some(item => !item.price) ? (
                                                     <span style={{ color: '#BE185D', fontStyle: 'italic', fontSize: '14px' }}>{t('negotiable')}</span>
                                                 ) : (
                                                     <>{subtotal.toLocaleString()} {t('som')}</>
                                                 )}
                                             </span>
                                        </div>
                                        <button 
                                            className={styles.nextBtn}
                                            onClick={() => setSidebarTab('checkout')}
                                            disabled={cart.length === 0}
                                        >
                                            {lang === 'uz' ? "Keyingi (Ma'lumotlar)" : 'Далее (Оформление)'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.sidebarForms}>
                            {/* BUG-06: Cart Summary Block */}
                            <div style={{ background: 'white', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{lang === 'uz' ? 'Savat tarkibi' : 'Состав корзины'} ({totalItems})</span>
                                    <span style={{ color: '#BE185D' }}>{subtotal.toLocaleString()}</span>
                                </div>
                                <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {cart.map(item => (
                                        <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569' }}>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
                                                {item.quantity}x {item.name}
                                            </span>
                                            <span style={{ fontWeight: 600, flexShrink: 0 }}>
                                                {item.price ? (Number(item.price) * item.quantity).toLocaleString() : t('negotiable')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Delivery/Pickup Toggle */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                                <button 
                                    onClick={() => setDeliveryType('delivery')}
                                    style={{ 
                                        padding: '8px', borderRadius: '8px', border: 'none', 
                                        background: deliveryType === 'delivery' ? 'white' : 'transparent',
                                        color: deliveryType === 'delivery' ? '#BE185D' : '#64748b',
                                        fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                        boxShadow: deliveryType === 'delivery' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    {t('delivery')}
                                </button>
                                <button 
                                    onClick={() => setDeliveryType('pickup')}
                                    style={{ 
                                        padding: '8px', borderRadius: '8px', border: 'none', 
                                        background: deliveryType === 'pickup' ? 'white' : 'transparent',
                                        color: deliveryType === 'pickup' ? '#BE185D' : '#64748b',
                                        fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                        boxShadow: deliveryType === 'pickup' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    {t('pickup')}
                                </button>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formControl}>
                                    <label className={styles.label}><User size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('customerName')}</label>
                                    <input 
                                        type="text" 
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo({ name: e.target.value })}
                                        className={styles.input} 
                                        placeholder={t('customerName')}
                                    />
                                </div>
                                <div className={styles.formControl}>
                                    <label className={styles.label}><Phone size={12} style={{ display: 'inline', marginRight: 4 }} /> Telefon</label>
                                    <input 
                                        type="tel" 
                                        value={customerInfo.phone}
                                        onChange={(e) => {
                                            let digits = e.target.value.replace(/\D/g, '');
                                            // Auto-strip duplicate 998 if typed by user
                                            if (digits.startsWith('998')) digits = digits.slice(3);
                                            digits = digits.slice(0, 9);
                                            setCustomerInfo({ phone: '+998' + digits });
                                        }}
                                        className={styles.input} 
                                        placeholder="+998"
                                    />
                                </div>
                            </div>

                            {deliveryType === 'delivery' ? (
                                <div className={styles.formControl}>
                                    <label className={styles.label}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('address')}</label>
                                    <textarea 
                                        value={deliveryInfo.address}
                                        onChange={(e) => setDeliveryInfo({ address: e.target.value })}
                                        className={styles.textarea} 
                                        rows={2}
                                        placeholder={t('enterAddress')}
                                    />
                                </div>
                            ) : (
                                <div className={styles.formControl}>
                                    <label className={styles.label}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('selectBranch')}</label>
                                    <select 
                                        className={styles.input}
                                        value={selectedBranchId || ''}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                    >
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {lang === 'uz' ? b.name_uz : b.name_ru}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.formRow}>
                                <div className={styles.formControl}>
                                    <label className={styles.label}><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> Sana</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={deliveryInfo.date ? format(deliveryInfo.date, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => {
                                            const dateVal = e.target.value;
                                            if (!dateVal) {
                                                setDeliveryInfo({ date: null });
                                                return;
                                            }
                                            if (isDateFullyBlocked(dateVal)) {
                                                setError(lang === 'uz' ? 'Bu sana yopiq' : 'Эта дата закрыта');
                                                setDeliveryInfo({ date: null });
                                                return;
                                            }
                                            // BUG-07: Use local parsing to avoid date shifting
                                            const parts = dateVal.split('-');
                                            const newDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            const slotNowBlocked = deliveryInfo.slot &&
                                                overrides.some(o => o.date === dateVal && (o.slot === null || o.slot === deliveryInfo.slot));
                                            setDeliveryInfo({ date: newDate, ...(slotNowBlocked ? { slot: '' } : {}) });
                                            setError(null);
                                        }}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className={styles.formControl}>
                                    <label className={styles.label}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Vaqt</label>
                                    <select 
                                        className={styles.input}
                                        value={deliveryInfo.slot || ''}
                                        onChange={(e) => setDeliveryInfo({ slot: e.target.value })}
                                    >
                                        <option value="">{t('selectTime')}</option>
                                        {slots.map(s => {
                                            const blocked = isSlotBlocked(s.label);
                                            return (
                                                <option key={s.id} value={s.label} disabled={blocked}>
                                                    {s.label}{blocked ? ` — ${t('closed')}` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formControl}>
                                <label className={styles.label}>📝 {t('orderComment')}</label>
                                <textarea
                                    value={orderNote}
                                    onChange={(e) => setOrderNote(e.target.value)}
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder={t('orderNotePlaceholder')}
                                />
                            </div>

                            <div className={styles.totalSection}>
                                <div className={styles.totalRow}>
                                    <span className={styles.totalLabel}>{t('total')}</span>
                                    <span className={styles.totalAmount}>{(subtotal + (deliveryType === 'delivery' && cart.length > 0 ? DELIVERY_FEE : 0)).toLocaleString()} {t('som')}</span>
                                </div>
                                {deliveryType === 'delivery' && cart.length > 0 && (
                                    <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>
                                        (Inc. {DELIVERY_FEE.toLocaleString()} {t('deliveryFee')})
                                    </div>
                                )}
                            </div>

                            {orderSuccess && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle2 size={18} /> {t('orderConfirmedNum').replace('{id}', (orderSuccess as string).substring(0, 8))}
                                </div>
                            )}

                            {error && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button 
                                    className={styles.backBtn}
                                    onClick={() => setSidebarTab('cart')}
                                >
                                    {lang === 'uz' ? 'Orqaga' : 'Назад'}
                                </button>
                                <button 
                                    className={styles.checkoutBtn}
                                    onClick={handleSubmit}
                                    disabled={submitting || cart.length === 0}
                                    style={{ marginTop: 0 }}
                                >
                                    {submitting ? t('saving') : t('confirmOrder')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* 3. Modals */}
            {detailProduct && (
                <POSProductDetailModal
                    product={detailProduct}
                    onClose={() => setDetailProduct(null)}
                />
            )}

            {showBuilder && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <button className={styles.closeModal} onClick={() => { setShowBuilder(null); resetBuilder(); }}>
                            <X size={20} />
                        </button>
                        {showBuilder === 'wizard' && (
                            <LanguageProvider forcedLang={lang as any}>
                                <WizardShell onItemComplete={handleBuilderComplete} onClose={() => { setShowBuilder(null); resetBuilder(); }} />
                            </LanguageProvider>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
