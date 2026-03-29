'use client';

import React, { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, ShoppingCart, User, Plus } from 'lucide-react';
import styles from './BottomNav.module.css';
import { useCart } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';

function BottomNav() {
    const pathname = usePathname();
    const { totalItems } = useCart();
    const { t } = useLanguage();
    const [isBumping, setIsBumping] = useState(false);
    const [prevTotal, setPrevTotal] = useState(totalItems);

    useEffect(() => {
        if (totalItems > prevTotal) {
            setIsBumping(true);
            const timer = setTimeout(() => setIsBumping(false), 300);
            return () => clearTimeout(timer);
        }
        setPrevTotal(totalItems);
    }, [totalItems, prevTotal]);


    const isActive = (path: string) => pathname === path;

    return (
        <nav className={styles.nav}>
            <Link href="/" className={`${styles.item} ${isActive('/') ? styles.active : ''}`}>
                < Home size={24} />
                <span>{t('home')}</span>
            </Link>

            <Link href="/sevimli" className={`${styles.item} ${isActive('/sevimli') ? styles.active : ''}`}>
                <Heart size={24} />
                <span>{t('favorites')}</span>
            </Link>

            <div className={styles.centerContainer}>
                <Link href="/yaratish" className={styles.createButton}>
                    <Plus size={32} color="white" />
                </Link>
                <span className={styles.createLabel}>{t('add')}</span>
            </div>

            <Link href="/savat" className={`${styles.item} ${isActive('/savat') ? styles.active : ''}`}>
                <div id="cart-nav-icon" className={`${styles.iconWrapper} ${isBumping ? styles.bump : ''}`}>
                    <ShoppingCart size={24} />
                    {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
                </div>
                <span>{t('cart')}</span>
            </Link>

            <Link href="/profil" className={`${styles.item} ${isActive('/profil') ? styles.active : ''}`}>
                <User size={24} />
                <span>{t('profile')}</span>
            </Link>
        </nav>
    );
}

export default memo(BottomNav);
