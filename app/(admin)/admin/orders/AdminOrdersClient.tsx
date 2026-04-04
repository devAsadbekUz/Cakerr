'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import {
    addMonths, format, isToday, isTomorrow, subMonths
} from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { orderService } from '@/app/services/orderService';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { OrderCard, OrderDetailsModal, Section } from '@/app/components/admin/DashboardComponents';
import { AdminCalendar } from '@/app/components/admin/dashboard/AdminCalendar';
import { updateOrderStatusAction } from '@/app/actions/admin-actions';
import type { AdminOrder, AdminOrderCardData, AdminOrderListItem } from '@/app/types/admin-order';
import styles from '../AdminDashboard.module.css';
import { ORDERS_FILTER_DAYS, ORDERS_PAGE_LIMIT } from './orders-config';

type OrderUpdatePayload = { new: { id: string; status: string } };
type OrderInsertPayload = { new: { id: string } };
type OrderDeletePayload = { old: { id: string } };

const STATUS_RANK: Record<string, number> = {
    new: 1,
    confirmed: 2,
    preparing: 3,
    ready: 4,
    delivering: 5,
    completed: 6,
    cancelled: 6
};

function capOrders(orders: AdminOrderCardData[]) {
    return orders.slice(0, ORDERS_PAGE_LIMIT);
}

