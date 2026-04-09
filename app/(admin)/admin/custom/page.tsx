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
import ImageUpload from '@/app/components/admin/ImageUpload';

type TabType = 'cake_type' | 'nachinka' | 'size' | 'decoration';

export default function AdminCustomPage() {
    const { lang, t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<TabType>('cake_type');
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
            type: activeTab as any,
            label_uz: '',
            label_ru: '',
            price: 0,
            is_available: true,
            sort_order: (options.filter(o => o.type === activeTab).length || 0) + 1
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
            case 'cake_type':  return <Maximize2 size={18} />;
            case 'nachinka':   return <Cookie size={18} />;
            case 'size':       return <Circle size={18} />;
            case 'decoration': return <Palette size={18} />;
        }
    };

    const getTabLabel = (tab: TabType) => {
        switch (tab) {
            case 'cake_type':  return t('tabCakeType') || 'Tort turi';
            case 'nachinka':   return t('tabNachinka') || 'Nachinka';
            case 'size':       return t('tabSizes') || "O'lcham";
            case 'decoration': return t('tabDecoration');
        }
    };

    const TABS: TabType[] = ['cake_type', 'nachinka', 'size', 'decoration'];

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


            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>{t('loading')}</div>
            ) : (
                <div className={styles.grid}>
                    {filteredOptions.map(option => (
                        <div
                            key={option.id}
                            className={styles.card}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardInfo}>
                                    <div className={styles.cardTitle}>
                                        {lang === 'uz' ? option.label_uz : (option.label_ru || option.label_uz)}
                                    </div>
                                    {option.sub_label_uz && (
                                        <div className={styles.cardSubTitle}>{option.sub_label_uz}</div>
                                    )}
                                    {option.parent_id && (
                                        <div className={styles.parentBadge}>
                                            {options.find(o => o.id === option.parent_id)?.label_uz || '...'}
                                        </div>
                                    )}
                                </div>

                                {option.image_url ? (
                                    <div className={styles.cardImageWrapper}>
                                        <Image src={option.image_url} alt={option.label_uz || ''} fill className={styles.cardImage} style={{ objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div className={styles.cardIcon}>{getTabIcon(option.type as TabType)}</div>
                                )}
                            </div>


                            <div className={styles.cardActions}>
                                <button className={styles.actionBtn} onClick={() => handleEdit(option)}>
                                    <Edit2 size={16} />
                                </button>

                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(option.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button className={`${styles.card} ${styles.addCard}`} onClick={handleAdd}>
                        <Plus size={32} />
                        <span>{t('addNew')}</span>
                    </button>
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
                                    <label>Nomi (O'zbekcha)</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={editingOption.label_uz || ''}
                                        onChange={e => setEditingOption({ ...editingOption, label_uz: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Название (Русский)</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={editingOption.label_ru || ''}
                                        onChange={e => setEditingOption({ ...editingOption, label_ru: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{lang === 'uz' ? 'Rasm' : 'Изображение'}</label>
                                    <ImageUpload
                                        value={editingOption.image_url || ''}
                                        onChange={url => setEditingOption({ ...editingOption, image_url: url })}
                                        bucket="images"
                                    />
                                </div>

                                {(activeTab === 'nachinka' || activeTab === 'size') && (
                                    <div className={styles.formGroup}>
                                        <label>{t('parentCakeType') || 'Bog&apos;langan tort turi'}</label>
                                        <select 
                                            className={styles.input}
                                            value={editingOption.parent_id || ''}
                                            onChange={e => setEditingOption({ ...editingOption, parent_id: e.target.value || null })}
                                        >
                                            <option value="">{t('selectParentPlaceholder') || 'Tort turini tanlang'}</option>
                                            {options.filter(o => o.type === 'cake_type').map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {lang === 'uz' ? type.label_uz : (type.label_ru || type.label_uz)}
                                                </option>
                                            ))}
                                        </select>
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
