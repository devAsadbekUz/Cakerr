'use client';

import Image from 'next/image';
import { useCart } from '@/app/context/CartContext';
import styles from './page.module.css';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function SavatPage() {
    const { cart, removeItem, updateQuantity, totalItems, subtotal } = useCart();
    const deliveryFee = totalItems > 0 ? 25000 : 0;
    const total = subtotal + deliveryFee;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Savat</h1>
                    <p className={styles.subtitle}>{totalItems} mahsulot</p>
                </div>
                <div className={styles.avatar}>
                    <span>N</span>
                </div>
            </div>

            {cart.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrapper}>
                        <ShoppingBag size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className={styles.emptyTitle}>Savatingiz bo'sh</h2>
                    <p className={styles.emptyDescription}>
                        Mazali tortlarni savatga qo'shing va ular shu yerda ko'rinadi!
                    </p>
                    <Link href="/" className={styles.primaryBtn}>
                        Asosiyga o'tish
                    </Link>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {cart.map((item) => (
                            <div key={item.cartId} className={styles.item}>
                                <div className={styles.imageWrapper}>
                                    <Image src={item.image} alt={item.name} fill className={styles.image} sizes="80px" style={{ objectFit: 'cover' }} />
                                </div>
                                <div className={styles.itemContent}>
                                    <div className={styles.itemHeader}>
                                        <h3 className={styles.itemName}>{item.name}</h3>
                                        <button className={styles.removeBtn} onClick={() => removeItem(item.cartId)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className={styles.itemSpecs}>
                                        <p>Porsiyalar: {item.portion}</p>
                                        {item.flavor && <p>Lazzat: {item.flavor}</p>}
                                        {item.customNote && (
                                            <p className={styles.customNote}>
                                                <span style={{ fontWeight: 600 }}>Izoh:</span> {item.customNote}
                                            </p>
                                        )}
                                    </div>
                                    <div className={styles.itemBottom}>
                                        <p className={styles.itemPrice}>
                                            {(item.price || 0).toLocaleString('en-US')} so'm
                                        </p>
                                        <div className={styles.stepper}>
                                            <button
                                                className={styles.stepperBtn}
                                                onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.count}>{item.quantity}</span>
                                            <button
                                                className={styles.stepperBtn}
                                                onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.summary}>
                        <div className={styles.summaryRow}>
                            <span>Mahsulotlar</span>
                            <span>{subtotal.toLocaleString('uz-UZ')} so'm</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Yetkazib berish</span>
                            <span>{deliveryFee.toLocaleString('uz-UZ')} so'm</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.total}`}>
                            <span>Jami</span>
                            <span className={styles.totalValue}>{total.toLocaleString('uz-UZ')} so'm</span>
                        </div>
                    </div>

                    <Link href="/savat/checkout" className={styles.checkoutBtn}>
                        Buyurtma berish
                    </Link>
                </>
            )}
        </div>
    );
}

