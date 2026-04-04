'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, ShoppingBag, Package, Calendar, Settings,
    LogOut, Tags, Menu, X, Wand2, Coins, MessageSquare, ShieldCheck, ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { AdminTranslationKey } from '@/app/lib/admin-i18n';
import styles from './AdminSidebar.module.css';

type MenuItem = {
    path: string;
    label: AdminTranslationKey;
    icon: LucideIcon;
    slug: string;
    ownerOnly?: boolean;
};

const MENU: MenuItem[] = [
    { path: '/admin',            label: 'dashboard',  icon: LayoutDashboard, slug: 'dashboard' },
    { path: '/admin/orders',     label: 'orders',     icon: ShoppingBag,     slug: 'orders' },
    { path: '/admin/pos',        label: 'pos',        icon: ShoppingCart,    slug: 'orders' },
    { path: '/admin/products',   label: 'products',   icon: Package,         slug: 'products' },
    { path: '/admin/categories', label: 'categories', icon: Tags,            slug: 'categories' },
    { path: '/admin/schedule',   label: 'schedule',   icon: Calendar,        slug: 'schedule' },
    { path: '/admin/custom',     label: 'custom',     icon: Wand2,           slug: 'custom' },
    { path: '/admin/loyalty',    label: 'loyalty',    icon: Coins,           slug: 'loyalty' },
    { path: '/admin/messages',   label: 'messages',   icon: MessageSquare,   slug: 'messages' },
    { path: '/admin/roles',      label: 'roles',      icon: ShieldCheck,     slug: 'roles', ownerOnly: true },
    { path: '/admin/settings',   label: 'settings',   icon: Settings,        slug: 'settings' },
];

type AdminSidebarProps = {
    role: 'owner' | 'staff';
    permissions: string[];
};

export default function AdminSidebar({ role, permissions }: AdminSidebarProps) {
    const { lang, setLang, t } = useAdminI18n();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const isVisible = (item: MenuItem) => {
        if (role === 'owner') return true;
        if (item.ownerOnly) return false;
        return permissions.includes(item.slug);
    };

    const handleLogout = async () => {
        if (role === 'staff') {
            await fetch('/api/admin/auth/staff/logout', { method: 'POST' });
        } else {
            const supabase = createClient();
            await supabase.auth.signOut();
        }
        // Hard redirect to clear all administrative UI and state
        window.location.href = '/admin/login';
    };

    return (
        <>
            <div className={styles.mobileHeader}>
                <div className={styles.mobileLogo}>TORTEL&apos;E</div>
                <button className={styles.menuButton} onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

            <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.logo}>
                    <span className={styles.brandName}>TORTEL&apos;E</span>
                </div>

                <nav className={styles.nav}>
                    {MENU.filter(isVisible).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`${styles.item} ${isActive ? styles.active : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{t(item.label)}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.langSwitcher}>
                    <button className={`${styles.langBtn} ${lang === 'uz' ? styles.langBtnActive : ''}`} onClick={() => setLang('uz')}>UZ</button>
                    <button className={`${styles.langBtn} ${lang === 'ru' ? styles.langBtnActive : ''}`} onClick={() => setLang('ru')}>RU</button>
                </div>

                <button className={styles.logout} onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>{t('logout')}</span>
                </button>
            </aside>
        </>
    );
}
