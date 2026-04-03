'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Tag, Percent, 
    ArrowRight, Check, X, ShieldCheck, 
    Users, Globe, ShoppingBag 
} from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { format } from 'date-fns';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

interface PromoCode {
    id: string;
    code: string;
    discount_amount: number;
    uses_per_user: number;
    max_global_uses: number | null;
    is_first_order_only: boolean;
    min_order_amount: number;
    total_uses: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

export default function PromoCodesManager() {
    const { t } = useAdminI18n();
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [newPromo, setNewPromo] = useState({
        code: '',
        discount_amount: 0,
        uses_per_user: 1,
        max_global_uses: '',
        is_first_order_only: false,
        min_order_amount: 0,
        expires_at: ''
    });

    const fetchPromos = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/promos');
            const data = await res.json();
            if (data.promos) setPromos(data.promos);
        } catch (error) {
            console.error('Failed to fetch promos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromos();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/promos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPromo)
            });
            if (res.ok) {
                setIsAdding(false);
                setNewPromo({
                    code: '',
                    discount_amount: 0,
                    uses_per_user: 1,
                    max_global_uses: '',
                    is_first_order_only: false,
                    min_order_amount: 0,
                    expires_at: ''
                });
                fetchPromos();
            }
        } catch (error) {
            console.error('Failed to create promo:', error);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/admin/promos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !current })
            });
            if (res.ok) fetchPromos();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDeletePromo') || 'Ushbu promokodni o\'chirmoqchimisiz?')) return;
        try {
            const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
            if (res.ok) fetchPromos();
        } catch (error) {
            console.error('Failed to delete promo:', error);
        }
    };

    return (
        <section className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tag size={24} color="hsl(var(--color-primary-dark))" />
                        {t('promoTitle') || 'Promokodlar'}
                    </h2>
                    <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '14px' }}>
                        {t('promoSubtitle') || 'Chegirma kodlari va marketing kampaniyalari.'}
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{ 
                        background: isAdding ? '#F3F4F6' : 'hsl(var(--color-primary-dark))', 
                        color: isAdding ? '#374151' : 'white', 
                        border: 'none', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontWeight: 600, 
                        cursor: 'pointer' 
                    }}
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />}
                    {isAdding ? t('cancel') : t('addPromo') || 'Yangi promokod'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleCreate} style={{ 
                    background: '#F9FAFB', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    marginBottom: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    border: '1px solid #F3F4F6'
                }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{t('addPromo') || 'Yangi promokod yaratish'}</h3>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>{t('promoCode') || 'Kod'}</label>
                        <input
                            type="text"
                            required
                            placeholder={t('promoPlaceholder') || 'MASALAN: TORT2025'}
                            value={newPromo.code}
                            onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontWeight: 600 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>{t('discountAmount') || 'Chegirma miqdori (UZS)'}</label>
                        <input
                            type="number"
                            required
                            min="1000"
                            step="1000"
                            value={newPromo.discount_amount || ''}
                            onChange={e => setNewPromo({ ...newPromo, discount_amount: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>{t('minOrder') || 'Minimal buyurtma'}</label>
                        <input
                            type="number"
                            min="0"
                            step="5000"
                            value={newPromo.min_order_amount || ''}
                            onChange={e => setNewPromo({ ...newPromo, min_order_amount: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>{t('maxGlobal') || 'Jami limit'}</label>
                        <input
                            type="number"
                            placeholder="Cheksiz"
                            value={newPromo.max_global_uses || ''}
                            onChange={e => setNewPromo({ ...newPromo, max_global_uses: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>{t('usesPerUser') || 'Har bir kishi uchun'}</label>
                        <input
                            type="number"
                            min="1"
                            value={newPromo.uses_per_user || ''}
                            onChange={e => setNewPromo({ ...newPromo, uses_per_user: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                        <input
                            type="checkbox"
                            id="firstOrder"
                            checked={newPromo.is_first_order_only}
                            onChange={e => setNewPromo({ ...newPromo, is_first_order_only: e.target.checked })}
                            style={{ width: '18px', height: '18px', accentColor: '#BE185D' }}
                        />
                        <label htmlFor="firstOrder" style={{ fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                            {t('isFirstOrder') || 'Faqat birinchi buyurtma'}
                        </label>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '6px', display: 'block' }}>Muddati (End of day)</label>
                        <input
                            type="date"
                            value={newPromo.expires_at}
                            onChange={e => {
                                const date = e.target.value;
                                if (date) {
                                    // Set to 23:59:59 of that day
                                    const expiryDate = new Date(`${date}T23:59:59`);
                                    setNewPromo({ ...newPromo, expires_at: expiryDate.toISOString() });
                                } else {
                                    setNewPromo({ ...newPromo, expires_at: '' });
                                }
                            }}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                        <button
                            type="submit"
                            style={{ 
                                background: '#BE185D', 
                                color: 'white', 
                                border: 'none', 
                                padding: '12px 24px', 
                                borderRadius: '10px', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <ShieldCheck size={18} />
                            {t('save') || 'Saqlash va faollashtirish'}
                        </button>
                    </div>
                </form>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>{t('promoCode') || 'KOD'}</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>{t('discountAmount') || 'CHEGIRMA'}</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>HLIMITLAR</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>MUDDATI</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>{t('totalUses') || 'FOYDALANILGAN'}</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>{t('statusLabel') || 'HOLATI'}</th>
                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>{t('actions') || 'AMALLAR'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>{t('loading')}</td>
                            </tr>
                        ) : promos.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>{t('noData')}</td>
                            </tr>
                        ) : (
                            promos.map(promo => (
                                <tr key={promo.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ background: '#FCE7F3', color: '#BE185D', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px' }}>
                                                {promo.code}
                                            </div>
                                            {promo.is_first_order_only && (
                                                <div title="Birinchi buyurtma" style={{ color: '#F59E0B' }}><ShieldCheck size={16} /></div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ fontWeight: 700, color: '#111827' }}>-{promo.discount_amount.toLocaleString()} UZS</span>
                                        {promo.min_order_amount > 0 && (
                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>Min: {promo.min_order_amount.toLocaleString()}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
                                                <Users size={12} /> {promo.uses_per_user}x kishi boshiga
                                            </div>
                                            {promo.max_global_uses && (
                                                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
                                                    <Globe size={12} /> max {promo.max_global_uses} jami
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {promo.expires_at ? (
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: new Date(promo.expires_at) < new Date() ? '#EF4444' : '#4B5563',
                                                fontWeight: new Date(promo.expires_at) < new Date() ? 700 : 500
                                            }}>
                                                {format(new Date(promo.expires_at), 'dd.MM.yyyy')}
                                                {new Date(promo.expires_at) < new Date() && (
                                                    <div style={{ fontSize: '10px' }}>MUDDATI O'TGAN</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Cheksiz</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ flex: 1, height: '6px', background: '#F3F4F6', borderRadius: '3px', position: 'relative', width: '100px' }}>
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    left: 0, 
                                                    top: 0, 
                                                    height: '100%', 
                                                    background: '#BE185D', 
                                                    borderRadius: '3px',
                                                    width: promo.max_global_uses ? `${Math.min(100, (promo.total_uses / promo.max_global_uses) * 100)}%` : '0%'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{promo.total_uses}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button 
                                            onClick={() => toggleActive(promo.id, promo.is_active)}
                                            style={{ 
                                                background: promo.is_active ? '#ECFDF5' : '#FEF2F2', 
                                                color: promo.is_active ? '#059669' : '#EF4444', 
                                                border: 'none', 
                                                padding: '6px 12px', 
                                                borderRadius: '20px', 
                                                fontSize: '12px', 
                                                fontWeight: 700, 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {promo.is_active ? <Check size={14} /> : <X size={14} />}
                                            {promo.is_active ? (t('promoActive') || 'Faol') : (t('promoInactive') || 'Nofaol')}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button 
                                            onClick={() => handleDelete(promo.id)}
                                            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
                                            className={styles.deleteBtn}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
