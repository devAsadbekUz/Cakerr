'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// --- Loading skeleton ---
function SkeletonRow() {
    return (
        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '12px 16px', width: '44px' }}>
                <div style={{ width: '18px', height: '18px', background: '#E5E7EB', borderRadius: '4px' }} />
            </td>
            <td style={{ padding: '12px 16px' }}>
                <div style={{ width: '40px', height: '40px', background: '#E5E7EB', borderRadius: '8px' }} />
            </td>
            <td style={{ padding: '12px 16px' }}>
                <div style={{ width: '120px', height: '16px', background: '#E5E7EB', borderRadius: '4px' }} />
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#E5E7EB', borderRadius: '8px' }} />
                    <div style={{ width: '32px', height: '32px', background: '#E5E7EB', borderRadius: '8px' }} />
                </div>
            </td>
        </tr>
    );
}

// --- Sortable row component ---
function SortableRow({
    cat,
    onEdit,
    onDelete,
    lang,
    deleting,
}: {
    cat: any;
    onEdit: (cat: any) => void;
    onDelete: (id: string) => void;
    lang: 'uz' | 'ru';
    deleting: boolean;
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
        opacity: isDragging || deleting ? 0.5 : 1,
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
                    disabled={deleting}
                    style={{
                        padding: '8px', background: '#EFF6FF', color: '#1D4ED8',
                        borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '8px'
                    }}
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => onDelete(cat.id)}
                    disabled={deleting}
                    style={{
                        padding: '8px', background: '#FEF2F2', color: '#DC2626',
                        borderRadius: '8px', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer'
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
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    // Track sort_order at last fetch to only save changed rows
    const savedOrderRef = useRef<Record<string, number>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const data = await adminFetch({ table: 'categories', orderBy: 'sort_order', orderAsc: true });
        setCategories(data);
        setOrderChanged(false);
        // Record the saved sort_order baseline
        const baseline: Record<string, number> = {};
        data.forEach((c: any, i: number) => { baseline[c.id] = c.sort_order ?? i; });
        savedOrderRef.current = baseline;
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;

        // Optimistic removal
        setDeletingIds(prev => new Set(prev).add(id));
        const snapshot = [...categories];
        setCategories(prev => prev.filter(c => c.id !== id));

        const success = await adminDelete('categories', id);
        if (success) {
            setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        } else {
            // Restore on failure
            setCategories(snapshot);
            setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            alert(t('error'));
        }
    }, [categories, t]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setCategories((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
        setOrderChanged(true);
    }, []);

    const saveOrder = useCallback(async () => {
        setSaving(true);
        try {
            // Only update rows whose position actually changed
            const toUpdate = categories
                .map((cat, index) => ({ cat, index }))
                .filter(({ cat, index }) => savedOrderRef.current[cat.id] !== index);

            await Promise.all(
                toUpdate.map(({ cat, index }) =>
                    adminUpdate('categories', cat.id, { sort_order: index })
                )
            );

            // Update baseline
            categories.forEach((c, i) => { savedOrderRef.current[c.id] = i; });
            setOrderChanged(false);
        } catch (err) {
            console.error('Failed to save order:', err);
            alert(t('error'));
        }
        setSaving(false);
    }, [categories, t]);

    const handleFormSuccess = useCallback((saved: any) => {
        setCategories(prev => {
            const exists = prev.some(c => c.id === saved.id);
            if (exists) {
                return prev.map(c => c.id === saved.id ? { ...c, ...saved } : c);
            }
            // New category — append (will be last, sort_order assigned by DB)
            return [...prev, saved];
        });
    }, []);

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
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <tr>
                                <th style={{ padding: '16px', width: '44px' }}></th>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>{t('icon')}</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>{t('name')}</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                        </tbody>
                    </table>
                </div>
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
                                            deleting={deletingIds.has(cat.id)}
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
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}
