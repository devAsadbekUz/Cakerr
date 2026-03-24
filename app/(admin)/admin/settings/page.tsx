'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import {
    Plus, Trash2, Edit2, Save, X, GripVertical,
    Layout, Type, MousePointer2, Palette,
    Eye, EyeOff, Download
} from 'lucide-react';
import {
    format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
    subDays
} from 'date-fns';
import styles from '../AdminDashboard.module.css';

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

import { SortableBannerItem, Banner } from '@/app/components/admin/settings/BannerItem';
import { BannerForm } from '@/app/components/admin/settings/BannerForm';

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

    const handleExport = async () => {
        setLoading(true);
        try {
            const { data: orders } = await supabase.from('orders').select('*, profiles(full_name, phone_number), order_items(*)');
            const { data: products } = await supabase.from('products').select('*').is('deleted_at', null);
            const { data: profiles } = await supabase.from('profiles').select('*');

            const { exportToExcel, formatOrderDataForExcel, formatProductDataForExcel, formatUserDataForExcel } = await import('@/app/utils/admin/excelUtils');

            const dataSets = [
                { sheetName: 'Buyurtmalar', data: formatOrderDataForExcel(orders || []) },
                { sheetName: 'Mahsulotlar', data: formatProductDataForExcel(products || []) },
                { sheetName: 'Mijozlar', data: formatUserDataForExcel(profiles || []) }
            ];

            exportToExcel(dataSets, `Cakerr_Eksport_${format(new Date(), 'dd-MM-yyyy')}`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Eksport qilishda xatolik yuz berdi');
        } finally {
            setLoading(false);
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

            {/* ==================== DATA EXPORT ==================== */}
            <section className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB', marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <Download size={24} color="#BE185D" />
                            Ma'lumotlarni eksport qilish
                        </h2>
                        <p style={{ color: '#6B7280', margin: 0 }}>Barcha buyurtmalar, mahsulotlar va mijozlar ro'yxatini Excel formatida yuklab oling.</p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className={styles.miniBtn}
                        style={{ height: '48px', padding: '0 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Download size={18} />
                        {loading ? 'Tayyorlanmoqda...' : 'Excel yuklab olish'}
                    </button>
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
