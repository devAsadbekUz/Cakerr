export type AdminDashboardCategory = {
    id: string;
    label: string;
};

export type AdminDashboardOrderItem = {
    product_id?: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    products?: {
        category_id?: string | null;
    } | null;
};

export type AdminDashboardOrder = {
    id: string;
    user_id?: string | null;
    status: string;
    total_price: number;
    delivery_time: string;
    created_at: string;
    profiles?: {
        full_name?: string | null;
    } | null;
    order_items?: AdminDashboardOrderItem[] | null;
};

export type AdminDashboardRecentOrder = {
    id: string;
    status: string;
    total_price: number;
    created_at: string;
    profiles?: {
        full_name?: string | null;
    } | null;
};

export type AdminDashboardRevenuePoint = {
    label: string;
    revenue: number;
    sales: number;
    isFuture?: boolean;
};

export type AdminDashboardDayCount = {
    label: string;
    date: string;
    count: number;
    isToday?: boolean;
};

export type AdminDashboardTopProduct = {
    name: string;
    quantity: number;
    revenue: number;
};

export type AdminDashboardPeakHour = {
    hour: number;
    count: number;
    label: string;
};

export type AdminDashboardStatusCount = {
    status: string;
    count: number;
};

export type AdminDashboardCategoryRevenue = {
    id: string;
    revenue: number;
};

export type AdminDashboardAnalytics = {
    newOrdersCount: number;
    todaysOrdersCount: number;
    totalRevenue: number;
    activeBuyers: number;
    aov: number;
    repeatCustomers: number;
    repeatRate: number;
    topProducts: AdminDashboardTopProduct[];
    peakHours: AdminDashboardPeakHour[];
    statusBreakdown: AdminDashboardStatusCount[];
    totalOrders: number;
    allProductSales: AdminDashboardTopProduct[];
    categoryRevenue: AdminDashboardCategoryRevenue[];
    newCustomers: number;
};

export type AdminDashboardData = {
    filterDays: number | null;
    totalUsers: number;
    categories: AdminDashboardCategory[];
    recentOrders: AdminDashboardRecentOrder[];
    revenueTrend: AdminDashboardRevenuePoint[];
    weeklyData: AdminDashboardDayCount[];
    dailyOrders30: AdminDashboardDayCount[];
    analytics: AdminDashboardAnalytics;
};

export function createEmptyDashboardData(filterDays: number | null): AdminDashboardData {
    return {
        filterDays,
        totalUsers: 0,
        categories: [],
        recentOrders: [],
        revenueTrend: [],
        weeklyData: [],
        dailyOrders30: [],
        analytics: {
            newOrdersCount: 0,
            todaysOrdersCount: 0,
            totalRevenue: 0,
            activeBuyers: 0,
            aov: 0,
            repeatCustomers: 0,
            repeatRate: 0,
            topProducts: [],
            peakHours: [],
            statusBreakdown: [],
            totalOrders: 0,
            allProductSales: [],
            categoryRevenue: [],
            newCustomers: 0,
        },
    };
}
