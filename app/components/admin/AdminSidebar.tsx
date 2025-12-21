'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Calendar, Settings, LogOut } from 'lucide-react';
import styles from './AdminSidebar.module.css';

const MENU = [
    { path: '/admin', label: 'Bosh sahifa', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'Buyurtmalar', icon: ShoppingBag },
    { path: '/admin/products', label: 'Mahsulotlar', icon: Package },
    { path: '/admin/schedule', label: 'Vaqtlar', icon: Calendar },
    { path: '/admin/settings', label: 'Sozlamalar', icon: Settings },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
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
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <button className={styles.logout}>
                <LogOut size={20} />
                <span>Chiqish</span>
            </button>
        </aside>
    );
}
