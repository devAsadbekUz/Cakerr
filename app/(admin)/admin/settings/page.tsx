'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import {
    Plus, Trash2, Edit2, Save, X, GripVertical,
    Layout, Type, MousePointer2, Palette,
    Eye, EyeOff
} from 'lucide-react';
import styles from '../AdminDashboard.module.css'; // Reuse existing dashboard styles where possible

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Banner {
    id: string;
    badge_text: string;
    title_text: string;
    button_text: string;
    link_url: string;
    bg_color: string;
    is_active: boolean;
    sort_order: number;
}

function SortableBannerItem({
    banner,
    onToggleActive,
    onEdit,
    onDelete,
}: {
    banner: Banner;
    onToggleActive: (b: Banner) => void;
    onEdit: (b: Banner) => void;
    onDelete: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: banner.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        border: '1px solid #F3F4F6',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        opacity: isDragging ? 0.8 : (banner.is_active ? 1 : 0.6),
        background: isDragging ? '#FDF2F8' : 'white',
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 8px' }} {...listeners}>
                <GripVertical size={20} color="#9CA3AF" />
            </div>

            <div style={{
                width: '120px',
                height: '70px',
                background: banner.bg_color,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                padding: '8px',
                color: 'white',
                fontSize: '8px',
                overflow: 'hidden'
            }}>
                <div style={{ opacity: 0.8 }}>{banner.badge_text}</div>
                <div style={{ fontWeight: 800, marginTop: '4px' }}>{banner.title_text}</div>
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{banner.title_text}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {banner.badge_text} • {banner.button_text}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onToggleActive(banner)}
                    style={{ background: banner.is_active ? '#ECFDF5' : '#F3F4F6', color: banner.is_active ? '#059669' : '#6B7280', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                    onClick={() => onEdit(banner)}
                    style={{ background: '#EFF6FF', color: '#3B82F6', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Edit2 size={18} />
                </button>
                <button
                    onClick={() => onDelete(banner.id)}
                    style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

export default function AdminSettingsPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [orderChanged, setOrderChanged] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);

    const supabase = createClient();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchBanners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('hero_banners')
            .select('*')
            .order('sort_order', { ascending: true });

        if (data) setBanners(data);
        setOrderChanged(false);
        setLoading(false);
    };

    const checkRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data) setUserRole(data.role);
        }
    };

    useEffect(() => {
        fetchBanners();
        checkRole();
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setBanners((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
        setOrderChanged(true);
    };

    const saveOrder = async () => {
        setSavingOrder(true);
        try {
            const { error } = await supabase.rpc('update_banners_order', {
                new_orders: banners.map((b, index) => ({ id: b.id, sort_order: index }))
            });

            if (error) {
                // Fallback to manual updates if RPC fails
                await Promise.all(
                    banners.map((b, index) =>
                        supabase.from('hero_banners').update({ sort_order: index }).eq('id', b.id)
                    )
                );
            }
            setOrderChanged(false);
        } catch (err) {
            console.error('Failed to save order:', err);
            alert('Tartibni saqlashda xatolik yuz berdi');
        }
        setSavingOrder(false);
    };

    const handleSave = async (banner: Partial<Banner>) => {
        try {
            if (banner.id) {
                // Ensure we don't try to update the ID
                const { id, ...updateData } = banner;
                const { error } = await supabase
                    .from('hero_banners')
                    .update(updateData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const nextOrder = banners.length > 0 ? Math.max(...banners.map(b => b.sort_order)) + 1 : 0;
                const { error } = await supabase
                    .from('hero_banners')
                    .insert([{ ...banner, sort_order: nextOrder }]);
                if (error) throw error;
            }
            setEditingBanner(null);
            setIsAdding(false);
            fetchBanners();
        } catch (error: any) {
            console.error('Bannerni saqlashda xatolik:', error);
            alert(`Xatolik yuz berdi: ${error.message || 'Noma\'lum xatolik'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Haqiqatdan ham ushbu bannerni o\'chirmoqchimisiz?')) return;
        try {
            const { error, count } = await supabase
                .from('hero_banners')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) throw error;

            if (count === 0) {
                alert("Banner o'chirilmadi. Sizda bu operatsiya uchun ruxsat yo'q bo'lishi mumkin (RLS).");
            } else {
                fetchBanners();
            }
        } catch (error: any) {
            console.error('Bannerni o\'chirishda xatolik:', error);
            alert(`Xatolik yuz berdi: ${error.message || 'Noma\'lum xatolik'}`);
        }
    };

    const toggleActive = async (banner: Banner) => {
        try {
            const { error } = await supabase
                .from('hero_banners')
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id);
            if (error) throw error;
            fetchBanners();
        } catch (error: any) {
            console.error('Banner holatinitag\'s o\'zgartirishda xatolik:', error);
            alert(`Xatolik yuz berdi: ${error.message || 'Noma\'lum xatolik'}`);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Sozlamalar</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>
                    Bosh sahifa bannerlari va umumiy sozlamalar. {userRole && <span style={{ marginLeft: '10px', color: userRole === 'admin' ? '#059669' : '#EF4444', fontWeight: 700 }}>Rol: {userRole}</span>}
                </p>
            </header>

            <section className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layout size={24} color="#BE185D" />
                        Marketing Bannerlari
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {orderChanged && (
                            <button
                                onClick={saveOrder}
                                disabled={savingOrder}
                                style={{ background: '#059669', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', opacity: savingOrder ? 0.7 : 1 }}
                            >
                                <Save size={18} /> {savingOrder ? 'Saqlanmoqda...' : 'Tartibni saqlash'}
                            </button>
                        )}
                        <button
                            onClick={() => setIsAdding(true)}
                            style={{ background: '#BE185D', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Plus size={18} /> Qo'shish
                        </button>
                    </div>
                </div>

                {isAdding && (
                    <BannerForm
                        onSave={handleSave}
                        onCancel={() => setIsAdding(false)}
                    />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Yuklanmoqda...</p>
                    ) : banners.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Bannerlar mavjud emas</p>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {banners.map((banner) => (
                                        <SortableBannerItem
                                            key={banner.id}
                                            banner={banner}
                                            onToggleActive={toggleActive}
                                            onEdit={setEditingBanner}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </section>

            {editingBanner && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <BannerForm
                        banner={editingBanner}
                        onSave={handleSave}
                        onCancel={() => setEditingBanner(null)}
                    />
                </div>
            )}
        </div>
    );
}

function BannerForm({ banner, onSave, onCancel }: { banner?: Banner, onSave: (b: Partial<Banner>) => void, onCancel: () => void }) {
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
