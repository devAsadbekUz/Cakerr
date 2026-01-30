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
import { useTelegram } from '@/app/context/TelegramContext';
import { createClient } from '@/app/utils/supabase/client';
import { format } from 'date-fns';

const TIME_SLOTS = [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 19:00',
    '19:00 - 21:00'
];

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, subtotal, totalItems, deliveryAddress, clearCart, savedAddresses } = useCart();
    const { user, isTelegramUser } = useSupabase();
    const { getAuthHeader } = useTelegram();
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

    const [overrides, setOverrides] = useState<any[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const deliveryFee = totalItems > 0 ? 25000 : 0;
    const total = subtotal + deliveryFee;

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
            // Find the selected address coordinates
            const selectedAddr = savedAddresses.find(a => a.address === deliveryAddress);

            const orderData = {
                total_price: total,
                delivery_address: {
                    label: selectedAddr?.label || 'Address',
                    street: deliveryAddress,
                    lat: selectedAddr?.lat || null,
                    lng: selectedAddr?.lng || null,
                },
                delivery_time: selectedDateObj ? selectedDateObj.toISOString() : new Date().toISOString(),
                delivery_slot: selectedSlot,
                comment: comment
            };

            const orderItems = cart.map(item => {
                const isCustom = item.id.startsWith('custom-') || item.configuration?.pricing_type === 'hybrid';

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

            // Use API proxy for Telegram users, direct Supabase for admin/Google users
            if (isTelegramUser) {
                const authHeaders = getAuthHeader();
                console.log('[Checkout] Sending headers:', Object.keys(authHeaders).join(', '));

                const response = await fetch('/api/user/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({ order: orderData, items: orderItems })
                });

                if (!response.ok) {
                    const rawError = await response.text();
                    console.error('[Checkout] API Fail:', response.status, rawError);
                    throw new Error(`${response.status}: ${rawError || 'No detail'}`);
                }

                const result = await response.json();
                createdOrder = result.order;
            } else {
                // Direct Supabase for admin/Google users
                const { data, error: orderError } = await supabase
                    .from('orders')
                    .insert({ ...orderData, user_id: user.id, status: 'new' })
                    .select()
                    .single();

                if (orderError) throw orderError;
                createdOrder = data;

                // Create order items
                const itemsWithOrderId = orderItems.map(item => ({
                    ...item,
                    order_id: createdOrder.id
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsWithOrderId);

                if (itemsError) throw itemsError;
            }

            // 3. Send Telegram notification
            try {
                const monthNames = [
                    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
                    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
                ];
                const deliveryDateFormatted = selectedDateObj
                    ? `${selectedDateObj.getDate()}-${monthNames[selectedDateObj.getMonth()]}`
                    : 'Noma\'lum';

                const locationUrl = selectedAddr?.lat && selectedAddr?.lng
                    ? `https://www.google.com/maps?q=${selectedAddr.lat},${selectedAddr.lng}`
                    : undefined;

                await fetch('/api/telegram/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: createdOrder.id,
                        customerName: user.user_metadata?.full_name || 'Mijoz',
                        customerPhone: user.phone || 'Noma\'lum',
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
                    {TIME_SLOTS.map((slot) => {
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
        </div>
    );
}
