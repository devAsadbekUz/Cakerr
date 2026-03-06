'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
    Plus, Edit2, Trash2, Save, X,
    Maximize2, Cookie, Droplets, Palette,
    Image as ImageIcon, Loader2
} from 'lucide-react';
import styles from './AdminCustom.module.css';
import { customCakeService, CustomOption } from '@/app/services/customCakeService';
import { SectionTitle } from '@/app/components/admin/DashboardComponents';

type TabType = 'size' | 'sponge' | 'cream' | 'decoration';

export default function AdminCustomPage() {
    const [activeTab, setActiveTab] = useState<TabType>('size');
    const [options, setOptions] = useState<CustomOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOption, setEditingOption] = useState<Partial<CustomOption> | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadOptions();
    }, []);

    const loadOptions = async () => {
        setLoading(true);
        const data = await customCakeService.getOptions();
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
        if (confirm('Ishonchingiz komilmi? Bu variant o\'chiriladi.')) {
            const { error } = await customCakeService.deleteOption(id);
            if (!error) {
                setOptions(options.filter(o => o.id !== id));
            }
        }
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
            case 'size': return <Maximize2 size={18} />;
            case 'sponge': return <Cookie size={18} />;
            case 'cream': return <Droplets size={18} />;
            case 'decoration': return <Palette size={18} />;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Maxsus Tort Sozlamalari</h1>
            </div>

            <div className={styles.tabs}>
                {(['size', 'sponge', 'cream', 'decoration'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {getTabIcon(tab)}
                        <span>
                            {tab === 'size' ? 'Hajmlar' :
                                tab === 'sponge' ? 'Biskvit' :
                                    tab === 'cream' ? 'Krem / Qoplama' : 'Bezaklar'}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Yuklanmoqda...</div>
            ) : (
                <div className={styles.grid}>
                    {filteredOptions.map(option => (
                        <div key={option.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.cardTitle}>{option.label}</h3>
                                    {option.sub_label && <span className={styles.cardSubLabel}>{option.sub_label}</span>}
                                </div>
                                {option.image_url ? (
                                    <div className={styles.cardImageWrapper}>
                                        <Image src={option.image_url} alt={option.label} fill className={styles.cardImage} style={{ objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div className={styles.cardIcon}>{getTabIcon(option.type)}</div>
                                )}
                            </div>
                            <span className={styles.cardPrice}>+{option.price.toLocaleString()} so'm</span>

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
                        <span>Yangi qo'shish</span>
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && editingOption && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContainer}>
                        <div className={styles.modalHeader}>
                            <h3>{editingOption.id ? 'Tahrirlash' : 'Yangi variant'}</h3>
                            <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.modalContent}>
                                <div className={styles.formGroup}>
                                    <label>Nomi (Label)</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={editingOption.label || ''}
                                        onChange={e => setEditingOption({ ...editingOption, label: e.target.value })}
                                        required
                                    />
                                </div>

                                {activeTab === 'size' && (
                                    <div className={styles.formGroup}>
                                        <label>Qo'shimcha ma'lumot (masalan: 30cm)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={editingOption.sub_label || ''}
                                            onChange={e => setEditingOption({ ...editingOption, sub_label: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label>Narxi (so'm)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={editingOption.price || 0}
                                        onChange={e => setEditingOption({ ...editingOption, price: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>

                                {(activeTab === 'cream' || activeTab === 'decoration') && (
                                    <div className={styles.formGroup}>
                                        <label>Rasm URL (ixtiyoriy)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={editingOption.image_url || ''}
                                            onChange={e => setEditingOption({ ...editingOption, image_url: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label>Tartib raqami</label>
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
                                    {saving ? <Loader2 className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
