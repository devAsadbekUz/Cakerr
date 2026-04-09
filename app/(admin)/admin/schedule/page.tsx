'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Calendar as CalendarIcon, Clock,
    CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Ban,
    Plus, Trash2, Settings2, GripVertical
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { availabilityService, GlobalTimeSlot } from '@/app/services/availabilityService';
import { uz, ru } from 'date-fns/locale';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from '../AdminDashboard.module.css';
import s from './Schedule.module.css';

export default function SchedulePage() {
    const { lang, t } = useAdminI18n();
    const localeSelection = lang === 'uz' ? uz : ru;
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [overrides, setOverrides] = useState<any[]>([]);
    const [globalSlots, setGlobalSlots] = useState<GlobalTimeSlot[]>([]);
    const [loading, setLoading] = useState(true);

    // New slot input state
    const [newSlotLabel, setNewSlotLabel] = useState('');
    const [addingSlot, setAddingSlot] = useState(false);
    const [slotError, setSlotError] = useState('');

    // Drag-and-drop state
    const dragIndex = useRef<number | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    // ─── Fetch functions ──────────────────────────────────────────────────────
    const fetchGlobalSlots = useCallback(async () => {
        const slots = await availabilityService.getGlobalSlots();
        setGlobalSlots(slots);
    }, []);

    const fetchOverrides = useCallback(async (month: Date) => {
        try {
            const start = format(startOfMonth(month), 'yyyy-MM-dd');
            const end = format(endOfMonth(month), 'yyyy-MM-dd');
            const data = await availabilityService.getOverrides(start, end);
            setOverrides(data || []);
        } catch (error) {
            console.error('Error fetching overrides:', error);
        }
    }, []);

    // On mount: fetch both in parallel
    useEffect(() => {
        Promise.all([
            fetchGlobalSlots(),
            fetchOverrides(currentMonth),
        ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When month changes: only re-fetch overrides
    useEffect(() => {
        fetchOverrides(currentMonth);
    }, [currentMonth, fetchOverrides]);

    // ─── Global Slot Handlers ─────────────────────────────────────────────────
    const validateSlotLabel = useCallback((label: string): string => {
        const trimmed = label.trim();
        if (!trimmed) return t('timeEmptyError');
        const pattern = /^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/;
        if (!pattern.test(trimmed)) return t('timeFormatError');
        return '';
    }, [t]);

    const handleAddSlot = useCallback(async () => {
        const error = validateSlotLabel(newSlotLabel);
        if (error) { setSlotError(error); return; }

        const normalized = newSlotLabel.trim().replace(/\s*[-–]\s*/, ' - ');
        if (globalSlots.some(s => s.label === normalized)) {
            setSlotError(t('timeExistsError'));
            return;
        }

        setAddingSlot(true);
        setSlotError('');
        try {
            // Pass current max order so service skips the extra SELECT
            const maxOrder = globalSlots.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0);
            const newSlot = await availabilityService.addGlobalSlot(normalized, maxOrder);
            // Append locally — no refetch
            setGlobalSlots(prev => [...prev, newSlot]);
            setNewSlotLabel('');
        } catch (err: any) {
            setSlotError(err.message || t('error'));
        } finally {
            setAddingSlot(false);
        }
    }, [newSlotLabel, globalSlots, validateSlotLabel, t]);

    const handleDeleteSlot = useCallback(async (id: string, label: string) => {
        if (!confirm(t('confirmDeleteSlot').replace('{label}', label))) return;
        // Optimistic removal
        setGlobalSlots(prev => prev.filter(s => s.id !== id));
        try {
            await availabilityService.deleteGlobalSlot(id);
        } catch (err: any) {
            // Restore on failure
            await fetchGlobalSlots();
            alert(`${t('error')}: ${err.message || t('unknown')}`);
        }
    }, [t, fetchGlobalSlots]);

    // ─── Drag Handlers ────────────────────────────────────────────────────────
    const handleDragStart = useCallback((index: number, id: string) => {
        dragIndex.current = index;
        setDraggingId(id);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex.current === null || dragIndex.current === index) return;

        setGlobalSlots(prev => {
            const reordered = [...prev];
            const [moved] = reordered.splice(dragIndex.current!, 1);
            reordered.splice(index, 0, moved);
            dragIndex.current = index;
            return reordered;
        });
    }, []);

    const handleDrop = useCallback(async () => {
        setDraggingId(null);
        dragIndex.current = null;
        try {
            await availabilityService.reorderGlobalSlots(globalSlots.map(s => s.id));
        } catch (err) {
            console.error('Failed to save order:', err);
            await fetchGlobalSlots(); // Revert on error
        }
    }, [globalSlots, fetchGlobalSlots]);

    // ─── Per-date Override Handler ────────────────────────────────────────────
    const handleToggleSlot = useCallback(async (slot: string | null) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        try {
            const result = await availabilityService.toggleSlot(dateStr, slot);
            // Update overrides locally — no refetch
            if (result.action === 'removed') {
                setOverrides(prev => prev.filter(o => !(
                    o.date === dateStr &&
                    (slot === null ? o.slot === null : o.slot === slot)
                )));
            } else {
                setOverrides(prev => [...prev, {
                    id: result.id,
                    date: dateStr,
                    slot,
                    is_available: false,
                }]);
            }
        } catch (error: any) {
            console.error('Toggle error:', error);
            alert(`${t('error')}: ${error.message || t('unknown')}`);
        }
    }, [selectedDate, t]);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOverrides = overrides.filter(o => o.date === dateStr);
    const isDayBlocked = dayOverrides.some(o => o.slot === null);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{t('timeManagement')}</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>{t('timeManagementDesc')}</p>
            </header>

            {/* ═══════════════════ GLOBAL SLOTS MANAGER ═══════════════════ */}
            <div className={s.globalSettingsCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Settings2 size={18} color="#BE185D" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                            {t('globalTimeSettings')}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, marginTop: '2px' }}>
                            {t('globalTimeSettingsDesc')}
                        </p>
                    </div>
                </div>

                {/* Existing slots list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {globalSlots.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '14px' }}>
                            {t('noTimeSlots')}
                        </div>
                    )}
                    {globalSlots.map((slot, index) => (
                        <div
                            key={slot.id}
                            draggable
                            onDragStart={() => handleDragStart(index, slot.id)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={handleDrop}
                            onDragEnd={() => { setDraggingId(null); dragIndex.current = null; }}
                            className={s.slotItem}
                            style={{
                                border: `1.5px solid ${draggingId === slot.id ? '#BE185D' : '#F3F4F6'}`,
                                background: draggingId === slot.id ? '#FDF2F8' : '#FAFAFA',
                                opacity: draggingId === slot.id ? 0.6 : 1,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GripVertical size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                                <Clock size={16} color="#BE185D" />
                                <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>
                                    {slot.label}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDeleteSlot(slot.id, slot.label)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#9CA3AF',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s',
                                }}
                                title={t('delete')}
                                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add new slot */}
                <div className={s.addSlotRow}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            value={newSlotLabel}
                            onChange={e => { setNewSlotLabel(e.target.value); setSlotError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleAddSlot()}
                            placeholder='Masalan: "07:00 - 09:00"'
                            style={{
                                width: '100%',
                                padding: '13px 16px',
                                border: `1.5px solid ${slotError ? '#EF4444' : '#E5E7EB'}`,
                                borderRadius: '12px',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                                fontFamily: 'inherit'
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#BE185D')}
                            onBlur={e => (e.currentTarget.style.borderColor = slotError ? '#EF4444' : '#E5E7EB')}
                        />
                        {slotError && (
                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', marginLeft: '4px' }}>
                                {slotError}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleAddSlot}
                        disabled={addingSlot}
                        className={s.addBtn}
                        style={{
                            padding: '13px 20px',
                            borderRadius: '12px',
                            background: addingSlot ? '#E5E7EB' : '#BE185D',
                            color: addingSlot ? '#9CA3AF' : 'white',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: addingSlot ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit'
                        }}
                    >
                        <Plus size={16} />
                        {addingSlot ? t('adding') : t('add')}
                    </button>
                </div>
            </div>

            {/* ═══════════════════ PER-DATE CALENDAR ═══════════════════ */}
            <div className={styles.calendarView}>
                <div className={styles.calendarContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{format(currentMonth, 'MMMM yyyy', { locale: localeSelection })}</h2>
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
                        lang={lang}
                        locale={localeSelection}
                    />
                </div>

                <div className={styles.dayDetails}>
                    <div className={s.dayDetailsCard}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarIcon size={20} color="#BE185D" />
                            {format(selectedDate, 'd-MMMM', { locale: localeSelection })} - {t('statusLabel')}
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
                                {isDayBlocked ? t('reopenDay') : t('closeWholeDay')}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {t('timeSlotsTitle')}
                            </p>

                            {loading ? (
                                <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                                    {t('loading')}
                                </div>
                            ) : globalSlots.length === 0 ? (
                                <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                                    {t('globalAdminNote')}
                                </div>
                            ) : (
                                globalSlots.map(slot => {
                                    const isBlocked = isDayBlocked || dayOverrides.some(o => o.slot === slot.label);
                                    return (
                                        <div
                                            key={slot.id}
                                            onClick={() => !isDayBlocked && handleToggleSlot(slot.label)}
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
                                                <span style={{ fontWeight: 600, color: isBlocked ? '#9CA3AF' : '#111827' }}>
                                                    {slot.label}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isBlocked ? (
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '4px 8px', borderRadius: '6px' }}>{t('closed')}</span>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 700, background: '#F0FDF4', padding: '4px 8px', borderRadius: '6px' }}>{t('openStatus')}</span>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
            )}
                        </div>

                        {isDayBlocked && (
                            <div style={{ marginTop: '20px', padding: '12px', background: '#FFF7ED', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <AlertCircle size={16} color="#FB923C" style={{ marginTop: '2px' }} />
                                <p style={{ fontSize: '12px', color: '#9A3412', margin: 0 }}>
                                    {t('blockedDayNote')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScheduleCalendar({ currentMonth, selectedDate, onSelectDate, overrides, lang, locale }: any) {
    // Compute calendar days only when the month changes
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    // Pre-build a map of dateStr → overrides[] so getDayState is O(1)
    const overridesByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const o of overrides) {
            const existing = map.get(o.date);
            if (existing) existing.push(o);
            else map.set(o.date, [o]);
        }
        return map;
    }, [overrides]);

    const monthStartRef = startOfMonth(currentMonth);

    const getDayState = (dateStr: string) => {
        const dayOverrides = overridesByDate.get(dateStr) ?? [];
        if (dayOverrides.some((o: any) => o.slot === null)) return 'blocked';
        if (dayOverrides.length > 0) return 'partial';
        return 'open';
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {(lang === 'uz' ? ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']).map(day => (
                <div key={day} style={{ textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const state = getDayState(dateStr);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameDay(startOfMonth(day), monthStartRef);

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
                        <span style={{ fontSize: '14px', fontWeight: isSelected ? 800 : 600 }}>{format(day, 'd', { locale })}</span>
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
