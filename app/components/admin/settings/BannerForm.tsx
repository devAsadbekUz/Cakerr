import { useState } from 'react';
import { Banner } from './BannerItem';

export function BannerForm({
    banner,
    onSave,
    onCancel
}: {
    banner?: Banner,
    onSave: (b: Partial<Banner>) => void,
    onCancel: () => void
}) {
    const [form, setForm] = useState<Partial<Banner>>(banner || {
        badge_text: '',
        title_text: '',
        button_text: 'Buyurtma berish',
        link_url: '/',
        bg_color: '#BE185D',
        is_active: true
    });

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>{banner ? 'Bannerni tahrirlash' : 'Yangi banner'}</h3>

            <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Badge (nishan)</label>
                    <input
                        type="text"
                        value={form.badge_text}
                        onChange={e => setForm({ ...form, badge_text: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="🎉 Yangi mahsulotlar"
                    />
                </div>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Sarlavha</label>
                    <input
                        type="text"
                        value={form.title_text}
                        onChange={e => setForm({ ...form, title_text: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="30% chegirma..."
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Tugma matni</label>
                        <input
                            type="text"
                            value={form.button_text}
                            onChange={e => setForm({ ...form, button_text: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Rang (HEX)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {[
                                { name: 'Pushti', hex: '#BE185D' },
                                { name: 'Moviy', hex: '#1D4ED8' },
                                { name: 'Yashil', hex: '#047857' },
                                { name: 'Sariq', hex: '#B45309' },
                                { name: 'Binafsha', hex: '#7C3AED' },
                                { name: 'To\'q', hex: '#111827' }
                            ].map(color => (
                                <button
                                    key={color.hex}
                                    onClick={() => setForm({ ...form, bg_color: color.hex })}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: color.hex,
                                        border: form.bg_color === color.hex ? '2px solid white' : '1px solid #E5E7EB',
                                        boxShadow: form.bg_color === color.hex ? '0 0 0 2px #BE185D' : 'none',
                                        cursor: 'pointer'
                                    }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="color"
                                value={form.bg_color}
                                onChange={e => setForm({ ...form, bg_color: e.target.value })}
                                style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'none' }}
                            />
                            <input
                                type="text"
                                value={form.bg_color}
                                onChange={e => setForm({ ...form, bg_color: e.target.value })}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Link (yo'naltirish)</label>
                    <input
                        type="text"
                        value={form.link_url}
                        onChange={e => setForm({ ...form, link_url: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB' }}
                        placeholder="/"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    onClick={() => onSave(form)}
                    style={{ flex: 1, background: '#BE185D', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    Saqlash
                </button>
                <button
                    onClick={onCancel}
                    style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                    Bekor qilish
                </button>
            </div>
        </div>
    );
}
