'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useCartActions } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Calendar, Banknote, CreditCard, Tag, CheckCircle2, ShoppingBag, MapPin } from 'lucide-react';
import CalendarModal from '@/app/components/checkout/CalendarModal';
import AddressesModal from '@/app/components/checkout/AddressesModal';
import SuccessModal from '@/app/components/checkout/SuccessModal';
import { useAuth } from '@/app/context/AuthContext';
import { getAuthHeader, getStoredSession } from '@/app/utils/telegram';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';
import { createClient } from '@/app/utils/supabase/client';
import { availabilityService } from '@/app/services/availabilityService';
import { addressService } from '@/app/services/addressService';
import { format } from 'date-fns';

const LAST_ORDER_STORAGE_KEY = 'tortele_last_order';

interface SuccessOrderSnapshot {
    id: string;
    total_price: number;
    payment_method: 'cash' | 'card';
    comment: string;
    delivery_time: string;
    delivery_slot: string;
    delivery_type: 'delivery' | 'pickup';
    branch_id: string | null;
    delivery_address: {
        street: string;
        lat: number | null;
        lng: number | null;
    };
    branch_snapshot?: {
        name_uz: string;
        name_ru: string;
        address_uz: string;
        address_ru: string;
    } | null;
    saved_at: number;
}


