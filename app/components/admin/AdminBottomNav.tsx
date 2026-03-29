'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, MessageSquare } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { AdminTranslationKey } from '@/app/lib/admin-i18n';
import styles from './AdminBottomNav.module.css';

const MENU: { path: string; label: AdminTranslationKey; icon: any }[] = [
    { path: '/admin', label: 'dashboard', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'orders', icon: ShoppingBag },
    { path: '/admin/products', label: 'products', icon: Package },
    { path: '/admin/schedule', label: 'schedule', icon: Calendar },
    { path: '/admin/messages', label: 'messages', icon: MessageSquare },
];

export default function AdminBottomNav() {
    const { t } = useAdminI18n();
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
                        prefetch={false}
                        className={`${styles.item} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={22} />
                        <span className={styles.label}>{t(item.label)}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
