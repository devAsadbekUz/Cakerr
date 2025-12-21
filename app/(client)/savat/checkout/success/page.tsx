'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Calendar, MapPin, MessageSquare, Banknote, Edit2, ShoppingBag, Map as MapIcon } from 'lucide-react';
import styles from './page.module.css';
import AddressesModal from '@/app/components/checkout/AddressesModal';
import { useState } from 'react';
import { useCart } from '@/app/context/CartContext';

export default function OrderSuccessPage() {
    const router = useRouter();
    const { deliveryAddress } = useCart();
    const [isAddressesOpen, setIsAddressesOpen] = useState(false);

    // Mock data for display - in a real app this would come from the order state or API
    const orderDetails = {
        id: 'ORD-4023',
        deliveryDate: '23 December 2025',
        deliveryTime: '15:00 - 17:00',
        address: 'Small Ring Road, Takhtapul, Yunusabad district',
        comment: 'Qo\'shimcha izohlar qoldirilmagan',
        paymentMethod: 'Naqd pul (yetkazib berishda)',
        productsTotal: 370500,
        deliveryFee: 25000,
        total: 395500
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.push('/')}>
                    <ChevronLeft size={24} />
                </button>

                <div className={styles.successIcon}>
                    <Check size={48} />
                </div>

                <h1 className={styles.title}>Buyurtma tasdiqlandi!</h1>
                <p className={styles.subtitle}>Buyurtmangiz muvaffaqiyatli qabul qilindi</p>
                <span className={styles.orderId}>Buyurtma ID: {orderDetails.id}</span>
            </header>

            <div className={styles.section}>
                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                        <Calendar size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>Yetkazib berish vaqti</span>
                        <span className={styles.detailValue}>{orderDetails.deliveryDate}</span>
                        <span className={styles.detailValue}>{orderDetails.deliveryTime}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#FFF1F2', color: '#E11D48' }}>
                        <MapPin size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={styles.detailLabel}>Yetkazib berish manzili</span>
                            <Edit2
                                size={16}
                                color="#E91E63"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setIsAddressesOpen(true)}
                            />
                        </div>
                        <span className={styles.detailValue}>{deliveryAddress || orderDetails.address}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                        <MessageSquare size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>Qo'shimcha izohlar</span>
                        <span className={styles.detailValue}>{orderDetails.comment}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                        <Banknote size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>To'lov usuli</span>
                        <span className={styles.detailValue}>{orderDetails.paymentMethod}</span>
                    </div>
                </div>
            </div>

            <div className={styles.summarySection}>
                <h2 className={styles.summaryTitle}>Buyurtma xulasasi</h2>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Mahsulotlar</span>
                    <span className={styles.summaryValue}>{orderDetails.productsTotal.toLocaleString('uz-UZ')} so'm</span>
                </div>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Yetkazib berish</span>
                    <span className={styles.summaryValue}>{orderDetails.deliveryFee.toLocaleString('uz-UZ')} so'm</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                    <span>Jami</span>
                    <span className={styles.totalValue}>{orderDetails.total.toLocaleString('uz-UZ')} so'm</span>
                </div>
            </div>

            <div className={styles.thankYouNote}>
                🎉 Buyurtmangiz uchun rahmat! Tortingizni mehru muhabbat bilan tayyorlayapmiz.
            </div>

            <div className={styles.simpleNote}>
                Kuryer yo'lga chiqqanda xabar beramiz
            </div>

            <footer className={styles.footer}>
                <button className={styles.trackBtn} onClick={() => router.push(`/profil/buyurtmalar/${orderDetails.id}`)}>
                    <MapIcon size={20} />
                    Buyurtmani kuzatish
                </button>
                <button className={styles.continueBtn} onClick={() => router.push('/')}>
                    <ShoppingBag size={20} />
                    Xarid qilishni davom ettirish
                </button>
            </footer>

            <AddressesModal
                isOpen={isAddressesOpen}
                onClose={() => setIsAddressesOpen(false)}
            />
        </div>
    );
}
