import 'server-only';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
    addDays,
    eachDayOfInterval,
    endOfWeek,
    format,
    isToday,
    startOfWeek,
    subDays,
} from 'date-fns';
import type {
    AdminDashboardCategory,
    AdminDashboardData,
    AdminDashboardDayCount,
    AdminDashboardRecentOrder,
    AdminDashboardRevenuePoint,
    AdminDashboardTopProduct,
} from '@/app/types';
import { createEmptyDashboardData } from '@/app/types/admin-dashboard';

type DashboardSourceOrderItem = {
    product_id?: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    products?: {
        category_id?: string | null;
    } | null;
};

type DashboardSourceOrder = {
    id: string;
    user_id?: string | null;
    status: string;
    total_price: number;
    delivery_time: string;
    created_at: string;
    profiles?: {
        full_name?: string | null;
    } | null;
    order_items?: DashboardSourceOrderItem[] | null;
};

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

function applyDaysFilter<T>(query: T, filterDays?: number | null) {
    if (!filterDays) {
        return query;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterDays);
    return (query as { gte: (column: string, value: string) => T }).gte('created_at', cutoff.toISOString());
}


function buildRevenueTrend(orders: DashboardSourceOrder[]): AdminDashboardRevenuePoint[] {
    const today = new Date();
    const points = Array.from({ length: 17 }, (_, index) => {
        const date = addDays(subDays(today, 6), index);
        return {
            date,
            label: format(date, 'dd/MM'),
            dateKey: format(date, 'yyyy-MM-dd'),
            revenue: 0,
            sales: 0,
            isFuture: index > 6,
        };
    });

    // Index past points (0–6) by date key for O(1) lookup
    const pastIndex = new Map<string, number>();
    for (let i = 0; i <= 6; i++) {
        pastIndex.set(points[i].dateKey, i);
    }

    // Index future points (7–16) by date key for O(1) lookup
    const futureIndex = new Map<string, number>();
    for (let i = 7; i < points.length; i++) {
        futureIndex.set(points[i].dateKey, i);
    }

    for (const order of orders) {
        const price = Number(order.total_price) || 0;

        if (order.status === 'completed') {
            const key = format(new Date(order.created_at), 'yyyy-MM-dd');
            const i = pastIndex.get(key);
            if (i !== undefined) {
                points[i].revenue += price;
                points[i].sales += 1;
            }
        }

        if (order.status !== 'cancelled') {
            const key = format(new Date(order.delivery_time), 'yyyy-MM-dd');
            const i = futureIndex.get(key);
            if (i !== undefined) {
                points[i].revenue += price;
                points[i].sales += 1;
            }
        }
    }

    return points.map((point) => ({
        label: point.label,
        revenue: point.revenue,
        sales: point.sales,
        isFuture: point.isFuture,
    }));
}

function buildDeliveryDateMap(orders: DashboardSourceOrder[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const order of orders) {
        const key = format(new Date(order.delivery_time), 'yyyy-MM-dd');
        map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
}

function buildWeeklyData(orders: DashboardSourceOrder[]): AdminDashboardDayCount[] {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const byDate = buildDeliveryDateMap(orders);

    return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => ({
        label: format(day, 'EEE'),
        date: format(day, 'd-MMM'),
        count: byDate.get(format(day, 'yyyy-MM-dd')) ?? 0,
        isToday: isToday(day),
    }));
}

function buildDailyOrders30(orders: DashboardSourceOrder[]): AdminDashboardDayCount[] {
    const today = new Date();
    const byDate = buildDeliveryDateMap(orders);

    return Array.from({ length: 30 }, (_, index) => {
        const day = subDays(today, 29 - index);
        return {
            label: format(day, 'dd/MM'),
            date: format(day, 'dd/MM'),
            count: byDate.get(format(day, 'yyyy-MM-dd')) ?? 0,
            isToday: isToday(day),
        };
    });
}

