'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, Settings, LogOut, Tags, Menu, X, Wand2 } from 'lucide-react';
import styles from './AdminSidebar.module.css';

const MENU = [
    { path: '/admin', label: 'Bosh sahifa', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'Buyurtmalar', icon: ShoppingBag },
    { path: '/admin/products', label: 'Mahsulotlar', icon: Package },
    { path: '/admin/categories', label: 'Kategoriyalar', icon: Tags },
    { path: '/admin/schedule', label: 'Vaqtlar', icon: Calendar },
    { path: '/admin/custom', label: 'Maxsus', icon: Wand2 },
    { path: '/admin/settings', label: 'Sozlamalar', icon: Settings },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    if (!mounted) return null;

    return (
        <>
            {/* Mobile Header */}
            <div className={styles.mobileHeader}>
                <div className={styles.mobileLogo}>
                    🍰 Cakerr
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
                    🍰 Cakerr <span className={styles.badge}>Admin</span>
                </div>

                <nav className={styles.nav}>
                    {MENU.map((item) => {
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
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <button className={styles.logout} onClick={() => setIsOpen(false)}>
                    <LogOut size={20} />
                    <span>Chiqish</span>
                </button>
            </aside>
        </>
    );
}
