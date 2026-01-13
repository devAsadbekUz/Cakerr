'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, isPast
} from 'date-fns';
import styles from './CalendarModal.module.css';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    selectedDate?: Date;
    overrides?: any[];
}

const MONTHS = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];

export default function CalendarModal({ isOpen, onClose, onSelect, selectedDate, overrides }: CalendarModalProps) {
    const [viewDate, setViewDate] = useState(new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isOpen) return null;

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    // Generate a fixed 42-cell grid (6 rows of 7 days)
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // If the interval resulted in 35 days (5 rows), add another week to keep layout consistent
    if (calendarDays.length < 42) {
        const extraStartDate = new Date(calendarDays[calendarDays.length - 1]);
        extraStartDate.setDate(extraStartDate.getDate() + 1);
        const extraEndDate = new Date(extraStartDate);
        extraEndDate.setDate(extraEndDate.getDate() + (41 - calendarDays.length));

        calendarDays.push(...eachDayOfInterval({ start: extraStartDate, end: extraEndDate }));
    }

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (date: Date) => {
        onSelect(date);
        onClose();
    };

    const isDateSelected = (date: Date) => {
        return selectedDate && isSameDay(date, selectedDate);
    };

    const isDateToday = (date: Date) => {
        return isSameDay(date, today);
    };

    const getDayStatus = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOverrides = overrides?.filter(o => o.date === dateStr) || [];
        if (dayOverrides.some(o => o.slot === null)) return 'blocked';
        if (dayOverrides.length > 0) return 'partial';
        return 'open';
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2 className={styles.monthTitle}>
                        {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </h2>
                    <div className={styles.navGroup}>
                        <button className={styles.navBtn} onClick={prevMonth}>
                            <ChevronLeft size={22} />
                        </button>
                        <button className={styles.navBtn} onClick={nextMonth}>
                            <ChevronRight size={22} />
                        </button>
                    </div>
                </header>

                <div className={styles.weekdays}>
                    {WEEKDAYS.map(day => (
                        <div key={day} className={styles.weekday}>{day}</div>
                    ))}
                </div>

                <div className={styles.daysGrid}>
                    {calendarDays.map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isSelected = isDateSelected(day);
                        const isToday = isDateToday(day);
                        const status = getDayStatus(day);
                        const disabled = (isPast(day) && !isToday) || (status === 'blocked' && isCurrentMonth);

                        return (
                            <button
                                key={idx}
                                className={`
                                    ${styles.dayBtn} 
                                    ${!isCurrentMonth ? styles.otherMonth : ''} 
                                    ${isToday ? styles.today : ''} 
                                    ${isSelected ? styles.selected : ''}
                                    ${status === 'blocked' && isCurrentMonth ? styles.blocked : ''}
                                `}
                                onClick={() => isCurrentMonth && !disabled && handleDateSelect(day)}
                                disabled={!isCurrentMonth || disabled}
                            >
                                {format(day, 'd')}
                                {isCurrentMonth && status === 'blocked' && !isSelected && (
                                    <div className={`${styles.dot} ${styles.dotBlocked}`} />
                                )}
                                {isCurrentMonth && status === 'partial' && !isSelected && (
                                    <div className={`${styles.dot} ${styles.dotPartial}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