export async function fetchAdminDashboardData(filterDays: number | null = 30): Promise<AdminDashboardData> {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    const ordersQuery = applyDaysFilter(
        serviceClient
            .from('orders')
            .select(`
                id, user_id, status, total_price, delivery_time, created_at,
                profiles (full_name),
                order_items (
                    product_id, name, quantity, unit_price,
                    products (category_id)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(300),
        filterDays
    );

    const [ordersRes, profilesRes, categoriesRes] = await Promise.all([
        ordersQuery,
        serviceClient.from('profiles').select('*', { count: 'exact', head: true }),
        serviceClient.from('categories').select('id, label').order('id', { ascending: true }),
    ]);

    if (ordersRes.error) {
        throw ordersRes.error;
    }
    if (profilesRes.error) {
        throw profilesRes.error;
    }
    if (categoriesRes.error) {
        throw categoriesRes.error;
    }

    const orders = (ordersRes.data as DashboardSourceOrder[] | null) ?? [];
    if (orders.length === 0) {
        return {
            ...createEmptyDashboardData(filterDays),
            totalUsers: profilesRes.count ?? 0,
            categories: (categoriesRes.data as AdminDashboardCategory[] | null) ?? [],
        };
    }

    const totalUsers = profilesRes.count ?? 0;
    const categories = (categoriesRes.data as AdminDashboardCategory[] | null) ?? [];

    let newOrdersCount = 0;
    let todaysOrdersCount = 0;
    let totalRevenue = 0;
    let completedCount = 0;
    const activeBuyerIds = new Set<string>();
    const userOrderCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const hourCounts = new Array(24).fill(0);
    const productSales = new Map<string, AdminDashboardTopProduct>();
    const categoryRevenue = new Map<string, number>();

    for (const order of orders) {
        if (order.status === 'new') newOrdersCount++;
        if (isToday(new Date(order.delivery_time)) && order.status !== 'completed' && order.status !== 'cancelled') todaysOrdersCount++;
        if (order.user_id) {
            activeBuyerIds.add(order.user_id);
            userOrderCounts.set(order.user_id, (userOrderCounts.get(order.user_id) || 0) + 1);
        }

        statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);

        const createdHour = new Date(order.created_at).getHours();
        hourCounts[createdHour] += 1;

        if (order.status === 'completed') {
            totalRevenue += Number(order.total_price) || 0;
            completedCount += 1;
        }

        for (const item of order.order_items ?? []) {
            const key = item.product_id || item.name;
            const quantity = item.quantity || 1;
            const revenue = (Number(item.unit_price) || 0) * quantity;
            const existing = productSales.get(key);

            if (existing) {
                existing.quantity += quantity;
                existing.revenue += revenue;
            } else {
                productSales.set(key, {
                    name: item.name,
                    quantity,
                    revenue,
                });
            }

            if (order.status === 'completed') {
                const isCustom = !item.product_id || item.product_id === '00000000-0000-0000-0000-000000000000';
                const categoryId = isCustom ? 'custom' : (item.products?.category_id || 'other');
                categoryRevenue.set(categoryId, (categoryRevenue.get(categoryId) || 0) + revenue);
            }
        }
    }

    let repeatCustomers = 0;
    for (const count of userOrderCounts.values()) {
        if (count > 1) {
            repeatCustomers += 1;
        }
    }

    const allProductSales = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity);

    const recentOrders: AdminDashboardRecentOrder[] = orders.slice(0, 30).map((order) => ({
        id: order.id,
        status: order.status,
        total_price: order.total_price,
        created_at: order.created_at,
        profiles: order.profiles,
    }));

    return {
        filterDays,
        totalUsers,
        categories,
        recentOrders,
        revenueTrend: buildRevenueTrend(orders),
        weeklyData: buildWeeklyData(orders),
        dailyOrders30: buildDailyOrders30(orders),
        analytics: {
            newOrdersCount,
            todaysOrdersCount,
            totalRevenue,
            activeBuyers: activeBuyerIds.size,
            aov: completedCount > 0 ? totalRevenue / completedCount : 0,
            repeatCustomers,
            repeatRate: activeBuyerIds.size > 0
                ? Math.round((repeatCustomers / activeBuyerIds.size) * 100)
                : 0,
            topProducts: allProductSales.slice(0, 5),
            peakHours: hourCounts
                .map((count, hour) => ({
                    hour,
                    count,
                    label: `${hour.toString().padStart(2, '0')}:00`,
                }))
                .filter((item) => item.hour >= 6 && item.hour <= 23),
            statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
                status,
                count,
            })),
            totalOrders: orders.length,
            allProductSales,
            categoryRevenue: Array.from(categoryRevenue.entries())
                .map(([id, revenue]) => ({ id, revenue }))
                .sort((a, b) => b.revenue - a.revenue),
            newCustomers: activeBuyerIds.size - repeatCustomers,
        },
    };
}
