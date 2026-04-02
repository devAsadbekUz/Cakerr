'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Calendar, Banknote, CreditCard } from 'lucide-react';
import CalendarModal from '@/app/components/checkout/CalendarModal';
import AddressesModal from '@/app/components/checkout/AddressesModal';
import SuccessModal from '@/app/components/checkout/SuccessModal';
import { useSupabase } from '@/app/context/AuthContext';
import { getAuthHeader } from '@/app/utils/telegram';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';
import { createClient } from '@/app/utils/supabase/client';
import { availabilityService } from '@/app/services/availabilityService';
import { format } from 'date-fns';

const LAST_ORDER_STORAGE_KEY = 'cakerr_last_order';

interface SuccessOrderSnapshot {
    id: string;
    total_price: number;
    payment_method: 'cash' | 'card';
    comment: string;
    delivery_time: string;
    delivery_slot: string;
    delivery_address: {
        street: string;
        lat: number | null;
        lng: number | null;
    };
    saved_at: number;
}


export default function CheckoutPage() {
    const router = useRouter();
    const { lang, t } = useLanguage();
    const { cart, subtotal, totalItems, deliveryAddress, deliveryCoords, clearCart } = useCart();
    const { user } = useSupabase();
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

    // Shirin Tangalar State
    const [useCoins, setUseCoins] = useState(false);
    const [coinsToSpend, setCoinsToSpend] = useState(0);

    // DB-driven time slots (with hardcoded fallback)
    const FALLBACK_SLOTS = [
        '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00',
        '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'
    ];
    const [timeSlots, setTimeSlots] = useState<string[]>(FALLBACK_SLOTS);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const deliveryFee = totalItems > 0 ? 25000 : 0;
    const initialTotal = subtotal + deliveryFee;
    const total = initialTotal - (useCoins ? coinsToSpend : 0);

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

    useEffect(() => {
        // Both fetches are independent — run in parallel
        Promise.all([
            fetchAvailability(),
            availabilityService.getGlobalSlots().catch(() => [])
        ]).then(([, slots]) => {
            if (Array.isArray(slots) && slots.length > 0) {
                setTimeSlots(slots.map((s: any) => s.label));
            }
        });
    }, []);

    const isSlotBlocked = (slot: string) => {
        if (!selectedDateObj) return false;
        const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
        const dayOverrides = overrides.filter(o => o.date === dateStr);
        return dayOverrides.some(o => o.slot === null || o.slot === slot);
    };

    const hasPhone = !!(user?.phone_number || user?.phone);

    const handleConfirmOrder = async () => {
        if (!user) {
            router.push('/profil/login?redirectTo=/savat/checkout');
            return;
        }

        if (!hasPhone) {
            alert(
                lang === 'ru'
                    ? `Для оформления заказа необходимо привязать номер телефона.\n\nОткройте бота @${TELEGRAM_CONFIG.botUsername} и поделитесь номером.`
                    : `Buyurtma berish uchun telefon raqamingizni ulashingiz kerak.\n\n@${TELEGRAM_CONFIG.botUsername} botini oching va raqamingizni ulashing.`
            );
            return;
        }

        if (!selectedSlot) {
            alert(t('selectTimeError') || 'Iltimos, yetkazib berish vaqtini tanlang');
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                total_price: total,
                delivery_address: {
                    street: deliveryAddress,
                    lat: deliveryCoords?.lat || null,
                    lng: deliveryCoords?.lng || null,
                },
                delivery_time: selectedDateObj ? selectedDateObj.toISOString() : new Date().toISOString(),
                delivery_slot: selectedSlot,
                comment: comment,
                coins_spent: useCoins ? coinsToSpend : 0,
                payment_method: paymentMethod
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
                    coins_spent: orderData.coins_spent
                })
            });

            if (!response.ok) {
                const rawError = await response.text();
                console.error('[Checkout] API Fail:', response.status, rawError);
                throw new Error(`Xatolik: ${rawError || 'Buyurtma yaratilmadi'}`);
            }

            const result = await response.json();
            const createdOrder = result.order as { id: string };

            // 3. Send Telegram notification — fire-and-forget, never block the success screen
            const monthNames = t('months') as unknown as string[];
            const deliveryDateFormatted = selectedDateObj
                ? `${selectedDateObj.getDate()}-${monthNames[selectedDateObj.getMonth()]}`
                : 'Noma\'lum';
            const locationUrl = deliveryCoords?.lat && deliveryCoords?.lng
                ? `https://www.google.com/maps?q=${deliveryCoords.lat},${deliveryCoords.lng}`
                : undefined;

            fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: createdOrder.id,
                    customerName: user.user_metadata?.full_name || 'Mijoz',
                    customerPhone: user.phone_number || user.phone || 'Noma\'lum',
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
                    id: createdOrder.id,
                    total_price: total,
                    payment_method: paymentMethod,
                    comment,
                    delivery_time: orderData.delivery_time,
                    delivery_slot: selectedSlot,
                    delivery_address: orderData.delivery_address,
                    saved_at: Date.now()
                };
                sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(successSnapshot));
            } catch (storageError) {
                console.error('[Checkout] Failed to cache success snapshot:', storageError);
            }

            setCreatedOrderId(createdOrder.id);
            setIsSuccessOpen(true);
        } catch (error) {
            console.error('Error creating order:', error);
            alert(`Xatolik: ${(error as any).message || JSON.stringify(error)}`);
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
                    <strong>⚠️ {lang === 'ru' ? 'Телефон не привязан' : 'Telefon raqam ulanmagan'}</strong>
                    <p style={{ margin: '4px 0 0' }}>
                        {lang === 'ru'
                            ? 'Для оформления заказа привяжите номер через бота: '
                            : 'Buyurtma berish uchun botda raqamingizni ulang: '}
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

            {/* Address Section */}
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
                                {t('balance')}: <strong>{(user.coins || 0).toLocaleString('en-US')}</strong>
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
                            <div className={styles.coinSliderRow}>
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.min(user.coins || 0, initialTotal)}
                                    value={coinsToSpend}
                                    onChange={(e) => setCoinsToSpend(parseInt(e.target.value))}
                                    className={styles.coinRange}
                                />
                            </div>
                            <div className={styles.coinValueRow}>
                                <span className={styles.coinSpentText}>
                                    {t('using')}: <strong>{coinsToSpend.toLocaleString('en-US')}</strong>
                                </span>
                                <button
                                    className={styles.maxBtn}
                                    onClick={() => setCoinsToSpend(Math.min(user.coins || 0, initialTotal))}
                                >
                                    MAX
                                </button>
                            </div>
                            <p className={styles.discountHelp}>
                                -{coinsToSpend.toLocaleString('en-US')} {t('som')} {t('discount')}
                            </p>
                        </div>
                    )}
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
                    <div className={styles.summaryRow}>
                        <span>{t('items')}:</span>
                        <span>{subtotal.toLocaleString('en-US')} {t('som')}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{t('delivery')}:</span>
                        <span>{deliveryFee.toLocaleString('en-US')} {t('som')}</span>
                    </div>
                    {useCoins && coinsToSpend > 0 && (
                        <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                            <span>{t('shirinTangalar')} {t('discount')}:</span>
                            <span>-{coinsToSpend.toLocaleString('en-US')} {t('som')}</span>
                        </div>
                    )}
                    <div className={styles.totalRow}>
                        <span>{t('total')}:</span>
                        <span>{total.toLocaleString('en-US')} {t('som')}</span>
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
                        void clearCart({ rollbackOnError: false, syncServer: false });
                        router.replace(`/savat/checkout/success?orderId=${createdOrderId}`);
                    }}
                />
            )}
        </div >
    );
}
