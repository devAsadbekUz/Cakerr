'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
    ShoppingBag, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import { orderService } from '@/app/services/orderService';
import { format, isToday, isTomorrow, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { uz, ru } from 'date-fns/locale';
import { createClient } from '@/app/utils/supabase/client';
import styles from '../AdminDashboard.module.css';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { Section, OrderCard, OrderDetailsModal } from '@/app/components/admin/DashboardComponents';

export default function AdminOrdersPage() {
    const { lang, t } = useAdminI18n();
    const locale = lang === 'uz' ? uz : ru;
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'inbox' | 'calendar'>('inbox');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [newOrderNotify, setNewOrderNotify] = useState(false);
    const [mounted, setMounted] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await orderService.getAllOrdersAdmin(60);
        setOrders(data || []);
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
    }, [lang, t, fetchData]);

    const handleSelectOrder = useCallback((order: any) => setSelectedOrder(order), []);
    const handleCloseModal = useCallback(() => setSelectedOrder(null), []);
    const handleModalUpdate = useCallback((id: string, status: string) => {
        handleUpdateStatus(id, status);
        setSelectedOrder((prev: any) => prev ? { ...prev, status } : null);
    }, [handleUpdateStatus]);

    useEffect(() => {
        setMounted(true);
        fetchData();

        let updateTimeout: NodeJS.Timeout;

        const channel = supabase
            .channel('admin-orders-page')
            .on('postgres_changes', { event: 'INSERT', table: 'orders', schema: 'public' }, async (payload: { new: { id: string } }) => {
                setNewOrderNotify(true);
                const newOrder = await orderService.getOrderAdmin(payload.new.id);
                if (newOrder) setOrders(prev => [newOrder, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', table: 'orders', schema: 'public' }, (payload: { new: { id: string; status: string } }) => {
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(async () => {
                    const updatedOrder = await orderService.getOrderAdmin(payload.new.id);
                    if (updatedOrder) {
                        // Enforce status from realtime payload to prevent ghosting on stale fetch
                        updatedOrder.status = payload.new.status;
                        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                        setSelectedOrder((prev: any) => prev?.id === updatedOrder.id ? updatedOrder : prev);
                    }
                }, 400);
            })
            .on('postgres_changes', { event: 'DELETE', table: 'orders', schema: 'public' }, (payload: { old: { id: string } }) => {
                setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            })
            .subscribe((_status: string, err: Error | null) => {
                if (err) console.error('[Realtime] Error:', err);
            });

        return () => {
            if (updateTimeout) clearTimeout(updateTimeout);
            supabase.removeChannel(channel);
        };
    }, [fetchData, supabase]);


    // Memoize active orders filtering
    const activeOrders = useMemo(() =>
        orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'),
        [orders]
    );

    // Memoize grouped orders
    const groupedOrders = useMemo(() => {
        return activeOrders.reduce((groups: any, order) => {
            const date = format(new Date(order.delivery_time), 'yyyy-MM-dd');
            if (!groups[date]) groups[date] = [];
            groups[date].push(order);
            return groups;
        }, {});
    }, [activeOrders]);

    const sortedDates = useMemo(() => Object.keys(groupedOrders).sort(), [groupedOrders]);

    const filteredByDate = useMemo(() =>
        orders.filter(o => isSameDay(new Date(o.delivery_time), selectedDate)),
        [orders, selectedDate]
    );

    if (!mounted) return null;

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
                        onClick={() => { setLoading(true); fetchData(); }} 
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
                                    {dayOrders.map((order: any) => (
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

const AdminCalendar = memo(function AdminCalendar({ currentMonth, selectedDate, onSelectDate, orders, lang }: any) {
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const ordersByDay = useMemo(() => {
        const map = new Map<string, any[]>();
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
                                {dayOrders.slice(0, 10).map((o: any, i: number) => (
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
