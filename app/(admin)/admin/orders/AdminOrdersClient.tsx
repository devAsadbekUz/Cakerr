'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ShoppingBag, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import {
    addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
    isSameDay, isToday, isTomorrow, startOfMonth, startOfWeek, subMonths
} from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { orderService } from '@/app/services/orderService';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { OrderCard, OrderDetailsModal, Section } from '@/app/components/admin/DashboardComponents';
import type { AdminOrder, AdminOrderCardData, AdminOrderListItem } from '@/app/types/admin-order';
import styles from '../AdminDashboard.module.css';

type OrderUpdatePayload = { new: { id: string; status: string } };
type OrderInsertPayload = { new: { id: string } };
type OrderDeletePayload = { old: { id: string } };
const ORDERS_PAGE_LIMIT = 30;

function capOrders(orders: AdminOrderCardData[]) {
    return orders.slice(0, ORDERS_PAGE_LIMIT);
}

export default function AdminOrdersClient({ initialOrders }: { initialOrders: AdminOrderListItem[] }) {
    const { lang, t } = useAdminI18n();
    const locale = lang === 'uz' ? uz : ru;
    const [orders, setOrders] = useState<AdminOrderCardData[]>(initialOrders);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'inbox' | 'calendar'>('inbox');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedOrder, setSelectedOrder] = useState<AdminOrderCardData | null>(null);
    const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
    const [newOrderNotify, setNewOrderNotify] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await orderService.getOrderSummariesAdmin(60, ORDERS_PAGE_LIMIT);
        setOrders(capOrders(data || []));
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!newOrderNotify) return;
        const timer = setTimeout(() => setNewOrderNotify(false), 5000);
        return () => clearTimeout(timer);
    }, [newOrderNotify]);

    const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        const { error } = await orderService.updateOrderStatus(orderId, newStatus, true, lang);
        if (error) {
            alert(t('error') + ': ' + error.message);
            fetchData();
        }
    }, [fetchData, lang, t]);

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
        let updateTimeout: NodeJS.Timeout;

        const channel = supabase
            .channel('admin-orders-page')
            .on('postgres_changes', { event: 'INSERT', table: 'orders', schema: 'public' }, async (payload: OrderInsertPayload) => {
                setNewOrderNotify(true);
                const newOrder = await orderService.getOrderAdmin(payload.new.id);
                if (newOrder) setOrders(prev => capOrders([newOrder, ...prev]));
            })
            .on('postgres_changes', { event: 'UPDATE', table: 'orders', schema: 'public' }, (payload: OrderUpdatePayload) => {
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(async () => {
                    const updatedOrder = await orderService.getOrderAdmin(payload.new.id) as AdminOrder | null;
                    if (updatedOrder) {
                        updatedOrder.status = payload.new.status;
                        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                        setSelectedOrder(prev => prev?.id === updatedOrder.id ? updatedOrder : prev);
                    }
                }, 400);
            })
            .on('postgres_changes', { event: 'DELETE', table: 'orders', schema: 'public' }, (payload: OrderDeletePayload) => {
                setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            })
            .subscribe((_status: string, err: Error | null) => {
                if (err) console.error('[Realtime] Error:', err);
            });

        return () => {
            if (updateTimeout) clearTimeout(updateTimeout);
            supabase.removeChannel(channel);
        };
    }, [supabase]);

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

    const filteredByDate = useMemo(() => {
        if (viewMode !== 'calendar') return [];
        return orders.filter(o => isSameDay(new Date(o.delivery_time), selectedDate));
    }, [orders, selectedDate, viewMode]);

    return (
        <div className={styles.container}>
            {newOrderNotify && (
                <div className={styles.notification}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 600 }}>{t('newOrderAlert')}</span>
                    <button onClick={() => setNewOrderNotify(false)} className={styles.dismissBtn}>{t('close')}</button>
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
                            orders={orders}
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
                                    <OrderCard key={order.id} order={order} compact onUpdate={handleUpdateStatus} onSelect={handleSelectOrder} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

type AdminCalendarProps = {
    currentMonth: Date;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    orders: AdminOrderCardData[];
    lang: 'uz' | 'ru';
};

const AdminCalendar = memo(function AdminCalendar({ currentMonth, selectedDate, onSelectDate, orders, lang }: AdminCalendarProps) {
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const ordersByDay = useMemo(() => {
        const map = new Map<string, AdminOrder[]>();
        for (const o of orders) {
            const key = format(new Date(o.delivery_time), 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(o);
        }
        return map;
    }, [orders]);

    const getOrdersForDay = (date: Date) => ordersByDay.get(format(date, 'yyyy-MM-dd')) ?? [];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {(lang === 'uz' ? ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']).map(day => (
                <div key={day} style={{ textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
                const dayOrders = getOrdersForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentMonth));

                return (
                    <div
                        key={idx}
                        onClick={() => onSelectDate(day)}
                        style={{
                            aspectRatio: '1/1', padding: '4px', borderRadius: '12px', border: '1px solid #F3F4F6',
                            background: isSelected ? '#BE185D' : 'white', color: isSelected ? 'white' : isCurrentMonth ? '#111827' : '#D1D5DB',
                            cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <span style={{ fontSize: '14px', fontWeight: isSelected ? 800 : 500 }}>{format(day, 'd')}</span>
                        {dayOrders.length > 0 && !isSelected && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px', justifyContent: 'center', maxWidth: '36px' }}>
                                {dayOrders.slice(0, 10).map((o, i: number) => (
                                    <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: o.status === 'completed' ? '#BE185D' : '#F59E0B', flexShrink: 0 }} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
