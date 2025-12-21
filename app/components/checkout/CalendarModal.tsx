'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './CalendarModal.module.css';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    selectedDate?: Date;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'];

export default function CalendarModal({ isOpen, onClose, onSelect, selectedDate }: CalendarModalProps) {
    const [viewDate, setViewDate] = useState(new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isOpen) return null;

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    // Adjust for Monday start (JS default is Sunday)
    const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const prevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleDateSelect = (day: number) => {
        const date = new Date(currentYear, currentMonth, day);
        onSelect(date);
        onClose();
    };

    const isToday = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        return d.getTime() === today.getTime();
    };

    const isSelected = (day: number) => {
        if (!selectedDate) return false;
        const d = new Date(currentYear, currentMonth, day);
        return d.toDateString() === selectedDate.toDateString();
    };

    const isPast = (day: number) => {
        const d = new Date(currentYear, currentMonth, day);
        return d < today;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <button className={styles.navBtn} onClick={prevMonth}>
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className={styles.monthTitle}>
                        {MONTHS[currentMonth]} {currentYear}
                    </h2>
                    <button className={styles.navBtn} onClick={nextMonth}>
                        <ChevronRight size={24} />
                    </button>
                </header>

                <div className={styles.weekdays}>
                    {WEEKDAYS.map(day => (
                        <div key={day} className={styles.weekday}>{day}</div>
                    ))}
                </div>

                <div className={styles.daysGrid}>
                    {[...Array(startingDay)].map((_, i) => (
                        <div key={`empty-${i}`} className={styles.empty} />
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        return (
                            <button
                                key={day}
                                className={`
                                    ${styles.dayBtn} 
                                    ${isToday(day) ? styles.today : ''} 
                                    ${isSelected(day) ? styles.selected : ''}
                                `}
                                disabled={isPast(day)}
                                onClick={() => handleDateSelect(day)}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
