'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    totalPrice: number;
    depositAmount: number;
    lang: 'uz' | 'ru';
    disabled?: boolean;
};

const copy = {
    uz: {
        title: "Yakuniy to'lovni kiriting",
        subtitle: "Mijozdan qabul qilingan qoldiq summani tasdiqlang.",
        totalLabel: "Buyurtma jami:",
        depositLabel: "Oldindan to'langan:",
        remainingLabel: "Qoldiq (to'lanishi kerak):",
        inputLabel: "Qabul qilingan summa (so'm)",
        errorMismatch: (expected: number) => `Summa aniq ${expected.toLocaleString('en-US')} so'm bo'lishi kerak`,
        cancel: "Bekor qilish",
        confirm: "Buyurtmani yakunlash",
        som: "so'm",
        zeroBadge: "To'liq to'langan",
    },
    ru: {
        title: "Введите итоговый платёж",
        subtitle: "Подтвердите остаток, полученный от клиента.",
        totalLabel: "Итого заказ:",
        depositLabel: "Уже оплачено:",
        remainingLabel: "Остаток (к оплате):",
        inputLabel: "Полученная сумма (сум)",
        errorMismatch: (expected: number) => `Сумма должна быть ровно ${expected.toLocaleString('en-US')} сум`,
        cancel: "Отмена",
        confirm: "Завершить заказ",
        som: "сум",
        zeroBadge: "Полностью оплачено",
    },
};

export function FinalPaymentModal({ isOpen, onClose, onConfirm, totalPrice, depositAmount, lang, disabled }: Props) {
    const c = copy[lang];
    const remaining = Math.max(0, totalPrice - depositAmount);
    const [rawValue, setRawValue] = useState(String(remaining));
    const [touched, setTouched] = useState(false);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setRawValue(String(remaining));
            setTouched(false);
        }
    }, [isOpen, remaining]);

    const amount = parseInt(rawValue.replace(/\D/g, ''), 10);
    const isMatch = !isNaN(amount) && amount === remaining;
    const hasError = touched && !isMatch;

    const handleClose = () => {
        setRawValue(String(remaining));
        setTouched(false);
        onClose();
    };

    const handleConfirm = () => {
        setTouched(true);
        if (!isMatch) return;
        onConfirm(amount);
        setRawValue(String(remaining));
        setTouched(false);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px'
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    background: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px',
                    padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckCircle2 size={22} color="#2563EB" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>{c.title}</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280' }}>{c.subtitle}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Payment breakdown */}
                <div style={{
                    background: '#F9FAFB', borderRadius: '12px', padding: '14px 16px',
                    marginBottom: '20px', border: '1px solid #E5E7EB',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
                        <span>{c.totalLabel}</span>
                        <span style={{ fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            {totalPrice.toLocaleString('en-US')} {c.som}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
                        <span>{c.depositLabel}</span>
                        <span style={{ fontWeight: 700, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                            -{depositAmount.toLocaleString('en-US')} {c.som}
                        </span>
                    </div>
                    <div style={{ height: '1px', background: '#E5E7EB', margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{c.remainingLabel}</span>
                        {remaining === 0 ? (
                            <span style={{
                                background: '#D1FAE5', color: '#065F46', padding: '2px 10px',
                                borderRadius: '6px', fontSize: '12px', fontWeight: 700
                            }}>
                                {c.zeroBadge}
                            </span>
                        ) : (
                            <span style={{ fontWeight: 800, color: '#BE185D', fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
                                {remaining.toLocaleString('en-US')} {c.som}
                            </span>
                        )}
                    </div>
                </div>

                {/* Input */}
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                        {c.inputLabel}
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={rawValue}
                        onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setRawValue(digits);
                            if (touched) setTouched(false);
                        }}
                        onBlur={() => setTouched(true)}
                        style={{
                            width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize: '18px',
                            fontWeight: 700, border: `2px solid ${hasError ? '#EF4444' : isMatch ? '#16A34A' : '#E5E7EB'}`,
                            outline: 'none', boxSizing: 'border-box',
                            fontVariantNumeric: 'tabular-nums', color: '#111827'
                        }}
                        autoFocus
                    />
                    {hasError && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                            {c.errorMismatch(remaining)}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                        onClick={handleClose}
                        disabled={disabled}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E5E7EB',
                            background: 'white', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
                        }}
                    >
                        {c.cancel}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={disabled || !isMatch}
                        style={{
                            flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                            background: isMatch ? '#2563EB' : '#DBEAFE',
                            color: isMatch ? 'white' : '#93C5FD',
                            fontWeight: 800, fontSize: '14px',
                            cursor: isMatch ? 'pointer' : 'not-allowed',
                            transition: 'background 0.15s'
                        }}
                    >
                        {c.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
