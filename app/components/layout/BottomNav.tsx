'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, ShoppingCart, User, Plus } from 'lucide-react';
import styles from './BottomNav.module.css';
import { useCart } from '@/app/context/CartContext';

export default function BottomNav() {
    const pathname = usePathname();
    const { totalItems } = useCart();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className={styles.nav}>
            <Link href="/" className={`${styles.item} ${isActive('/') ? styles.active : ''}`}>
                <Home size={24} />
                <span>Asosiy</span>
            </Link>

            <Link href="/sevimli" className={`${styles.item} ${isActive('/sevimli') ? styles.active : ''}`}>
                <Heart size={24} />
                <span>Sevimli</span>
            </Link>

            <div className={styles.centerContainer}>
                <Link href="/yaratish" className={styles.createButton}>
                    <Plus size={32} color="white" />
                </Link>
                <span className={styles.createLabel}>Yaratish</span>
            </div>

            <Link href="/savat" className={`${styles.item} ${isActive('/savat') ? styles.active : ''}`}>
                <div className={styles.iconWrapper}>
                    <ShoppingCart size={24} />
                    {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
                </div>
                <span>Savat</span>
            </Link>

            <Link href="/profil" className={`${styles.item} ${isActive('/profil') ? styles.active : ''}`}>
                <User size={24} />
                <span>Profil</span>
            </Link>
        </nav>
    );
}
