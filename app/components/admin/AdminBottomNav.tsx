'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { AdminTranslationKey } from '@/app/lib/admin-i18n';
import styles from './AdminBottomNav.module.css';

type MenuItem = { path: string; label: AdminTranslationKey; icon: LucideIcon; slug: string };

const MENU: MenuItem[] = [
    { path: '/admin',          label: 'dashboard', icon: LayoutDashboard, slug: 'dashboard' },
    { path: '/admin/orders',   label: 'orders',    icon: ShoppingBag,     slug: 'orders' },
    { path: '/admin/products', label: 'products',  icon: Package,         slug: 'products' },
    { path: '/admin/schedule', label: 'schedule',  icon: Calendar,        slug: 'schedule' },
    { path: '/admin/messages', label: 'messages',  icon: MessageSquare,   slug: 'messages' },
];

type AdminBottomNavProps = {
    role: 'owner' | 'staff';
    permissions: string[];
};

export default function AdminBottomNav({ role, permissions }: AdminBottomNavProps) {
    const { t } = useAdminI18n();
    const pathname = usePathname();

    const visible = MENU.filter(item =>
        role === 'owner' || permissions.includes(item.slug)
    );

    return (
        <nav className={styles.nav}>
            {visible.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        href={item.path}
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
