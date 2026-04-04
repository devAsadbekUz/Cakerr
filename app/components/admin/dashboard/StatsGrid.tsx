'use client';

import React from 'react';
import { AlertCircle, Clock, DollarSign, Users, BarChart3, Repeat } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { StatCard } from '../DashboardComponents';
import type { AdminDashboardData } from '@/app/types';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

export function StatsGrid({ data }: { data: AdminDashboardData }) {
    const { lang, t } = useAdminI18n();

    return (
        <div className={styles.statsGrid}>
            <StatCard title={t('status_new')} value={data.analytics.newOrdersCount} icon={AlertCircle} color="orange" />
            <StatCard title={t('todaysOrders')} value={data.analytics.todaysOrdersCount} icon={Clock} color="blue" />
            <StatCard 
                title={t('revenue')} 
                value={`${(data.analytics.totalRevenue / 1000000).toFixed(1)}M`} 
                icon={DollarSign} 
                color="green" 
            />
            <StatCard
                title={t('customers')}
                value={data.totalUsers}
                icon={Users}
                color="purple"
                subtitle={`${data.analytics.activeBuyers} ${t('activeBuyersLabel')}`}
            />
            <StatCard
                title={t('averageCheck')}
                value={`${(data.analytics.aov / 1000).toFixed(0)}K`}
                icon={BarChart3}
                color="blue"
                subtitle={`${lang === 'uz' ? "so'm" : "сум"} / ${t('orders').toLowerCase()}`}
            />
            <StatCard
                title={t('repeatRate')}
                value={`${data.analytics.repeatRate}%`}
                icon={Repeat}
                color="green"
                subtitle={`${data.analytics.repeatCustomers} ${t('repeatCustomersCount')}`}
            />
        </div>
    );
}
