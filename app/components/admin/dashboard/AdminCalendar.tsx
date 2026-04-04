'use client';

import React, { memo, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import type { AdminOrderCardData } from '@/app/types/admin-order';

type AdminCalendarProps = {
    currentMonth: Date;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    ordersByDay: Map<string, AdminOrderCardData[]>;
    lang: 'uz' | 'ru';
};

export const AdminCalendar = memo(function AdminCalendar({ 
    currentMonth, 
    selectedDate, 
    onSelectDate, 
    ordersByDay, 
    lang 
}: AdminCalendarProps) {
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const getOrdersForDay = (date: Date) => ordersByDay.get(format(date, 'yyyy-MM-dd')) ?? [];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {(lang === 'uz' ? ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']).map(day => (
                <div key={day} style={{ textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
                const dayOrders = getOrdersForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);

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
                        {dayOrders.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px', justifyContent: 'center', maxWidth: '36px' }}>
                                {dayOrders.slice(0, 10).map((o) => (
                                    <div 
                                        key={o.id} 
                                        style={{ 
                                            width: '4px', 
                                            height: '4px', 
                                            borderRadius: '50%', 
                                            background: o.status === 'completed' ? '#10B981' : o.status === 'cancelled' ? '#EF4444' : '#F59E0B', 
                                            flexShrink: 0 
                                        }} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
