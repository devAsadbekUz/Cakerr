'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, MapPin, Globe } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';
import { adminFetch, adminInsert, adminUpdate, adminDelete } from '@/app/utils/adminApi';

interface Branch {
    id: string;
    name_uz: string;
    name_ru: string;
    address_uz: string;
    address_ru: string;
    location_link: string | null;
    is_active: boolean;
}

export default function BranchesManager() {
    const { t } = useAdminI18n();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<Partial<Branch>>({
        name_uz: '',
        name_ru: '',
        address_uz: '',
        address_ru: '',
        location_link: '',
        is_active: true
    });

    const fetchBranches = async () => {
        setLoading(true);
        const data = await adminFetch<Branch>({
            table: 'branches',
            orderBy: 'name_uz',
            orderAsc: true
        });

        setBranches(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleEdit = (branch: Branch) => {
        setEditingId(branch.id);
        setFormData(branch);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({
            name_uz: '',
            name_ru: '',
            address_uz: '',
            address_ru: '',
            location_link: '',
            is_active: true
        });
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                const success = await adminUpdate('branches', editingId, formData);
                if (!success) throw new Error('Update failed');
            } else {
                const success = await adminInsert('branches', formData);
                if (!success) throw new Error('Insert failed');
            }
            handleCancel();
            fetchBranches();
        } catch (error: any) {
            console.error('Error saving branch:', error);
            alert(`${t('error')}: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDeleteBranch'))) return;
        try {
            const success = await adminDelete('branches', id);
            if (!success) throw new Error('Delete failed');
            fetchBranches();
        } catch (error: any) {
            console.error('Error deleting branch:', error);
            alert(`${t('error')}: ${error.message || 'Unknown error'}`);
        }
    };

    const toggleStatus = async (branch: Branch) => {
        try {
            const success = await adminUpdate('branches', branch.id, { is_active: !branch.is_active });
            if (!success) throw new Error('Update failed');
            fetchBranches();
        } catch (error: any) {
            console.error('Error toggling branch status:', error);
        }
    };

    return (
        <section className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={24} color="hsl(var(--color-primary-dark))" />
                    {t('branchesTitle')}
                </h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    style={{ background: 'hsl(var(--color-primary-dark))', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Plus size={18} /> {t('add')}
                </button>
            </div>

            {(isAdding || editingId) && (
                <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{t('branchNameUz')}</label>
                            <input
                                type="text"
                                value={formData.name_uz}
                                onChange={(e) => setFormData({ ...formData, name_uz: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{t('branchNameRu')}</label>
                            <input
                                type="text"
                                value={formData.name_ru}
                                onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{t('branchAddrUz')}</label>
                            <input
                                type="text"
                                value={formData.address_uz}
                                onChange={(e) => setFormData({ ...formData, address_uz: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{t('branchAddrRu')}</label>
                            <input
                                type="text"
                                value={formData.address_ru}
                                onChange={(e) => setFormData({ ...formData, address_ru: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{t('locationLink')}</label>
                            <input
                                type="text"
                                value={formData.location_link || ''}
                                onChange={(e) => setFormData({ ...formData, location_link: e.target.value })}
                                placeholder="https://maps.google.com/..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button onClick={handleCancel} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #D1D5DB', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            {t('cancel')}
                        </button>
                        <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#059669', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            {t('save')}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: '20px' }}>{t('loading')}</p>
                ) : branches.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>{t('noData')}</p>
                ) : (
                    branches.map((branch) => (
                        <div key={branch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#FDF2F8', borderRadius: '16px', border: '1px solid #FBCFE8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'white', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={20} color="#BE185D" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{branch.name_uz} / {branch.name_ru}</h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280' }}>{branch.address_uz}</p>
                                    {branch.location_link && (
                                        <a href={branch.location_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3B82F6', marginTop: '4px', textDecoration: 'none' }}>
                                            <Globe size={10} /> {t('locationLink')}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => toggleStatus(branch)} style={{ color: branch.is_active ? '#059669' : '#9CA3AF', background: 'white', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                    {branch.is_active ? t('visible') : t('hidden')}
                                </button>
                                <button onClick={() => handleEdit(branch)} style={{ color: '#4B5563', background: 'white', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(branch.id)} style={{ color: '#EF4444', background: 'white', border: '1px solid #E5E7EB', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
