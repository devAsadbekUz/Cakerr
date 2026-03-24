'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Calendar, Banknote, CreditCard, XCircle } from 'lucide-react';
import CalendarModal from '@/app/components/checkout/CalendarModal';
import AddressesModal from '@/app/components/checkout/AddressesModal';
import SuccessModal from '@/app/components/checkout/SuccessModal';
import { useSupabase } from '@/app/context/SupabaseContext';
import { getAuthHeader } from '@/app/utils/telegram';
import { createClient } from '@/app/utils/supabase/client';
import { availabilityService } from '@/app/services/availabilityService';
import { format } from 'date-fns';



export default function CheckoutPage() {
    const router = useRouter();
    const { cart, subtotal, totalItems, deliveryAddress, deliveryCoords, clearCart, savedAddresses } = useCart();
    const { user } = useSupabase();
    const supabase = createClient();

    const [isAddressesOpen, setIsAddressesOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newOrderId, setNewOrderId] = useState<string | null>(null);

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
                .select('*')
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
        fetchAvailability();
        // Load global slots from DB, keep fallback if table doesn't exist
        availabilityService.getGlobalSlots()
            .then(slots => {
                if (slots.length > 0) setTimeSlots(slots.map(s => s.label));
                // if empty or error, fallback array stays
            })
            .catch(() => { /* keep fallback slots */ });
    }, []);

    const isSlotBlocked = (slot: string) => {
        if (!selectedDateObj) return false;
        const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
        const dayOverrides = overrides.filter(o => o.date === dateStr);
        return dayOverrides.some(o => o.slot === null || o.slot === slot);
    };

    const handleConfirmOrder = async () => {
        if (!user) {
            router.push('/profil/login?redirectTo=/savat/checkout');
            return;
        }

        if (!selectedSlot) {
            alert('Iltimos, yetkazib berish vaqtini tanlang');
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
                coins_spent: useCoins ? coinsToSpend : 0
            };

            const orderItems = cart.map(item => {
                const CUSTOM_CAKE_UUID = '00000000-0000-0000-0000-000000000000';
                const isCustom = item.id === CUSTOM_CAKE_UUID || item.configuration?.pricing_type === 'hybrid';

                return {
                    product_id: isCustom ? null : item.id,
                    name: item.name,
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

            let createdOrder: { id: string };

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
            createdOrder = result.order;

            // 3. Send Telegram notification
            try {
                const monthNames = [
                    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
                    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
                ];
                const deliveryDateFormatted = selectedDateObj
                    ? `${selectedDateObj.getDate()}-${monthNames[selectedDateObj.getMonth()]}`
                    : 'Noma\'lum';

                const locationUrl = deliveryCoords?.lat && deliveryCoords?.lng
                    ? `https://www.google.com/maps?q=${deliveryCoords.lat},${deliveryCoords.lng}`
                    : undefined;

                await fetch('/api/telegram/send', {
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
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price * item.quantity,
                            portion: item.portion || item.configuration?.portion
                        })),
                        comment: comment || undefined,
                        total: total
                    })
                });
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
                // Don't block order success if Telegram fails
            }

            setNewOrderId(createdOrder.id);
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
                <h1 className={styles.title}>Buyurtmani rasmiylashtirish</h1>
            </header>


            {/* Address Section */}
            <div
                className={`${styles.card} ${styles.clickableCard}`}
                onClick={() => setIsAddressesOpen(true)}
            >
                <h2 className={styles.cardTitle}>Yetkazib berish manzili</h2>
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
                <h2 className={styles.cardTitle}>Yetkazib berish vaqti</h2>

                <div
                    className={styles.dateSelector}
                    onClick={() => setIsCalendarOpen(true)}
                >
                    <Calendar size={20} className={styles.calendarIcon} />
                    <span className={selectedDate ? styles.dateValue : styles.datePlaceholder}>
                        {selectedDate || 'Kunni tanlang'}
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
                        const monthNames = [
                            "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
                            "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
                        ];
                        const formattedDate = `${date.getDate()}-${monthNames[date.getMonth()]}`;
                        setSelectedDate(formattedDate);
                    }}
                />
                <div className={styles.timeGrid}>
                    {timeSlots.map((slot) => {
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
                    })}
                </div>
            </div>

            {/* Comment Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Qo'shimcha izoh</h2>
                <textarea
                    className={styles.textarea}
                    placeholder="Bu masalan qo'shimcha telefon yoki eslatma bo'lishi mumkin."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </div>

            {/* Loyalty Program (Shirin Tangalar) */}
            {user && (user.coins || 0) > 0 && (
                <div className={styles.card}>
                    <div className={styles.loyaltyHeader}>
                        <div className={styles.loyaltyTitleGroup}>
                            <h2 className={styles.cardTitle}>Shirin Tangalar</h2>
                            <p className={styles.loyaltyBalance}>
                                Balans: <strong>{(user.coins || 0).toLocaleString('uz-UZ')}</strong>
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
                                    Ishlatilmoqda: <strong>{coinsToSpend.toLocaleString('uz-UZ')}</strong> tanga
                                </span>
                                <button
                                    className={styles.maxBtn}
                                    onClick={() => setCoinsToSpend(Math.min(user.coins || 0, initialTotal))}
                                >
                                    MAX
                                </button>
                            </div>
                            <p className={styles.discountHelp}>
                                -{coinsToSpend.toLocaleString('uz-UZ')} so'm chegirma
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Method Section */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>To'lov usuli</h2>
                <div className={styles.paymentGrid}>
                    <div
                        className={`${styles.paymentCard} ${paymentMethod === 'cash' ? styles.paymentCardActive : ''}`}
                        onClick={() => setPaymentMethod('cash')}
                    >
                        <Banknote size={24} className={styles.paymentIcon} />
                        <div className={styles.paymentLabel}>
                            <span className={styles.paymentTitle}>Naqd pul</span>
                            <span className={styles.paymentSubtext}>Yetkazib berish vaqti to'lash</span>
                        </div>
                    </div>
                    <div
                        className={`${styles.paymentCard} ${paymentMethod === 'card' ? styles.paymentCardActive : ''}`}
                        onClick={() => setPaymentMethod('card')}
                    >
                        <CreditCard size={24} className={styles.paymentIcon} />
                        <div className={styles.paymentLabel}>
                            <span className={styles.paymentTitle}>Kartadan to'lash</span>
                            <span className={styles.paymentSubtext}>UzCard, Humo</span>
                        </div>
                    </div>
                </div>

                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span>Mahsulotlar:</span>
                        <span>{subtotal.toLocaleString('uz-UZ')} so'm</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Yetkazib berish:</span>
                        <span>{deliveryFee.toLocaleString('uz-UZ')} so'm</span>
                    </div>
                    {useCoins && coinsToSpend > 0 && (
                        <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                            <span>Sadalat chegirmasi:</span>
                            <span>-{coinsToSpend.toLocaleString('uz-UZ')} so'm</span>
                        </div>
                    )}
                    <div className={styles.totalRow}>
                        <span>Jami:</span>
                        <span>{total.toLocaleString('uz-UZ')} so'm</span>
                    </div>
                </div>

                <button
                    className={styles.confirmBtn}
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || totalItems === 0}
                >
                    {isSubmitting ? 'Kutilmoqda...' : 'Buyurtmani tasdiqlash'}
                </button>
            </div>

            <SuccessModal
                isOpen={isSuccessOpen}
                onClose={() => {
                    setIsSuccessOpen(false);
                    clearCart();
                    router.push(`/savat/checkout/success?orderId=${newOrderId}`);
                }}
            />
        </div >
    );
}
