'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
    Plus, Edit2, Trash2, Save, X,
    Maximize2, Cookie, Droplets, Palette,
    Image as ImageIcon, Loader2,
    Circle, Square, Heart, Hexagon,
    Triangle, Star, Eye, EyeOff
} from 'lucide-react';
import styles from './AdminCustom.module.css';
import { customCakeService, CustomOption } from '@/app/services/customCakeService';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';

type TabType = 'shape' | 'size' | 'sponge' | 'cream' | 'decoration';

// Map shape labels to a representative icon
const SHAPE_ICON_MAP: Record<string, React.ElementType> = {
    'Yumaloq':      Circle,
    'To\'rtburchak': Square,
    'Yurak':        Heart,
    'Oval':         Circle,
    'Aylana':       Circle,
    'Guldasta':     Star,
    'Uchburchak':   Triangle,
    'Yulduz':       Star,
    'Olti burchak': Hexagon,
    'Minora':       Maximize2,
    'Raqam':        Square,
    'Harf':         Square,
};

function ShapeIcon({ label }: { label: string }) {
    const Icon = SHAPE_ICON_MAP[label] || Circle;
    return <Icon size={28} />;
}

export default function AdminCustomPage() {
    const { lang, t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<TabType>('shape');
    const [options, setOptions] = useState<CustomOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOption, setEditingOption] = useState<Partial<CustomOption> | null>(null);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        loadOptions();
    }, []);

    const loadOptions = async () => {
        setLoading(true);
        // Fetch ALL options including unavailable ones for admin view
        const data = await customCakeService.getAllOptions();
        setOptions(data);
        setLoading(false);
    };

    const filteredOptions = options.filter(o => o.type === activeTab);

    const handleAdd = () => {
        setEditingOption({
            type: activeTab,
            label: '',
            sub_label: '',
            price: 0,
            is_available: true,
            sort_order: filteredOptions.length + 1
        });
        setIsModalOpen(true);
    };

    const handleEdit = (option: CustomOption) => {
        setEditingOption(option);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('confirmDeleteOption'))) {
            const { error } = await customCakeService.deleteOption(id);
            if (!error) {
                setOptions(options.filter(o => o.id !== id));
            }
        }
    };

    // Toggle is_available for shapes (and other types)
    const handleToggleAvailable = async (option: CustomOption) => {
        setTogglingId(option.id);
        const { data, error } = await customCakeService.saveOption({
            ...option,
            is_available: !option.is_available,
        });
        if (!error && data) {
            setOptions(prev => prev.map(o => o.id === data.id ? data : o));
        }
        setTogglingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOption) return;

        setSaving(true);
        const { data, error } = await customCakeService.saveOption(editingOption);

        if (!error && data) {
            if (editingOption.id) {
                setOptions(options.map(o => o.id === data.id ? data : o));
            } else {
                setOptions([...options, data]);
            }
            setIsModalOpen(false);
            setEditingOption(null);
        }
        setSaving(false);
    };

    const getTabIcon = (tab: TabType) => {
        switch (tab) {
            case 'shape':      return <Circle size={18} />;
            case 'size':       return <Maximize2 size={18} />;
            case 'sponge':     return <Cookie size={18} />;
            case 'cream':      return <Droplets size={18} />;
            case 'decoration': return <Palette size={18} />;
        }
    };

    const getTabLabel = (tab: TabType) => {
        switch (tab) {
            case 'shape':      return t('tabShapes');
            case 'size':       return t('tabSizes');
            case 'sponge':     return t('tabSponge');
            case 'cream':      return t('tabCream');
            case 'decoration': return t('tabDecoration');
        }
    };

    const TABS: TabType[] = ['shape', 'size', 'sponge', 'cream', 'decoration'];
    const isShapeTab = activeTab === 'shape';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('customCakeSettings')}</h1>
            </div>

            <div className={styles.tabs}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {getTabIcon(tab)}
                        <span>{getTabLabel(tab)}</span>
                    </button>
                ))}
            </div>

            {/* Shape tab hint */}
            {isShapeTab && !loading && (
                <div className={styles.shapeHint}>
                    <Eye size={16} />
                    <span>
                        {lang === 'uz'
                            ? 'Ko\'z belgisini bosib shaklni mijozlarga ko\'rsating yoki yashiring.'
                            : 'Нажмите на иконку глаза, чтобы показать или скрыть форму от клиентов.'}
                    </span>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>{t('loading')}</div>
            ) : (
                <div className={styles.grid}>
                    {filteredOptions.map(option => (
                        <div
                            key={option.id}
                            className={`${styles.card} ${isShapeTab && !option.is_available ? styles.cardDisabled : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.cardTitle}>{option.label}</h3>
                                    {option.sub_label && <span className={styles.cardSubLabel}>{option.sub_label}</span>}
                                </div>

                                {/* Shape tab: show icon + availability badge */}
                                {isShapeTab ? (
                                    <div className={styles.cardIcon}>
                                        <ShapeIcon label={option.label} />
                                    </div>
                                ) : option.image_url ? (
                                    <div className={styles.cardImageWrapper}>
                                        <Image src={option.image_url} alt={option.label} fill className={styles.cardImage} style={{ objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div className={styles.cardIcon}>{getTabIcon(option.type as TabType)}</div>
                                )}
                            </div>

                            {/* Availability badge for shapes */}
                            {isShapeTab && (
                                <span className={`${styles.availBadge} ${option.is_available ? styles.availBadgeOn : styles.availBadgeOff}`}>
                                    {option.is_available
                                        ? (lang === 'uz' ? 'Ko\'rinadigan' : 'Видимый')
                                        : (lang === 'uz' ? 'Yashirin' : 'Скрытый')}
                                </span>
                            )}

                            {!isShapeTab && (
                                <span className={styles.cardPrice}>+{option.price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</span>
                            )}

                            <div className={styles.cardActions}>
                                {/* Toggle button — primary action for shapes */}
                                {isShapeTab && (
                                    <button
                                        className={`${styles.actionBtn} ${option.is_available ? styles.toggleOnBtn : styles.toggleOffBtn}`}
                                        onClick={() => handleToggleAvailable(option)}
                                        disabled={togglingId === option.id}
                                        title={option.is_available
                                            ? (lang === 'uz' ? 'Yashirish' : 'Скрыть')
                                            : (lang === 'uz' ? 'Ko\'rsatish' : 'Показать')}
                                    >
                                        {togglingId === option.id
                                            ? <Loader2 size={16} className="animate-spin" />
                                            : option.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                )}

                                <button className={styles.actionBtn} onClick={() => handleEdit(option)}>
                                    <Edit2 size={16} />
                                </button>

                                {/* Allow delete only for non-shape types (shapes are pre-seeded) */}
                                {!isShapeTab && (
                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(option.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Only show "Add new" card for non-shape tabs */}
                    {!isShapeTab && (
                        <button className={`${styles.card} ${styles.addCard}`} onClick={handleAdd}>
                            <Plus size={32} />
                            <span>{t('addNew')}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && editingOption && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContainer}>
                        <div className={styles.modalHeader}>
                            <h3>{editingOption.id ? t('editOption') : t('newOption')}</h3>
                            <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.modalContent}>
                                <div className={styles.formGroup}>
                                    <label>{t('labelName')}</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={editingOption.label || ''}
                                        onChange={e => setEditingOption({ ...editingOption, label: e.target.value })}
                                        required
                                        // Shapes: label is editable but only for renaming context
                                        readOnly={isShapeTab}
                                    />
                                </div>

                                {(activeTab === 'size' || isShapeTab) && (
                                    <div className={styles.formGroup}>
                                        <label>{t('subLabelLabel')}</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={editingOption.sub_label || ''}
                                            onChange={e => setEditingOption({ ...editingOption, sub_label: e.target.value })}
                                        />
                                    </div>
                                )}

                                {!isShapeTab && (
                                    <div className={styles.formGroup}>
                                        <label>{t('priceLabel')} ({lang === 'uz' ? "so'm" : "сум"})</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            value={editingOption.price || 0}
                                            onChange={e => setEditingOption({ ...editingOption, price: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                )}

                                {(activeTab === 'cream' || activeTab === 'decoration') && (
                                    <div className={styles.formGroup}>
                                        <label>{t('imageUrlLabel')}</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={editingOption.image_url || ''}
                                            onChange={e => setEditingOption({ ...editingOption, image_url: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label>{t('sortOrderLabel')}</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={editingOption.sort_order || 0}
                                        onChange={e => setEditingOption({ ...editingOption, sort_order: parseInt(e.target.value) })}
                                    />
                                </div>

                                {/* For shapes in edit modal, show availability toggle */}
                                {isShapeTab && (
                                    <div className={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={editingOption.is_available ?? true}
                                                onChange={e => setEditingOption({ ...editingOption, is_available: e.target.checked })}
                                                style={{ width: 18, height: 18 }}
                                            />
                                            {lang === 'uz' ? 'Mijozlarga ko\'rsatish' : 'Показывать клиентам'}
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="submit" className={styles.submitBtn} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" /> : t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
