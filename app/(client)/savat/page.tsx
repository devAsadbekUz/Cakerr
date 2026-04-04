'use client';

import Image from 'next/image';
import { useCart } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import styles from './page.module.css';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/app/components/cart/ConfirmDeleteModal';
import { useState } from 'react';
import { CartItem } from '@/app/context/CartContext';

export default function SavatPage() {
    const { lang, t } = useLanguage();
    const { cart, removeItem, updateQuantity, totalItems, subtotal } = useCart();
    const [pendingDeleteItem, setPendingDeleteItem] = useState<CartItem | null>(null);
    const deliveryFee = totalItems > 0 ? 40000 : 0;
    const total = subtotal + deliveryFee;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('cart')}</h1>
                    <p className={styles.subtitle}>{totalItems} {t('mahsulot') || 'mahsulot'}</p>
                </div>
            </div>

            {cart.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrapper}>
                        <ShoppingBag size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className={styles.emptyTitle}>{t('noActiveOrders')}</h2>
                    <p className={styles.emptyDescription}>
                        {t('noProducts')}
                    </p>
                    <Link href="/" className={styles.primaryBtn}>
                        {t('home')}
                    </Link>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {cart.map((item) => (
                            <div key={item.cartId} className={styles.item}>
                                <div className={styles.imageWrapper}>
                                    <Image src={item.image} alt={getLocalized(item.name, lang)} fill className={styles.image} sizes="80px" style={{ objectFit: 'cover' }} />
                                </div>
                                <div className={styles.itemContent}>
                                    <div className={styles.itemHeader}>
                                        <h3 className={styles.itemName}>{getLocalized(item.name, lang)}</h3>
                                        <button className={styles.removeBtn} onClick={() => removeItem(item.cartId)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className={styles.itemSpecs}>
                                        <p>{t('portions')}: {item.portion}</p>
                                        {item.flavor && <p>{t('flavors')}: {getLocalized(item.flavor, lang)}</p>}
                                        {item.customNote && (
                                            <p className={styles.customNote}>
                                                <span style={{ fontWeight: 600 }}>{t('customerNote')}:</span> {item.customNote}
                                            </p>
                                        )}
                                    </div>
                                    <div className={styles.itemBottom}>
                                        <p className={styles.itemPrice}>
                                            {(item.price || 0).toLocaleString('en-US')} {t('som')}
                                        </p>
                                        <div className={styles.stepper}>
                                            <button
                                                className={styles.stepperBtn}
                                                onClick={() => {
                                                    if (item.quantity === 1) {
                                                        setPendingDeleteItem(item);
                                                    } else {
                                                        updateQuantity(item.cartId, item.quantity - 1);
                                                    }
                                                }}
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
                            <span>{t('items')}</span>
                            <span>{subtotal.toLocaleString('uz-UZ')} {t('som')}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>{t('delivery')}</span>
                            <span>{deliveryFee.toLocaleString('uz-UZ')} {t('som')}</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.total}`}>
                            <span>{t('total')}</span>
                            <span className={styles.totalValue}>{total.toLocaleString('uz-UZ')} {t('som')}</span>
                        </div>
                    </div>

                    <Link href="/savat/checkout" className={styles.checkoutBtn}>
                        {t('checkout')}
                    </Link>
                </>
            )}

            <ConfirmDeleteModal
                isOpen={!!pendingDeleteItem}
                onClose={() => setPendingDeleteItem(null)}
                onConfirm={() => pendingDeleteItem && removeItem(pendingDeleteItem.cartId)}
                itemName={pendingDeleteItem ? getLocalized(pendingDeleteItem.name, lang) : ''}
            />
        </div>
    );
}

