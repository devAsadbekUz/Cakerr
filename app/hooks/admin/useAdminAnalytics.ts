import { useMemo } from 'react';
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays } from 'date-fns';

export interface AnalyticResult {
    newOrdersCount: number;
    todaysOrdersCount: number;
    totalRevenue: number;
    totalCustomers: number;
    activeBuyers: number;
    aov: number;
    repeatCustomers: number;
    repeatRate: number;
    topProducts: any[];
    peakHours: any[];
    statusBreakdown: any[];
    revenueTrend: any[];
    totalOrders: number;
    allProductSales: any[];
    categoryMix: any[];
    newCustomers: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: '#FEF3C7', text: '#92400E', label: 'Yangi' },
    confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: 'Tasdiqlangan' },
    preparing: { bg: '#FDE68A', text: '#78350F', label: 'Tayyorlanmoqda' },
    delivering: { bg: '#E0E7FF', text: '#3730A3', label: 'Yetkazilmoqda' },
    completed: { bg: '#D1FAE5', text: '#065F46', label: 'Tugallangan' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Bekor qilingan' },
};

function parseCatLabel(raw: any, lang: string): string {
    if (!raw) return '';
    try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (obj && typeof obj === 'object') {
            return obj[lang] || obj['uz'] || obj['ru'] || String(raw);
        }
    } catch {
        // not JSON — plain string
    }
    return String(raw);
}

