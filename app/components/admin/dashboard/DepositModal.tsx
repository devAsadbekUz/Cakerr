'use client';

import { useState } from 'react';
import { Banknote, X, AlertTriangle } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    totalPrice: number;
    lang: 'uz' | 'ru';
    disabled?: boolean;
};

const copy = {
    uz: {
        title: "Qancha pul qabul qildingiz?",
        subtitle: "Buyurtmani tasdiqlash uchun qabul qilingan summani kiriting.",
        totalLabel: "Buyurtma jami:",
        minHint: (min: number) => `Tavsiya: kamida ${min.toLocaleString('en-US')} so'm (50%)`,
        inputLabel: "Qabul qilingan summa (so'm)",
        placeholder: "Masalan: 70 000",
        error: "Summa 0 dan katta bo'lishi kerak",
        cancel: "Bekor qilish",
        confirm: "Tasdiqlash",
        som: "so'm",
    },
    ru: {
        title: "Сколько денег получили?",
        subtitle: "Введите полученную сумму для подтверждения заказа.",
        totalLabel: "Итого заказ:",
        minHint: (min: number) => `Рекомендуется: минимум ${min.toLocaleString('en-US')} сум (50%)`,
        inputLabel: "Полученная сумма (сум)",
        placeholder: "Например: 70 000",
        error: "Сумма должна быть больше 0",
        cancel: "Отмена",
        confirm: "Подтвердить",
        som: "сум",
    },
};

export function DepositModal({ isOpen, onClose, onConfirm, totalPrice, lang, disabled }: Props) {
    const [rawValue, setRawValue] = useState('');
    const [touched, setTouched] = useState(false);

    const c = copy[lang];
    const amount = parseInt(rawValue.replace(/\D/g, ''), 10) || 0;
    const minRecommended = Math.ceil(totalPrice * 0.5);
    const hasError = touched && amount <= 0;

    const handleClose = () => {
        setRawValue('');
        setTouched(false);
        onClose();
    };

    const handleConfirm = () => {
        setTouched(true);
        if (amount <= 0) return;
        setRawValue('');
        setTouched(false);
        onConfirm(amount);
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
                    background: 'white', borderRadius: '20px', width: '100%', maxWidth: '420px',
                    padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Banknote size={22} color="#16A34A" />
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

                {/* Total reference */}
                <div style={{
                    background: totalPrice === 0 ? '#FFF7ED' : '#F9FAFB', 
                    borderRadius: '12px', padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', border: `1px solid ${totalPrice === 0 ? '#FDBA74' : '#E5E7EB'}`
                }}>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>{c.totalLabel}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#BE185D', fontVariantNumeric: 'tabular-nums' }}>
                        {totalPrice.toLocaleString('en-US')} {c.som}
                    </span>
                </div>

                {totalPrice === 0 && (
                    <div style={{ 
                        marginBottom: '16px', padding: '10px 12px', background: '#FEF2F2', 
                        border: '1px solid #FECACA', borderRadius: '10px', 
                        fontSize: '13px', color: '#991B1B', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <AlertTriangle size={16} />
                        {lang === 'uz' ? "Narx belgilanmagan. Avval narxni kiriting." : "Цена не установлена. Сначала установите цену."}
                    </div>
                )}

                {/* Input */}
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                        {c.inputLabel}
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={rawValue}
                        placeholder={c.placeholder}
                        onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setRawValue(digits);
                            if (touched) setTouched(false);
                        }}
                        onBlur={() => setTouched(true)}
                        style={{
                            width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize: '18px',
                            fontWeight: 700, border: `2px solid ${hasError ? '#EF4444' : '#E5E7EB'}`,
                            outline: 'none', boxSizing: 'border-box',
                            fontVariantNumeric: 'tabular-nums', color: '#111827'
                        }}
                        autoFocus
                    />
                    {hasError && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{c.error}</p>
                    )}
                    {!hasError && amount > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                            {c.minHint(minRecommended)}
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
                        disabled={disabled || amount <= 0 || totalPrice === 0}
                        style={{
                            flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                            background: (amount > 0 && totalPrice > 0) ? '#16A34A' : (totalPrice === 0 ? '#F3F4F6' : '#D1FAE5'),
                            color: (amount > 0 && totalPrice > 0) ? 'white' : (totalPrice === 0 ? '#9CA3AF' : '#6EE7B7'),
                            fontWeight: 800, fontSize: '14px',
                            cursor: (amount > 0 && totalPrice > 0) ? 'pointer' : 'not-allowed',
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
