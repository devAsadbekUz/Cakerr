'use client';

import AdminSidebar from "@/app/components/admin/AdminSidebar";
import { usePathname } from "next/navigation";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const isLoginPage = pathname?.includes('/login');

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className={styles.layout}>
            <AdminSidebar />
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
