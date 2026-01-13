'use client';

import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Clock, XCircle,
    CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Ban
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { availabilityService } from '@/app/services/availabilityService';
import styles from '../AdminDashboard.module.css';

const TIME_SLOTS = [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 19:00',
    '19:00 - 21:00'
];

export default function SchedulePage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [overrides, setOverrides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchOverrides = async () => {
        try {
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            const data = await availabilityService.getOverrides(start, end);
            setOverrides(data || []);
        } catch (error) {
            console.error('Error fetching overrides:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchOverrides();
    }, [currentMonth]);

    const handleToggleSlot = async (slot: string | null) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            await availabilityService.toggleSlot(dateStr, slot);
            await fetchOverrides(); // Refresh
        } catch (error: any) {
            console.error('Toggle error:', error);
            alert(`Xatolik: ${error.message || 'Noma\'lum xato'}`);
        }
    };

    if (!mounted) return null;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOverrides = overrides.filter(o => o.date === dateStr);
    const isDayBlocked = dayOverrides.some(o => o.slot === null);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Vaqt Boshqaruvi</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>Ish vaqtlari va yetkazib berish slotlarini sozlang.</p>
            </header>

            <div className={styles.calendarView}>
                <div className={styles.calendarContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{format(currentMonth, 'MMMM yyyy')}</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={styles.modalClose}><ChevronLeft size={20} /></button>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={styles.modalClose}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <ScheduleCalendar
                        currentMonth={currentMonth}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        overrides={overrides}
                    />
                </div>

                <div className={styles.dayDetails}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #E5E7EB' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarIcon size={20} color="#BE185D" />
                            {format(selectedDate, 'd-MMMM')} - Holati
                        </h2>

                        <div style={{ marginBottom: '24px' }}>
                            <button
                                onClick={() => handleToggleSlot(null)}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: isDayBlocked ? '#FEF2F2' : '#F3F4F6',
                                    color: isDayBlocked ? '#EF4444' : '#374151',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isDayBlocked ? <CheckCircle2 size={20} /> : <Ban size={20} />}
                                {isDayBlocked ? "Kunning yopilishini bekor qilish" : "Butun kunni yopish"}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>Vaqt oraliqlari</p>
                            {TIME_SLOTS.map(slot => {
                                const isBlocked = isDayBlocked || dayOverrides.some(o => o.slot === slot);
                                return (
                                    <div
                                        key={slot}
                                        onClick={() => !isDayBlocked && handleToggleSlot(slot)}
                                        className={isBlocked ? styles.slotBlocked : ''}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '16px',
                                            background: isBlocked ? '#F9FAFB' : 'white',
                                            border: `1px solid ${isBlocked ? '#E5E7EB' : '#F3F4F6'}`,
                                            borderRadius: '16px',
                                            cursor: isDayBlocked ? 'not-allowed' : 'pointer',
                                            opacity: isDayBlocked ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Clock size={18} color={isBlocked ? '#9CA3AF' : '#BE185D'} />
                                            <span style={{
                                                fontWeight: 600,
                                                color: isBlocked ? '#9CA3AF' : '#111827',
                                            }}>{slot}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isBlocked ? (
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '4px 8px', borderRadius: '6px' }}>Yopilgan</span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, background: '#F0FDF4', padding: '4px 8px', borderRadius: '6px' }}>Ochiq</span>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {isDayBlocked && (
                            <div style={{ marginTop: '20px', padding: '12px', background: '#FFF7ED', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <AlertCircle size={16} color="#FB923C" style={{ marginTop: '2px' }} />
                                <p style={{ fontSize: '12px', color: '#9A3412', margin: 0 }}>
                                    Butun kun yopilgan holatda alohida vaqt oraliqlarini boshqarib bo'lmaydi.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScheduleCalendar({ currentMonth, selectedDate, onSelectDate, overrides }: any) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayState = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOverrides = overrides.filter((o: any) => o.date === dateStr);
        if (dayOverrides.some((o: any) => o.slot === null)) return 'blocked';
        if (dayOverrides.length > 0) return 'partial';
        return 'open';
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map(day => (
                <div key={day} style={{ textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
                const state = getDayState(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentMonth));

                return (
                    <div
                        key={idx}
                        onClick={() => onSelectDate(day)}
                        style={{
                            aspectRatio: '1/1', padding: '4px', borderRadius: '16px', border: '1px solid #F3F4F6',
                            background: isSelected ? '#BE185D' : 'white',
                            color: isSelected ? 'white' : isCurrentMonth ? '#111827' : '#D1D5DB',
                            cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '14px', fontWeight: isSelected ? 800 : 600 }}>{format(day, 'd')}</span>
                        {state === 'blocked' && !isSelected && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                        )}
                        {state === 'partial' && !isSelected && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: '#FB923C' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
