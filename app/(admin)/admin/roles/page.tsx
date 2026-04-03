'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Save, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

const ALL_PAGES = [
    { slug: 'dashboard',   label: 'Dashboard' },
    { slug: 'orders',      label: 'Buyurtmalar' },
    { slug: 'products',    label: 'Mahsulotlar' },
    { slug: 'categories',  label: 'Kategoriyalar' },
    { slug: 'schedule',    label: 'Ish vaqti' },
    { slug: 'custom',      label: 'Maxsus buyurtmalar' },
    { slug: 'loyalty',     label: 'Sodiqlik tizimi' },
    { slug: 'messages',    label: 'Xabarlar' },
    { slug: 'settings',    label: 'Sozlamalar' },
];

type StaffUser = {
    id: string;
    username: string;
    permissions: string[];
    created_at: string;
    last_login_at?: string;
};

export default function RolesPage() {
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
    const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [showPw, setShowPw] = useState(false);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/staff');
            const data = await res.json();
            setStaffList(data.staff || []);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    function flash(msg: string, isError = false) {
        if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
        else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
    }

    function togglePerm(slug: string) {
        setPermissions(prev => prev.includes(slug) ? prev.filter(p => p !== slug) : [...prev, slug]);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!username.trim()) return flash('Username kiriting', true);
        if (password.length < 6) return flash('Parol kamida 6 ta belgi bo\'lishi kerak', true);
        if (permissions.length === 0) return flash('Kamida bitta sahifani tanlang', true);

        setSaving(true);
        const res = await fetch('/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim(), password, permissions }),
        });
        const data = await res.json();
        setSaving(false);

        if (!res.ok) return flash(data.error || 'Xatolik', true);
        flash('Hodim muvaffaqiyatli yaratildi');
        cancelForm();
        fetchStaff();
    }

    async function handleSaveEdit() {
        if (permissions.length === 0) return flash('Kamida bitta sahifani tanlang', true);
        if (!selectedStaff) return;
        
        setSaving(true);
        const body: any = { id: selectedStaff.id, permissions };
        if (password) {
            if (password.length < 6) { setSaving(false); return flash('Parol kamida 6 ta belgi bo\'lishi kerak', true); }
            body.password = password;
        }

        const res = await fetch('/api/admin/staff', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        setSaving(false);

        if (!res.ok) return flash(data.error || 'Xatolik', true);
        flash('Muvaffaqiyatli saqlandi');
        cancelForm();
        fetchStaff();
    }

    async function handleDelete(target: StaffUser) {
        if (!confirm(`"${target.username}" hodimini o'chirmoqchimisiz?`)) return;
        setSaving(true);
        const res = await fetch('/api/admin/staff', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: target.id }),
        });
        setSaving(false);
        if (!res.ok) return flash('Xatolik yuz berdi', true);
        flash('Hodim o\'chirildi');
        fetchStaff();
    }

    function startCreate() {
        setUsername(''); setPassword(''); setPermissions([]); setMode('create');
    }

    function startEdit(s: StaffUser) {
        setSelectedStaff(s);
        setUsername(s.username);
        setPermissions(s.permissions);
        setPassword('');
        setMode('edit');
    }

    function cancelForm() {
        setMode('view');
        setSelectedStaff(null);
        setUsername('');
        setPassword('');
        setPermissions([]);
    }

    const formatLastActive = (dateStr?: string) => {
        if (!dateStr) return 'Hech qachon';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Hozirgina';
        if (diffMins < 60) return `${diffMins} daqiqa oldin`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} soat oldin`;
        return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    };

    const cardStyle: React.CSSProperties = {
        background: 'white', borderRadius: '20px',
        padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        border: '1px solid #F3F4F6',
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'hsla(var(--color-primary), 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--color-primary-dark))',
                    }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>Xodimlar ({staffList.length}/10)</h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Admin paneli uchun kirish huquqlarini boshqaring</p>
                    </div>
                </div>
                
                {mode === 'view' && staffList.length < 10 && (
                    <button 
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '12px 24px', borderRadius: '14px', border: 'none',
                            background: 'hsl(var(--color-primary-dark))', color: 'white', 
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        }}
                        onClick={startCreate}
                    >
                        <UserPlus size={18} /> Yangi xodim
                    </button>
                )}
            </div>

            {error && (
                <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ background: '#F0FDF4', color: '#166534', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
                    {success}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : mode === 'view' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {staffList.map(s => (
                        <div key={s.id} style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>@{s.username}</div>
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                                        Faol: {formatLastActive(s.last_login_at)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        onClick={() => startEdit(s)}
                                        style={{ background: '#F3F4F6', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#4B5563' }}
                                    >
                                        <Save size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(s)}
                                        style={{ background: '#FEF2F2', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#991B1B' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {ALL_PAGES.filter(p => s.permissions.includes(p.slug)).map(p => (
                                    <span key={p.slug} style={{
                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                        background: 'hsla(var(--color-primary), 0.1)', color: 'hsl(var(--color-primary-dark))',
                                    }}>
                                        {p.label}
                                    </span>
                                ))}
                                {s.permissions.length === 0 && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Ruxsatlar yo'q</span>}
                            </div>
                        </div>
                    ))}
                    {staffList.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#F9FAFB', borderRadius: '20px', border: '2px dashed #E5E7EB' }}>
                            <p style={{ color: '#6B7280', margin: 0 }}>Hali xodimlar yaratilmagan.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6', maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '24px' }}>
                        {mode === 'create' ? 'Yangi xodim qo\'shish' : `@${username} — Tahrirlash`}
                    </h2>
                    
                    <form onSubmit={e => { e.preventDefault(); mode === 'create' ? handleCreate(e) : handleSaveEdit(); }}>
                        {mode === 'create' && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>Username</label>
                                <input
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', transition: 'border 0.2s' }}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="oshpaz1"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                                {mode === 'edit' ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none' }}
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={mode === 'edit' ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Kamida 6 ta belgi"}
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>Ruxsat berilgan sahifalar</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {ALL_PAGES.map(p => {
                                    const checked = permissions.includes(p.slug);
                                    return (
                                        <button
                                            type="button"
                                            key={p.slug}
                                            onClick={() => togglePerm(p.slug)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                                border: `1.5px solid ${checked ? 'hsl(var(--color-primary-dark))' : '#F3F4F6'}`,
                                                background: checked ? 'hsla(var(--color-primary), 0.05)' : '#F9FAFB',
                                                color: checked ? 'hsl(var(--color-primary-dark))' : '#4B5563',
                                                textAlign: 'left', fontWeight: 600, fontSize: '13px',
                                            }}
                                        >
                                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {checked && <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'currentColor' }} />}
                                            </div>
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                type="submit" 
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: 'hsl(var(--color-primary-dark))', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                disabled={saving}
                            >
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                {mode === 'create' ? 'Saqlash' : 'O\'zgarishlarni saqlash'}
                            </button>
                            <button 
                                type="button" 
                                onClick={cancelForm}
                                style={{ padding: '14px 24px', borderRadius: '14px', border: 'none', background: '#F3F4F6', color: '#4B5563', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Bekor qilish
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
