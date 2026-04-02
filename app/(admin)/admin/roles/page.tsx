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
};

export default function RolesPage() {
    const [staff, setStaff] = useState<StaffUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create form state
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPermissions, setNewPermissions] = useState<string[]>([]);
    const [showNewPw, setShowNewPw] = useState(false);

    // Edit state
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [editPassword, setEditPassword] = useState('');
    const [showEditPw, setShowEditPw] = useState(false);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/admin/staff');
        const data = await res.json();
        setStaff(data.staff ?? null);
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    function flash(msg: string, isError = false) {
        if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
        else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
    }

    function togglePerm(arr: string[], setArr: (v: string[]) => void, slug: string) {
        setArr(arr.includes(slug) ? arr.filter(p => p !== slug) : [...arr, slug]);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newUsername.trim()) return flash('Username kiriting', true);
        if (newPassword.length < 6) return flash('Parol kamida 6 ta belgi bo\'lishi kerak', true);
        if (newPermissions.length === 0) return flash('Kamida bitta sahifani tanlang', true);

        setSaving(true);
        const res = await fetch('/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, password: newPassword, permissions: newPermissions }),
        });
        const data = await res.json();
        setSaving(false);

        if (!res.ok) return flash(data.error || 'Xatolik', true);
        flash('Hodim muvaffaqiyatli yaratildi');
        setMode('view');
        setNewUsername(''); setNewPassword(''); setNewPermissions([]);
        fetchStaff();
    }

    async function handleSaveEdit() {
        if (editPermissions.length === 0) return flash('Kamida bitta sahifani tanlang', true);
        if (!staff) return;
        setSaving(true);
        const body: any = { id: staff.id, permissions: editPermissions };
        if (editPassword) {
            if (editPassword.length < 6) { setSaving(false); return flash('Parol kamida 6 ta belgi bo\'lishi kerak', true); }
            body.password = editPassword;
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
        setMode('view');
        setEditPassword('');
        fetchStaff();
    }

    async function handleDelete() {
        if (!staff) return;
        if (!confirm(`"${staff.username}" hodimini o'chirmoqchimisiz?`)) return;
        setSaving(true);
        const res = await fetch('/api/admin/staff', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: staff.id }),
        });
        setSaving(false);
        if (!res.ok) return flash('Xatolik yuz berdi', true);
        flash('Hodim o\'chirildi');
        setStaff(null);
        setMode('view');
    }

    function startEdit() {
        if (!staff) return;
        setEditPermissions([...staff.permissions]);
        setEditPassword('');
        setMode('edit');
    }

    const card: React.CSSProperties = {
        background: 'white', borderRadius: '20px',
        padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        marginBottom: '24px',
    };
    const label: React.CSSProperties = {
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: '#374151', marginBottom: '6px',
    };
    const input: React.CSSProperties = {
        width: '100%', padding: '11px 14px', borderRadius: '12px',
        border: '1px solid #E5E7EB', fontSize: '15px', color: '#111827',
        outline: 'none', boxSizing: 'border-box',
    };
    const btn = (bg: string, color = 'white'): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', borderRadius: '12px', border: 'none',
        background: bg, color, fontWeight: 600, fontSize: '14px',
        cursor: 'pointer',
    });

    return (
        <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'hsla(var(--color-primary), 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'hsl(var(--color-primary-dark))',
                }}>
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>Rollar</h1>
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Xodim uchun kirish huquqlarini boshqaring</p>
                </div>
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
            ) : mode === 'view' && !staff ? (
                /* ── No staff user yet ── */
                <div style={card}>
                    <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '15px' }}>
                        Hali xodim yaratilmagan. Quyida yangi xodim qo'shing.
                    </p>
                    <button style={btn('hsl(var(--color-primary-dark))')} onClick={() => setMode('create')}>
                        <UserPlus size={16} /> Xodim qo'shish
                    </button>
                </div>
            ) : mode === 'view' && staff ? (
                /* ── Existing staff card ── */
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>@{staff.username}</div>
                            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
                                Qo'shilgan: {new Date(staff.created_at).toLocaleDateString('uz-UZ')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={btn('hsl(var(--color-primary-dark))')} onClick={startEdit}>
                                Tahrirlash
                            </button>
                            <button style={btn('#FEF2F2', '#991B1B')} onClick={handleDelete} disabled={saving}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                        Ruxsat berilgan sahifalar:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {ALL_PAGES.map(p => {
                            const has = staff.permissions.includes(p.slug);
                            return (
                                <span key={p.slug} style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                                    background: has ? 'rgba(22, 163, 74, 0.1)' : '#F3F4F6',
                                    color: has ? '#166534' : '#9CA3AF',
                                }}>
                                    {p.label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            ) : mode === 'create' ? (
                /* ── Create form ── */
                <div style={card}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
                        Yangi xodim
                    </h2>
                    <form onSubmit={handleCreate}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={label}>Username</label>
                            <input
                                style={input} value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                placeholder="masalan: oshpaz1"
                                autoComplete="off"
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={label}>Parol</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    style={{ ...input, paddingRight: '44px' }}
                                    type={showNewPw ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Kamida 6 ta belgi"
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowNewPw(v => !v)} style={{
                                    position: 'absolute', right: '14px', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                                }}>
                                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={label}>Sahifalar (ruxsat beriladiganlar)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                {ALL_PAGES.map(p => {
                                    const checked = newPermissions.includes(p.slug);
                                    return (
                                        <label key={p.slug} style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                                            border: `1.5px solid ${checked ? 'hsl(var(--color-primary-dark))' : '#E5E7EB'}`,
                                            background: checked ? 'hsla(var(--color-primary), 0.06)' : 'white',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePerm(newPermissions, setNewPermissions, p.slug)}
                                                style={{ accentColor: 'hsl(var(--color-primary-dark))' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" style={btn('hsl(var(--color-primary-dark))')} disabled={saving}>
                                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                                Saqlash
                            </button>
                            <button type="button" style={btn('#F3F4F6', '#374151')} onClick={() => setMode('view')}>
                                Bekor qilish
                            </button>
                        </div>
                    </form>
                </div>
            ) : mode === 'edit' && staff ? (
                /* ── Edit form ── */
                <div style={card}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
                        @{staff.username} — tahrirlash
                    </h2>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={label}>Yangi parol (ixtiyoriy)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                style={{ ...input, paddingRight: '44px' }}
                                type={showEditPw ? 'text' : 'password'}
                                value={editPassword}
                                onChange={e => setEditPassword(e.target.value)}
                                placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowEditPw(v => !v)} style={{
                                position: 'absolute', right: '14px', top: '50%',
                                transform: 'translateY(-50%)', background: 'none',
                                border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                            }}>
                                {showEditPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={label}>Sahifalar</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                            {ALL_PAGES.map(p => {
                                const checked = editPermissions.includes(p.slug);
                                return (
                                    <label key={p.slug} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                                        border: `1.5px solid ${checked ? 'hsl(var(--color-primary-dark))' : '#E5E7EB'}`,
                                        background: checked ? 'hsla(var(--color-primary), 0.06)' : 'white',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePerm(editPermissions, setEditPermissions, p.slug)}
                                            style={{ accentColor: 'hsl(var(--color-primary-dark))' }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={btn('hsl(var(--color-primary-dark))')} onClick={handleSaveEdit} disabled={saving}>
                            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                            Saqlash
                        </button>
                        <button style={btn('#F3F4F6', '#374151')} onClick={() => setMode('view')}>
                            Bekor qilish
                        </button>
                    </div>
                </div>
            ) : null}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
