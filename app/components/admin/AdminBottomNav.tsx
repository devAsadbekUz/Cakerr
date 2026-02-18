'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, MessageSquare } from 'lucide-react';
import styles from './AdminBottomNav.module.css';

const MENU = [
    { path: '/admin', label: 'Bosh', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'Buyurtma', icon: ShoppingBag },
    { path: '/admin/products', label: 'Mahsulot', icon: Package },
    { path: '/admin/schedule', label: 'Vaqt', icon: Calendar },
    { path: '/admin/messages', label: 'Xabar', icon: MessageSquare },
];

export default function AdminBottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <nav className={styles.nav}>
            {MENU.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`${styles.item} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={22} />
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
