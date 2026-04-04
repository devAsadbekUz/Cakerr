'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ShoppingBag as OrderHistoryIcon } from 'lucide-react';
import styles from './AdminDashboard.module.css';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { StatsGrid } from '@/app/components/admin/dashboard/StatsGrid';
import { ChartsSection } from '@/app/components/admin/dashboard/ChartsSection';
import { RecentOrdersSection } from '@/app/components/admin/dashboard/RecentOrdersSection';
import type { AdminDashboardData } from '@/app/types';

const ABCAnalysisModal = dynamic(() => import('@/app/components/admin/ABCAnalysisModal'), { ssr: false });
const DashboardExpandModal = dynamic(() => import('@/app/components/admin/DashboardExpandModal'), { ssr: false });

export default function AdminDashboardClient({ initialData }: { initialData: AdminDashboardData }) {
    const { t } = useAdminI18n();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();
    
    const [showABCModal, setShowABCModal] = useState(false);
    const [expandModal, setExpandModal] = useState<'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours' | null>(null);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filterDays = parseInt(searchParams.get('days') || '30') || 30;

    const statusColors = useMemo(() => ({
        new: { bg: '#FEF3C7', text: '#92400E', label: t('status_new') },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: t('status_confirmed') },
        preparing: { bg: '#FDE68A', text: '#78350F', label: t('status_preparing') },
        delivering: { bg: '#E0E7FF', text: '#3730A3', label: t('status_delivering') },
        completed: { bg: '#D1FAE5', text: '#065F46', label: t('status_completed') },
        cancelled: { bg: '#FEE2E2', text: '#991B1B', label: t('status_cancelled') },
    }), [t]);

    const statusBreakdown = useMemo(() => (
        initialData.analytics.statusBreakdown.map((item) => ({
            ...item,
            ...(statusColors[item.status as keyof typeof statusColors] || { bg: '#F3F4F6', text: '#6B7280', label: item.status }),
        }))
    ), [initialData.analytics.statusBreakdown, statusColors]);

    const handleFilterChange = (days: number | null) => {
        const params = new URLSearchParams(searchParams);
        if (days) params.set('days', days.toString());
        else params.delete('days');
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
            router.refresh();
        }, 500); // 500ms debounce for stability
    }, [router]);

    useEffect(() => {
        const channel = supabase
            .channel('admin-dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, scheduleRefresh)
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            supabase.removeChannel(channel);
        };
    }, [scheduleRefresh, supabase]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('managerPanel')}</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>{t('welcomeMessage')}</p>
                </div>

                <div className={styles.filterBar}>
                    <button
                        className={styles.filterBtn}
                        onClick={() => router.push('/admin/orders/history')}
                        style={{ border: '1.5px solid #F3F4F6', color: '#BE185D', fontWeight: 800 }}
                    >
                        <OrderHistoryIcon size={14} /> {t('orderHistory')}
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#F3F4F6', margin: '0 4px' }}></div>
                    {[
                        { label: t('filter_30'), value: 30 },
                        { label: t('filter_90'), value: 90 },
                        { label: t('filter_180'), value: 180 },
                        { label: t('filter_all'), value: null },
                    ].map((option) => (
                        <button
                            key={option.label}
                            className={`${styles.filterBtn} ${filterDays === option.value ? styles.filterBtnActive : ''}`}
                            onClick={() => handleFilterChange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </header>

            <StatsGrid data={initialData} />

            <ChartsSection 
                data={initialData} 
                statusBreakdown={statusBreakdown} 
                onExpand={setExpandModal} 
            />

            <RecentOrdersSection 
                data={initialData} 
                statusColors={statusColors} 
                onExpand={setExpandModal}
                onShowABC={() => setShowABCModal(true)}
            />

            <ABCAnalysisModal
                isOpen={showABCModal}
                onClose={() => setShowABCModal(false)}
                data={initialData.analytics.allProductSales}
            />

            <DashboardExpandModal
                isOpen={!!expandModal}
                onClose={() => setExpandModal(null)}
                type={expandModal || 'recentActivity'}
                recentOrders={initialData.recentOrders}
                revenueTrend={initialData.revenueTrend}
                dailyOrders30={initialData.dailyOrders30}
                analytics={{ ...initialData.analytics, statusBreakdown }}
            />
        </div>
    );
}