export function useAdminAnalytics(orders: any[], totalUsers: number, categories: any[], filterDays: number | null = null, lang = 'uz') {
    const targetOrders = useMemo(() => {
        if (!filterDays) return orders;
        const cutoff = subDays(new Date(), filterDays);
        return orders.filter(o => new Date(o.created_at) >= cutoff);
    }, [orders, filterDays]);

    const analytics = useMemo(() => {
        const newOrders: any[] = [];
        const todaysOrders: any[] = [];
        let totalRevenue = 0;
        let completedCount = 0;
        const activeBuyerIds = new Set<string>();
        const userOrderCounts = new Map<string, number>();
        const statusCounts = new Map<string, number>();
        const hourCounts = new Array(24).fill(0);
        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
        const categoryRevenue = new Map<string, number>();

        // Revenue per day for last 6 days + Today + Next 10 days
        const today = new Date();
        const revenueDays = Array.from({ length: 17 }, (_, i) => {
            const d = subDays(today, 6 - i);
            return {
                date: d,
                label: format(d, 'dd/MM'),
                revenue: 0,
                count: 0,
                isFuture: i > 6 // 0-6 are past/today, 7-16 are future
            };
        });

        for (const o of targetOrders) {
            // Active buyers
            if (o.user_id) {
                activeBuyerIds.add(o.user_id);
                userOrderCounts.set(o.user_id, (userOrderCounts.get(o.user_id) || 0) + 1);
            }

            // Status breakdown
            statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);

            // New orders
            if (o.status === 'new') {
                newOrders.push(o);
            }

            // Past Revenue (from completed orders, using creation date)
            const orderCreatedAt = new Date(o.created_at);
            if (o.status === 'completed') {
                const price = Number(o.total_price) || 0;
                totalRevenue += price;
                completedCount++;

                for (let i = 0; i <= 6; i++) {
                    const day = revenueDays[i];
                    if (isSameDay(orderCreatedAt, day.date)) {
                        day.revenue += price;
                        day.count++;
                        break;
                    }
                }
            }

            // Future Projection (from non-cancelled orders, using delivery date)
            const orderDeliveryDate = new Date(o.delivery_time);
            if (o.status !== 'cancelled') {
                const price = Number(o.total_price) || 0;
                // Only count for index 7 and above (future days)
                for (let i = 7; i < revenueDays.length; i++) {
                    const day = revenueDays[i];
                    if (isSameDay(orderDeliveryDate, day.date)) {
                        day.revenue += price;
                        day.count++;
                        break;
                    }
                }
            }

            // Today's active orders
            const deliveryDate = new Date(o.delivery_time);
            if (isToday(deliveryDate) && o.status !== 'completed' && o.status !== 'cancelled') {
                todaysOrders.push(o);
            }

            // Peak hours (from order creation time)
            const hour = new Date(o.created_at).getHours();
            hourCounts[hour]++;

            // Top products (from order_items)
            if (o.order_items) {
                for (const item of o.order_items) {
                    const key = item.product_id || item.name;
                    const existing = productSales.get(key);
                    const qty = item.quantity || 1;
                    const rev = (Number(item.unit_price) || 0) * qty;
                    if (existing) {
                        existing.quantity += qty;
                        existing.revenue += rev;
                    } else {
                        productSales.set(key, { name: item.name, quantity: qty, revenue: rev });
                    }

                    // Category revenue tracking
                    if (o.status === 'completed') {
                        const isCustom = !item.product_id || item.product_id === '00000000-0000-0000-0000-000000000000';
                        const catId = isCustom ? 'custom' : (item.products?.category_id || 'other');
                        categoryRevenue.set(catId, (categoryRevenue.get(catId) || 0) + rev);
                    }
                }
            }
        }

        // Repeat customers
        let repeatCustomers = 0;
        for (const count of userOrderCounts.values()) {
            if (count > 1) repeatCustomers++;
        }

        // AOV
        const aov = completedCount > 0 ? totalRevenue / completedCount : 0;

        // Top 5 products by quantity
        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Peak hours (only 6am to midnight for readability)
        const peakHours = hourCounts
            .map((count, hour) => ({ hour, count, label: `${hour.toString().padStart(2, '0')}:00` }))
            .filter(h => h.hour >= 6 && h.hour <= 23);

        // Status breakdown as array
        const statusBreakdown = Array.from(statusCounts.entries())
            .map(([status, count]) => ({
                status,
                count,
                ...(STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280', label: status })
            }));

        // Category revenue makeup
        const categoryColors = [
            '#BE185D', // Magenta (Custom)
            '#1D4ED8', // Royal Blue
            '#059669', // Emerald Green
            '#D97706', // Amber
            '#4F46E5', // Indigo
            '#7C3AED', // Violet
            '#0891B2', // Cyan
            '#9333EA', // Purple
        ];
        const categoryMix = Array.from(categoryRevenue.entries())
            .map(([id, revenue], idx) => {
                const cat = categories.find(c => c.id === id);
                const getLabel = () => {
                    if (cat) return parseCatLabel(cat.label, lang);
                    if (id === 'custom') return lang === 'ru' ? 'Индивидуальные заказы' : 'Maxsus buyurtmalar';
                    if (id === 'other') return lang === 'ru' ? 'Другое' : 'Boshqa';
                    return lang === 'ru' ? 'Неизвестно' : 'Noma\'lum';
                };
                return {
                    label: getLabel(),
                    value: revenue,
                    color: categoryColors[idx % categoryColors.length],
                    percent: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
                };
            })
            .sort((a, b) => b.value - a.value);

        return {
            newOrdersCount: newOrders.length,
            todaysOrdersCount: todaysOrders.length,
            totalRevenue,
            totalCustomers: totalUsers,
            activeBuyers: activeBuyerIds.size,
            aov,
            repeatCustomers,
            repeatRate: activeBuyerIds.size > 0
                ? Math.round((repeatCustomers / activeBuyerIds.size) * 100)
                : 0,
            topProducts,
            peakHours,
            statusBreakdown,
            revenueTrend: revenueDays,
            totalOrders: targetOrders.length,
            allProductSales: Array.from(productSales.values()),
            categoryMix,
            newCustomers: activeBuyerIds.size - repeatCustomers
        };
    }, [targetOrders, totalUsers, categories]);

    const weeklyData = useMemo(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

        return days.map(day => {
            const count = targetOrders.filter((o: any) => isSameDay(new Date(o.delivery_time), day)).length;
            return {
                label: format(day, 'EEE'),
                date: format(day, 'd-MMM'),
                count,
                isToday: isToday(day)
            };
        });
    }, [targetOrders]);

    return { analytics, weeklyData };
}
