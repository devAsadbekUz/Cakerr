'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, Settings, LogOut, Tags, Menu, X, Wand2, Coins, MessageSquare, Cake, Languages } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { AdminTranslationKey } from '@/app/lib/admin-i18n';
import styles from './AdminSidebar.module.css';


const MENU: { path: string; label: AdminTranslationKey; icon: any }[] = [
    { path: '/admin', label: 'dashboard', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'orders', icon: ShoppingBag },
    { path: '/admin/products', label: 'products', icon: Package },
    { path: '/admin/categories', label: 'categories', icon: Tags },
    { path: '/admin/schedule', label: 'schedule', icon: Calendar },
    { path: '/admin/custom', label: 'custom', icon: Wand2 },
    { path: '/admin/loyalty', label: 'loyalty', icon: Coins },
    { path: '/admin/messages', label: 'messages', icon: MessageSquare },
    { path: '/admin/settings', label: 'settings', icon: Settings },
];

export default function AdminSidebar() {
    const { lang, setLang, t } = useAdminI18n();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    if (!mounted) return null;

    return (
        <>
            {/* Mobile Header */}
            <div className={styles.mobileHeader}>
                <div className={styles.mobileLogo}>
                    TORTEL'E
                </div>
                <button
                    className={styles.menuButton}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overly for mobile */}
            {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

            <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.logo}>
                    <Image src="/favicon.png" alt="Logo" width={32} height={32} />
                    <span className={styles.brandName}>TORTEL'E</span>
                </div>

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
                                onClick={() => setIsOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{t(item.label)}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.langSwitcher}>
                    <button 
                        className={`${styles.langBtn} ${lang === 'uz' ? styles.langBtnActive : ''}`}
                        onClick={() => setLang('uz')}
                    >
                        UZ
                    </button>
                    <button 
                        className={`${styles.langBtn} ${lang === 'ru' ? styles.langBtnActive : ''}`}
                        onClick={() => setLang('ru')}
                    >
                        RU
                    </button>
                </div>

                <button className={styles.logout} onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>{t('logout')}</span>
                </button>
            </aside>
        </>
    );
}