export default function CheckoutPage() {
    const router = useRouter();
    const { lang, t } = useLanguage();
    const {
        cart,
        subtotal,
        totalItems,
        deliveryAddress,
        deliveryCoords,
        savedAddresses,
        addSavedAddress
    } = useCart();
    const { clearCart } = useCartActions();
    const { user, isTelegram, loginWithTelegram } = useAuth();
    const supabase = createClient();

    const [isAddressesOpen, setIsAddressesOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    // Delivery vs Pickup
    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    // Shirin Tangalar State
    const [useCoins, setUseCoins] = useState(false);
    const [coinsToSpend, setCoinsToSpend] = useState<number | string>(0);
    const [coinInputError, setCoinInputError] = useState(false);

    // DB-driven time slots (with hardcoded fallback)
    const FALLBACK_SLOTS = [
        '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00',
        '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'
    ];
    const [timeSlots, setTimeSlots] = useState<string[]>(FALLBACK_SLOTS);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    // Promo Code Logic
    const [promoInput, setPromoInput] = useState('');
    const [activePromoId, setActivePromoId] = useState<string | null>(null);
    const [activePromoCode, setActivePromoCode] = useState<string | null>(null);
    const [promoDiscount, setPromoDiscount] = useState<number>(0);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
    const [promoModalOpen, setPromoModalOpen] = useState(false);
    const [loyaltyRate, setLoyaltyRate] = useState(0.05);

    const handleApplyPromo = async () => {
        if (!promoInput.trim()) return;
        setIsVerifyingPromo(true);
        setPromoError(null);
        try {
            const authHeaders = getAuthHeader();
            const res = await fetch('/api/promo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ code: promoInput, subtotal })
            });
            const data = await res.json();
            if (!res.ok) {
                setPromoError(t(data.error) || data.error);
                setActivePromoId(null);
                setActivePromoCode(null);
                setPromoDiscount(0);
            } else {
                setActivePromoId(data.id);
                setActivePromoCode(data.code);
                setPromoDiscount(data.discount_amount);
                setPromoError(null);
                setPromoInput('');
                setPromoModalOpen(false);
            }
        } catch (err: any) {
            setPromoError(err.message || t('networkError'));
        } finally {
            setIsVerifyingPromo(false);
        }
    };

    const deliveryFee = (totalItems > 0 && deliveryType === 'delivery') ? 40000 : 0;
    const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
    const initialTotal = discountedSubtotal + deliveryFee;
    const total = Math.max(0, initialTotal - (useCoins ? (Number(coinsToSpend) || 0) : 0));

    const fetchAvailability = async () => {
        setLoadingAvailability(true);
        try {
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 45); // Support booking up to 45 days in advance

            const startDate = format(today, 'yyyy-MM-dd');
            const endDate = format(nextMonth, 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from('availability_overrides')
                .select('date, slot')
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;
            setOverrides(data || []);
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoadingAvailability(false);
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

    useEffect(() => {
        // Parallel fetches
        Promise.all([
            fetchAvailability(),
            fetchBranches(),
            availabilityService.getGlobalSlots().catch(() => []),
            fetch('/api/loyalty/rate').then(r => r.json()).catch(() => ({ rate: 0.05 }))
        ]).then(([,, slots, loyaltyData]) => {
            if (Array.isArray(slots) && slots.length > 0) {
                setTimeSlots(slots.map((s: any) => s.label));
            }
            if (loyaltyData?.rate) setLoyaltyRate(loyaltyData.rate);
        });
    }, []);

    const isSlotBlocked = (slot: string) => {
        if (!selectedDateObj) return false;
        const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
        const dayOverrides = overrides.filter(o => o.date === dateStr);
        return dayOverrides.some(o => o.slot === null || o.slot === slot);
    };

    // Also check stored session — defensive fallback for the rare case where the context
    // is momentarily stale right after loginWithTelegram() writes the phone to the session.
    const hasPhone = !!(user?.phone_number || user?.phone || getStoredSession()?.user?.phone_number);

    const handleConfirmOrder = async () => {
        if (!user) {
            router.push('/profil/login?redirectTo=/savat/checkout');
            return;
        }

        if (!hasPhone) {
            if (isTelegram) {
                // User is inside the mini app — request contact inline without leaving
                try {
                    await loginWithTelegram();
                    // After sharing, user context is updated — re-check hasPhone
                    // handleConfirmOrder will be retriggered by the user clicking the button again
                } catch {
                    // User dismissed the contact popup — do nothing
                }
            } else {
                alert(
                    t('phoneNotLinked') + '\n\n' + t('linkPhonePrompt') + '@' + TELEGRAM_CONFIG.botUsername
                );
            }
            return;
        }

        if (!selectedSlot) {
            alert(t('selectTimeError'));
            return;
        }

        if (deliveryType === 'delivery' && (!deliveryCoords?.lat || !deliveryCoords?.lng)) {
            alert(t('addressNoLocation'));
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                total_price: total,
                promo_discount: promoDiscount,
                delivery_address: {
                    street: deliveryAddress,
                    lat: deliveryCoords?.lat || null,
                    lng: deliveryCoords?.lng || null,
                },
                delivery_time: selectedDateObj ? selectedDateObj.toISOString() : new Date().toISOString(),
                delivery_slot: selectedSlot,
                comment: comment,
                coins_spent: useCoins ? (Number(coinsToSpend) || 0) : 0,
                payment_method: paymentMethod,
                delivery_type: deliveryType,
                branch_id: deliveryType === 'pickup' ? selectedBranchId : null
            };

            const orderItems = cart.map(item => {
                const CUSTOM_CAKE_UUID = '00000000-0000-0000-0000-000000000000';
                const isCustom = item.id === CUSTOM_CAKE_UUID || item.configuration?.pricing_type === 'hybrid';

                return {
                    product_id: isCustom ? null : item.id,
                    name: getLocalized(item.name, lang),
                    quantity: item.quantity,
                    unit_price: item.price,
                    configuration: isCustom ? item.configuration : {
                        portion: item.portion,
                        flavor: item.flavor,
                        custom_note: item.customNote,
                        image_url: item.image // Store product image for profile display
                    }
                };
            });

            // Use API for ALL users (bypasses RLS, handles both Telegram and browser auth)
            const authHeaders = getAuthHeader();

            const response = await fetch('/api/user/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                credentials: 'include',
                body: JSON.stringify({
                    order: orderData,
                    items: orderItems,
                    coins_spent: orderData.coins_spent,
                    promo_code_id: activePromoId
                })
            });

            if (!response.ok) {
                const rawError = await response.text();
                console.error('[Checkout] API Fail:', response.status, rawError);
                const errPrefix = lang === 'ru' ? 'Ошибка' : 'Xatolik';
                throw new Error(`${errPrefix}: ${rawError || t('orderCreationError')}`);
            }

            const result = await response.json();
            const createdOrder = result.order as { id?: string; order_id?: string };
            const orderId = createdOrder.id || createdOrder.order_id;

            if (!orderId) {
                throw new Error('Order was created but ID is missing from response');
            }

            // Auto-save this address if it's a new delivery location
            if (deliveryType === 'delivery' && deliveryCoords) {
                const isNew = !savedAddresses.some(a => 
                    a.lat && a.lng && 
                    Math.abs(a.lat - deliveryCoords.lat) < 0.0001 && 
                    Math.abs(a.lng - deliveryCoords.lng) < 0.0001
                );
                
                if (isNew) {
                    addSavedAddress({
                        address: deliveryAddress,
                        label: t('address'), // Generic label for auto-saved addresses
                        type: 'other',
                        lat: deliveryCoords.lat,
                        lng: deliveryCoords.lng
                    }).catch((e: any) => console.error('[AutoSave Address] Failed:', e));
                }
            }

            // 3. Send Telegram notification — fire-and-forget, never block the success screen
            const monthNames = t('months') as unknown as string[];
            const deliveryDateFormatted = selectedDateObj
                ? `${selectedDateObj.getDate()}-${monthNames[selectedDateObj.getMonth()]}`
                : t('unknown');
            const locationUrl = deliveryCoords?.lat && deliveryCoords?.lng
                ? `https://www.google.com/maps?q=${deliveryCoords.lat},${deliveryCoords.lng}`
                : undefined;

            fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    customerName: user.user_metadata?.full_name || t('profileTitle'),
                    customerPhone: user.phone_number || user.phone || t('unknown'),
                    address: deliveryAddress,
                    locationUrl,
                    deliveryDate: deliveryDateFormatted,
                    deliverySlot: selectedSlot,
                    items: cart.map(item => ({
                        name: getLocalized(item.name, lang),
                        quantity: item.quantity,
                        price: item.price * item.quantity,
                        portion: item.portion || item.configuration?.portion
                    })),
                    comment: comment || undefined,
                    total: total,
                    lang: lang
                })
            }).catch(err => console.error('Telegram notification failed:', err));

            try {
                const successSnapshot: SuccessOrderSnapshot = {
                    id: orderId,
                    total_price: total,
                    payment_method: paymentMethod,
                    comment,
                    delivery_time: orderData.delivery_time,
                    delivery_slot: selectedSlot,
                    delivery_type: deliveryType,
                    branch_id: deliveryType === 'pickup' ? selectedBranchId : null,
                    branch_snapshot: deliveryType === 'pickup' ? branches.find(b => b.id === selectedBranchId) : null,
                    delivery_address: orderData.delivery_address,
                    saved_at: Date.now()
                };
                sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(successSnapshot));
            } catch (storageError) {
                console.error('[Checkout] Failed to cache success snapshot:', storageError);
            }

            // Clear cart immediately after confirmed order — before navigation or modal
            // Must await so the DB delete completes before component unmounts
            await clearCart({ rollbackOnError: false, syncServer: true });

            // Mark the used delivery address as default so it auto-selects on next visit
            if (user && deliveryType === 'delivery' && deliveryCoords) {
                const match = savedAddresses.find(a =>
                    a.lat != null && a.lng != null &&
                    Math.abs(a.lat - deliveryCoords.lat) < 0.001 &&
                    Math.abs(a.lng - deliveryCoords.lng) < 0.001
                );
                if (match) {
                    addressService.setDefaultAddress(match.id).catch(() => {});
                }
            }

            setCreatedOrderId(orderId);
            setIsSuccessOpen(true);
        } catch (error) {
            console.error('Error creating order:', error);
            alert(`${t('errorOccurred')}: ${(error as any).message || JSON.stringify(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={28} />
                </button>
                <h1 className={styles.title}>{t('checkoutTitle')}</h1>
            </header>


            {/* No phone warning banner */}
            {user && !hasPhone && (
                <div style={{
                    margin: '0 16px 12px',
                    padding: '14px 16px',
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#9A3412',
                    lineHeight: '1.5'
                }}>
                    <strong>⚠️ {t('phoneNotLinked')}</strong>
                    <p style={{ margin: '4px 0 0' }}>
                        {t('linkPhonePrompt')}
                        <a
                            href={TELEGRAM_CONFIG.botLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0088cc', fontWeight: 600 }}
                        >
                            @{TELEGRAM_CONFIG.botUsername}
                        </a>
                    </p>
                </div>
            )}

            {/* Delivery/Pickup Toggle */}
            <div className={styles.card} style={{ padding: '4px', background: '#F3F4F6', borderRadius: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <button
                        onClick={() => setDeliveryType('delivery')}
                        style={{
                            padding: '12px',
                            borderRadius: '11px',
                            border: 'none',
                            background: deliveryType === 'delivery' ? 'white' : 'transparent',
                            boxShadow: deliveryType === 'delivery' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            color: deliveryType === 'delivery' ? '#BE185D' : '#6B7280',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ShoppingBag size={18} /> {t('delivery')}
                    </button>
                    <button
                        onClick={() => setDeliveryType('pickup')}
                        style={{
                            padding: '12px',
                            borderRadius: '11px',
                            border: 'none',
                            background: deliveryType === 'pickup' ? 'white' : 'transparent',
                            boxShadow: deliveryType === 'pickup' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            color: deliveryType === 'pickup' ? '#BE185D' : '#6B7280',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <MapPin size={18} /> {t('pickup')}
                    </button>
                </div>
            </div>

            {/* Address Section - Only for Delivery */}
            {deliveryType === 'delivery' ? (
                <div
                    className={`${styles.card} ${styles.clickableCard}`}
                    onClick={() => setIsAddressesOpen(true)}
                >
                    <h2 className={styles.cardTitle}>{t('deliveryAddress')}</h2>
                    <div className={styles.addressRow}>
                        <div className={styles.addressDot} />
                        <div className={styles.addressText}>
                            <strong>{deliveryAddress}</strong>
                        </div>
                        <ChevronRight className={styles.chevron} size={20} />
                    </div>
                </div>
            ) : (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('selectBranch')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        {branches.map((branch) => (
                            <div
                                key={branch.id}
                                onClick={() => setSelectedBranchId(branch.id)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: `2px solid ${selectedBranchId === branch.id ? '#BE185D' : '#F3F4F6'}`,
                                    background: selectedBranchId === branch.id ? '#FFF1F2' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 700, color: selectedBranchId === branch.id ? '#BE185D' : '#111827' }}>
                                        {lang === 'uz' ? branch.name_uz : branch.name_ru}
                                    </div>
                                    {selectedBranchId === branch.id && <CheckCircle2 size={18} color="#BE185D" />}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                                    {lang === 'uz' ? branch.address_uz : branch.address_ru}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AddressesModal
                isOpen={isAddressesOpen}
                onClose={() => setIsAddressesOpen(false)}
            />

            {/* Delivery Time Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('deliveryTime')}</h2>

                <div
                    className={styles.dateSelector}
                    onClick={() => setIsCalendarOpen(true)}
                >
                    <Calendar size={20} className={styles.calendarIcon} />
                    <span className={selectedDate ? styles.dateValue : styles.datePlaceholder}>
                        {selectedDate || t('selectDay')}
                    </span>
                    <ChevronRight size={20} className={styles.chevron} />
                </div>

                <CalendarModal
                    isOpen={isCalendarOpen}
                    onClose={() => setIsCalendarOpen(false)}
                    selectedDate={selectedDateObj}
                    overrides={overrides}
                    onSelect={(date) => {
                        setSelectedDateObj(date);
                        const monthNames = t('months') as unknown as string[];
                        const formattedDate = `${date.getDate()}-${monthNames[date.getMonth()]}`;
                        setSelectedDate(formattedDate);
                    }}
                />
                <div className={styles.timeGrid}>
                    {loadingAvailability
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={styles.timeSlot} style={{
                                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.2s infinite',
                                color: 'transparent',
                                pointerEvents: 'none',
                            }}>—</div>
                        ))
                        : timeSlots.map((slot) => {
                            const blocked = isSlotBlocked(slot);
                            return (
                                <div
                                    key={slot}
                                    className={`
                                        ${styles.timeSlot}
                                        ${selectedSlot === slot ? styles.timeSlotActive : ''}
                                        ${blocked ? styles.timeSlotBlocked : ''}
                                    `}
                                    onClick={() => !blocked && setSelectedSlot(slot)}
                                >
                                    {slot}
                                </div>
                            );
                        })
                    }
                </div>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
            </div>

            {/* Comment Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('customerNote')}</h2>
                <textarea
                    className={styles.textarea}
                    placeholder={t('customerNotePlaceholder')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </div>

            {/* Loyalty Program (Shirin Tangalar) */}
            {user && (user.coins || 0) > 0 && (
                <div className={styles.card}>
                    <div className={styles.loyaltyHeader}>
                        <div className={styles.loyaltyTitleGroup}>
                            <h2 className={styles.cardTitle}>{t('shirinTangalar')}</h2>
                            <p className={styles.loyaltyBalance}>
                                {t('balance')}: <strong>{(user.coins || 0).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')}</strong>
                            </p>
                            <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                                {t('coinExpiryNotice')}
                            </p>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={useCoins}
                                onChange={(e) => {
                                    setUseCoins(e.target.checked);
                                    if (e.target.checked) setCoinsToSpend(Math.min(user.coins || 0, initialTotal));
                                    else setCoinsToSpend(0);
                                }}
                            />
                            <span className={styles.slider} />
                        </label>
                    </div>

                    {useCoins && (
                        <div className={styles.coinInputArea}>
                            <div className={styles.coinValueRow}>
                                <div className={styles.coinSpentText}>
                                    <span>{t('using')}</span>
                                    <div className={styles.coinInputWrapper}>
                                        <input
                                            type="number"
                                            className={styles.coinInput}
                                            value={coinsToSpend}
                                            placeholder="0"
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                if (raw === '') {
                                                    setCoinsToSpend('');
                                                    setCoinInputError(false);
                                                    return;
                                                }
                                                const val = parseInt(raw) || 0;
                                                setCoinsToSpend(val);
                                                const maxPossible = Math.min(user.coins || 0, initialTotal);
                                                setCoinInputError(val > maxPossible);
                                            }}
                                            onBlur={() => {
                                                const numericVal = Number(coinsToSpend) || 0;
                                                const maxPossible = Math.min(user.coins || 0, initialTotal);
                                                
                                                if (numericVal > maxPossible) {
                                                    setCoinsToSpend(maxPossible);
                                                    setCoinInputError(false);
                                                } else if (coinsToSpend === '') {
                                                    setCoinsToSpend(0);
                                                } else {
                                                    setCoinsToSpend(numericVal);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    className={styles.maxBtn}
                                    onClick={() => {
                                        setCoinsToSpend(Math.min(user.coins || 0, initialTotal));
                                        setCoinInputError(false);
                                    }}
                                >
                                    MAX
                                </button>
                            </div>
                            {coinInputError && (
                                <span className={styles.coinError}>
                                    {t('coinLimitError')}
                                </span>
                            )}
                            {!coinInputError && (
                                <p className={styles.discountHelp}>
                                    -{(Number(coinsToSpend) || 0).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')} {t('discount')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Promo Code Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('promoAndBonuses')}</h2>
                {activePromoId ? (
                    <div className={styles.promoSuccessBox}>
                        <div className={styles.promoSuccessIcon}>
                            <CheckCircle2 size={16} />
                        </div>
                        <div className={styles.promoSuccessDetails}>
                            <span className={styles.promoSuccessCode}>{activePromoCode}</span>
                            <span className={styles.promoSuccessAmount}>-{promoDiscount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                        </div>
                        <button
                            className={styles.promoRemoveBtn}
                            onClick={() => {
                                setActivePromoId(null);
                                setActivePromoCode(null);
                                setPromoDiscount(0);
                            }}
                        >
                            {t('remove')}
                        </button>
                    </div>
                ) : (
                    <button className={styles.promoCollapsedRow} onClick={() => setPromoModalOpen(true)}>
                        <Tag size={16} className={styles.promoCollapsedIcon} />
                        <span>{t('iHavePromo')}</span>
                        <ChevronRight size={16} className={styles.promoCollapsedChevron} />
                    </button>
                )}

                {/* Loyalty coins preview */}
                <div className={styles.loyaltyCoinsPreview}>
                    <span className={styles.loyaltyCoinsEmoji}>🙂</span>
                    <div className={styles.loyaltyCoinsText}>
                        <span className={styles.loyaltyCoinsTitle}>
                            {t('bonusPoints')}
                        </span>
                        <span className={styles.loyaltyCoinsSubtitle}>
                            {t('afterOneDay')}
                        </span>
                    </div>
                    <span className={styles.loyaltyCoinsAmount}>
                        {Math.floor(total * loyaltyRate).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')}
                    </span>
                </div>
            </div>

            {/* Promo Modal */}
            {promoModalOpen && (
                <div className={styles.promoModalOverlay} onClick={() => { setPromoModalOpen(false); setPromoError(null); }}>
                    <div className={styles.promoModalSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.promoModalHandle} />
                        <h3 className={styles.promoModalTitle}>{t('havePromoTitle')}</h3>
                        <div className={styles.promoInputWrapper}>
                            <div className={styles.promoIcon}>
                                <Tag size={18} />
                            </div>
                            <input
                                type="text"
                                className={styles.promoInput}
                                placeholder={t('promoPlaceholder')}
                                value={promoInput}
                                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                disabled={isVerifyingPromo}
                                autoFocus
                            />
                        </div>
                        {promoError && <p className={styles.promoErrorText}>{promoError}</p>}
                        <button
                            className={styles.promoApplyBtn}
                            style={{ width: '100%', marginTop: '12px', height: '48px', borderRadius: '14px', fontSize: '15px' }}
                            onClick={handleApplyPromo}
                            disabled={isVerifyingPromo || !promoInput.trim()}
                        >
                            {isVerifyingPromo ? '...' : t('apply')}
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Method Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('paymentMethod')}</h2>
                <div className={styles.paymentGrid}>
                    <div
                        className={`${styles.paymentCard} ${paymentMethod === 'cash' ? styles.paymentCardActive : ''}`}
                        onClick={() => setPaymentMethod('cash')}
                    >
                        <Banknote size={24} className={styles.paymentIcon} />
                        <div className={styles.paymentLabel}>
                            <span className={styles.paymentTitle}>{t('cash')}</span>
                            <span className={styles.paymentSubtext}>{t('cashDesc')}</span>
                        </div>
                    </div>
                    <div
                        className={`${styles.paymentCard} ${paymentMethod === 'card' ? styles.paymentCardActive : ''}`}
                        onClick={() => setPaymentMethod('card')}
                    >
                        <CreditCard size={24} className={styles.paymentIcon} />
                        <div className={styles.paymentLabel}>
                            <span className={styles.paymentTitle}>{t('card')}</span>
                            <span className={styles.paymentSubtext}>{t('cardDesc')}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.summary}>
                    {cart.some(item => item.configuration?.mode === 'wizard' || item.configuration?.mode === 'upload') && (
                        <div style={{
                            marginBottom: '10px', padding: '10px 12px',
                            background: '#FDF2F8', border: '1px solid #FBCFE8',
                            borderRadius: '10px', fontSize: '13px', color: '#BE185D', lineHeight: '1.5'
                        }}>
                            {t('customPriceNote')}
                        </div>
                    )}
                    <div className={styles.summaryRow}>
                        <span>{t('items')}:</span>
                        <span>{subtotal.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{t('delivery')}:</span>
                        <span>{deliveryFee.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                    </div>
                    {promoDiscount > 0 && (
                        <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                            <span>{t('promoDiscount')}:</span>
                            <span>-{promoDiscount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                        </div>
                    )}
                    {useCoins && (Number(coinsToSpend) || 0) > 0 && (
                        <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                            <span>{t('shirinTangalar')} {t('discount')}:</span>
                            <span>-{(Number(coinsToSpend) || 0).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                        </div>
                    )}
                    <div className={styles.totalRow}>
                        <span>{t('total')}:</span>
                        <span>{total.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                    </div>
                </div>

                <button
                    className={styles.confirmBtn}
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || totalItems === 0}
                >
                    {isSubmitting ? t('processing') : t('confirmOrder')}
                </button>
            </div>

            {isSuccessOpen && createdOrderId && (
                <SuccessModal
                    isOpen={isSuccessOpen}
                    onClose={() => {
                        setIsSuccessOpen(false);
                        router.replace(`/savat/checkout/success?orderId=${createdOrderId}`);
                    }}
                />
            )}
        </div >
    );
}