export default function AdminOrdersClient({ initialOrders }: { initialOrders: AdminOrderListItem[] }) {
    const { lang, t } = useAdminI18n();
    const router = useRouter();
    const locale = lang === 'uz' ? uz : ru;
    const supabase = createClient();

    const [orders, setOrders] = useState<AdminOrderCardData[]>(initialOrders);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'inbox' | 'calendar'>('inbox');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedOrder, setSelectedOrder] = useState<AdminOrderCardData | null>(null);
    const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
    const [newOrderNotify, setNewOrderNotify] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Update local state when initialOrders change (due to router.refresh)
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        router.refresh();
        // Since router.refresh() is async and updates initialOrders via server re-fetch,
        // we don't strictly need to do more here if the page is set up correctly.
        // But we'll keep a small delay to show loading state for UX.
        setTimeout(() => setLoading(false), 500);
    }, [router]);

    const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
        if (processingIds.has(orderId)) return;
        setProcessingIds(prev => new Set(prev).add(orderId));

        try {
            // Optimistic update for immediate feedback
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            
            const result = await updateOrderStatusAction(orderId, newStatus, lang);
            
            if (result?.error) {
                setErrorMsg(t('error') + ': ' + result.error);
                fetchData(); // Rollback to server state
            }
        } catch (err: any) {
            console.error('Update error:', err);
            setErrorMsg(t('error'));
            fetchData();
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    }, [fetchData, lang, t, processingIds]);

    const handleSelectOrder = useCallback(async (order: AdminOrderCardData) => {
        setSelectedOrder(order);
        setSelectedOrderLoading(true);

        const fullOrder = await orderService.getOrderAdmin(order.id) as AdminOrder | null;

        setSelectedOrder(current => current?.id === order.id ? (fullOrder || current) : current);
        setSelectedOrderLoading(false);
    }, []);

    const handleCloseModal = useCallback(() => setSelectedOrder(null), []);
    const handleModalUpdate = useCallback((id: string, status: string) => {
        handleUpdateStatus(id, status);
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }, [handleUpdateStatus]);

    useEffect(() => {
        const channel = supabase
            .channel('admin-orders-realtime')
            .on('postgres_changes', { event: 'INSERT', table: 'orders', schema: 'public' }, () => {
                setNewOrderNotify(true);
                router.refresh();
            })
            .on('postgres_changes', { event: 'UPDATE', table: 'orders', schema: 'public' }, (payload: OrderUpdatePayload) => {
                const { id, status } = payload.new;
                
                setOrders(prev => {
                    const order = prev.find(o => o.id === id);
                    if (!order) return prev;
                    
                    const isFinal = (s: string) => s === 'completed' || s === 'cancelled';
                    if (isFinal(order.status) && !isFinal(status)) return prev;
                    
                    const currentRank = STATUS_RANK[order.status] || 0;
                    const nextRank = STATUS_RANK[status] || 0;
                    if (currentRank > nextRank) return prev;

                    return prev.map(o => o.id === id ? { ...o, status } : o);
                });
                
                router.refresh();
            })
            .on('postgres_changes', { event: 'DELETE', table: 'orders', schema: 'public' }, () => {
                router.refresh();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router, supabase]);

    const activeOrders = useMemo(() => {
        if (viewMode !== 'inbox') return [];
        return orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    }, [orders, viewMode]);

    const groupedOrders = useMemo(() => {
        if (viewMode !== 'inbox') return {};
        return activeOrders.reduce<Record<string, AdminOrder[]>>((groups, order) => {
            const date = format(new Date(order.delivery_time), 'yyyy-MM-dd');
            if (!groups[date]) groups[date] = [];
            groups[date].push(order as AdminOrder);
            return groups;
        }, {});
    }, [activeOrders, viewMode]);

    const sortedDates = useMemo(() => Object.keys(groupedOrders).sort(), [groupedOrders]);

    const ordersByDay = useMemo(() => {
        const map = new Map<string, AdminOrderCardData[]>();
        for (const o of orders) {
            const key = format(new Date(o.delivery_time), 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(o);
        }
        return map;
    }, [orders]);

    const filteredByDate = useMemo(() => {
        if (viewMode !== 'calendar') return [];
        return ordersByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? [];
    }, [ordersByDay, selectedDate, viewMode]);

    return (
        <div className={styles.container}>
            {newOrderNotify && (
                <div className={styles.notification}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 600 }}>{t('newOrderAlert')}</span>
                    <button onClick={() => setNewOrderNotify(false)} className={styles.dismissBtn}>{t('close')}</button>
                </div>
            )}
            {errorMsg && (
                <div className={styles.notification} style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 600 }}>{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className={styles.dismissBtn}>{t('close')}</button>
                </div>
            )}

            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 className={styles.title}>{t('orders')}</h1>
                    <button
                        onClick={fetchData}
                        className={styles.modalClose}
                        title={t('refresh')}
                        style={{ width: '40px', height: '40px', background: 'white' }}
                    >
                        <Clock size={20} />
                    </button>
                </div>
                <div className={styles.viewToggle}>
                    <button
                        onClick={() => setViewMode('inbox')}
                        className={`${styles.toggleBtn} ${viewMode === 'inbox' ? styles.toggleBtnActive : ''}`}
                    >
                        <ShoppingBag size={18} /> {t('inbox')}
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleBtnActive : ''}`}
                    >
                        <CalendarIcon size={18} /> {t('calendar')}
                    </button>
                </div>
            </header>

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={handleCloseModal}
                    onUpdate={handleModalUpdate}
                    loading={selectedOrderLoading}
                    disabled={processingIds.has(selectedOrder.id)}
                />
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>{t('loading')}</div>
            ) : viewMode === 'inbox' ? (
                <div className={styles.inboxView}>
                    {sortedDates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', color: '#9CA3AF' }}>
                            <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <p>{t('noActiveOrders')}</p>
                        </div>
                    ) : (
                        sortedDates.map(dateStr => {
                            const date = new Date(dateStr);
                            const displayDate = isToday(date) ? t('today') :
                                isTomorrow(date) ? t('tomorrow') :
                                    format(date, 'd-MMMM, EEEE', { locale });
                            const dayOrders = groupedOrders[dateStr];

                            return (
                                <Section
                                    key={dateStr}
                                    title={displayDate}
                                    count={dayOrders.length}
                                    highlight={isToday(date)}
                                >
                                    {dayOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            onUpdate={handleUpdateStatus}
                                            onSelect={handleSelectOrder}
                                            disabled={processingIds.has(order.id)}
                                        />
                                    ))}
                                </Section>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className={styles.calendarView}>
                    <div className={styles.calendarContainer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{format(currentMonth, 'MMMM yyyy', { locale })}</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={styles.modalClose}><ChevronLeft size={20} /></button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={styles.modalClose}><ChevronRight size={20} /></button>
                            </div>
                        </div>
                        <AdminCalendar
                            currentMonth={currentMonth}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            ordersByDay={ordersByDay}
                            lang={lang}
                        />
                    </div>

                    <div className={styles.dayDetails}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={20} color="#BE185D" />
                            {isToday(selectedDate) ? t('today') : format(selectedDate, 'd-MMMM', { locale })} {t('ordersFor')}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {filteredByDate.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', background: '#F9FAFB', borderRadius: '16px', color: '#9CA3AF', fontSize: '14px' }}>
                                    {t('noOrdersForDay')}
                                </div>
                            ) : (
                                filteredByDate.map(order => (
                                    <OrderCard 
                                        key={order.id} 
                                        order={order} 
                                        compact 
                                        onUpdate={handleUpdateStatus} 
                                        onSelect={handleSelectOrder} 
                                        disabled={processingIds.has(order.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
