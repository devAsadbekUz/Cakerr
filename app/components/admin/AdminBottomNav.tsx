'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, MessageSquare } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { AdminTranslationKey } from '@/app/lib/admin-i18n';
import styles from './AdminBottomNav.module.css';

type MenuItem = { path: string; label: AdminTranslationKey; icon: any; slug: string };

const MENU: MenuItem[] = [
    { path: '/admin',          label: 'dashboard', icon: LayoutDashboard, slug: 'dashboard' },
    { path: '/admin/orders',   label: 'orders',    icon: ShoppingBag,     slug: 'orders' },
    { path: '/admin/products', label: 'products',  icon: Package,         slug: 'products' },
    { path: '/admin/schedule', label: 'schedule',  icon: Calendar,        slug: 'schedule' },
    { path: '/admin/messages', label: 'messages',  icon: MessageSquare,   slug: 'messages' },
];

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export default function AdminBottomNav() {
    const { t } = useAdminI18n();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [role, setRole] = useState<'owner' | 'staff'>('owner');
    const [permissions, setPermissions] = useState<string[]>([]);

    useEffect(() => {
        setMounted(true);
        const r = getCookie('admin_role');
        if (r === 'staff') {
            setRole('staff');
            try {
                const p = JSON.parse(getCookie('admin_permissions') || '[]');
                setPermissions(Array.isArray(p) ? p : []);
            } catch { setPermissions([]); }
        } else {
            setRole('owner');
        }
    }, []);

    if (!mounted) return null;

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
