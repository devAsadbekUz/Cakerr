'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, FolderOpen, GripVertical, Save } from 'lucide-react';
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
import CategoryForm from '@/app/components/admin/CategoryForm';
import { adminFetch, adminDelete, adminUpdate } from '@/app/utils/adminApi';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { getLocalized } from '@/app/utils/i18n';

// --- Sortable row component ---
function SortableRow({
    cat,
    onEdit,
    onDelete,
    lang,
}: {
    cat: any;
    onEdit: (cat: any) => void;
    onDelete: (id: string) => void;
    lang: 'uz' | 'ru';
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: cat.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        borderBottom: '1px solid #F3F4F6',
        background: isDragging ? '#FDF2F8' : 'white',
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative' as const,
    };

    return (
        <tr ref={setNodeRef} style={style} {...attributes}>
            <td style={{ padding: '12px 16px', width: '44px', cursor: 'grab' }} {...listeners}>
                <GripVertical size={18} color="#9CA3AF" />
            </td>
            <td style={{ padding: '12px 16px', fontSize: '24px' }}>
                {cat.image_url ? (
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6', position: 'relative' }}>
                        <Image src={cat.image_url} alt={getLocalized(cat.label, lang)} fill style={{ objectFit: 'cover' }} sizes="40px" />
                    </div>
                ) : (
                    <span>{cat.icon}</span>
                )}
            </td>
            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{getLocalized(cat.label, lang)}</td>
            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                <button
                    onClick={() => onEdit(cat)}
                    style={{
                        padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                        borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '8px'
                    }}
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => onDelete(cat.id)}
                    style={{
                        padding: '8px', background: '#FEF2F2', color: '#DC2626',
                        borderRadius: '8px', border: 'none', cursor: 'pointer'
                    }}
                >
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );
}

// --- Main page ---
export default function CategoriesPage() {
    const { lang, t } = useAdminI18n();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orderChanged, setOrderChanged] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCategories = async () => {
        setLoading(true);
        const data = await adminFetch({ table: 'categories', orderBy: 'sort_order', orderAsc: true });
        setCategories(data);
        setOrderChanged(false);
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;
        const success = await adminDelete('categories', id);
        if (success) fetchCategories();
        else alert(t('error'));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setCategories((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
        setOrderChanged(true);
    };

    const saveOrder = async () => {
        setSaving(true);
        try {
            await Promise.all(
                categories.map((cat, index) =>
                    adminUpdate('categories', cat.id, { sort_order: index })
                )
            );
            setOrderChanged(false);
        } catch (err) {
            console.error('Failed to save order:', err);
            alert(t('error'));
        }
        setSaving(false);
    };

    return (
        <div>
            <div style={{
                display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
                justifyContent: 'space-between', alignItems: 'center',
                gap: '16px', marginBottom: '24px'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>{t('categories')}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {orderChanged && (
                        <button
                            onClick={saveOrder}
                            disabled={saving}
                            style={{
                                background: '#059669', color: 'white', padding: '10px 20px',
                                borderRadius: '10px', border: 'none', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                opacity: saving ? 0.6 : 1,
                            }}
                        >
                            <Save size={18} />
                            {saving ? t('saving') : t('saveOrder')}
                        </button>
                    )}
                    <button
                        onClick={() => { setEditingCategory(null); setIsFormOpen(true); }}
                        style={{
                            background: '#BE185D', color: 'white', padding: '10px 20px',
                            borderRadius: '10px', border: 'none', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} />
                        {t('add')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div>{t('loading')}</div>
            ) : categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <FolderOpen size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>{t('noCategories')}</p>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <table style={{ width: '100%', minWidth: '500px', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <tr>
                                    <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', width: '44px' }}></th>
                                    <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>{t('icon')}</th>
                                    <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>{t('name')}</th>
                                    <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <tbody>
                                    {categories.map((cat) => (
                                        <SortableRow
                                            key={cat.id}
                                            cat={cat}
                                            onEdit={(c) => { setEditingCategory(c); setIsFormOpen(true); }}
                                            onDelete={handleDelete}
                                            lang={lang}
                                        />
                                    ))}
                                </tbody>
                            </SortableContext>
                        </table>
                    </DndContext>

                    {orderChanged && (
                        <div style={{
                            padding: '12px 16px', background: '#ECFDF5', borderTop: '1px solid #A7F3D0',
                            fontSize: '13px', color: '#065F46', textAlign: 'center'
                        }}>
                            ⬆⬇ {t('orderChanged')}
                        </div>
                    )}
                </div>
            )}

            <CategoryForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                category={editingCategory}
                onSuccess={fetchCategories}
            />
        </div>
    );
}
