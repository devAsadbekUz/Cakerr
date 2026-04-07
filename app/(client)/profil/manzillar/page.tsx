'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, MapPin, Home, Trash2, CheckCircle2, Circle, Edit2 } from 'lucide-react';
import styles from './page.module.css';
import { addressService } from '@/app/services/addressService';
import { UserAddress } from '@/app/types';
import { useSupabase } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';

export default function ManzillarPage() {
    const router = useRouter();
    const { user } = useSupabase();
    const { t } = useLanguage();
    const [addresses, setAddresses] = useState<UserAddress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAddresses();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchAddresses = async () => {
        setLoading(true);
        const data = await addressService.getUserAddresses();
        setAddresses(data);
        setLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(t('deleteAddressPrompt'))) {
            const { error } = await addressService.deleteAddress(id);
            if (!error) {
                setAddresses(prev => prev.filter(a => a.id !== id));
            } else {
                alert(t('errorOccurred') + ': ' + error.message);
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        const { error } = await addressService.setDefaultAddress(id);
        if (!error) {
            setAddresses(prev => prev.map(a => ({
                ...a,
                is_default: a.id === id
            })));
        } else {
            alert(t('errorOccurred') + ': ' + error.message);
        }
    };

    if (!user) {
        return (
            <div className={styles.container}>
                <p>{t('loginRequired')}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>{t('myAddresses')}</h1>
                <button className={styles.addBtn} onClick={() => router.push('/savat/checkout/map')}>
                    <Plus size={24} />
                </button>
            </header>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>{t('loading')}</div>
                ) : addresses.length > 0 ? (
                    <div className={styles.addressList}>
                        {addresses.map((addr) => (
                            <div
                                key={addr.id}
                                className={`${styles.addressCard} ${addr.is_default ? styles.defaultCard : ''}`}
                                onClick={() => handleSetDefault(addr.id)}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.labelSection}>
                                        {addr.label.toLowerCase() === 'uy' ? <Home size={20} /> : <MapPin size={20} />}
                                        <span className={styles.label}>{addr.label}</span>
                                    </div>
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.editBtn}
                                            onClick={(e) => { e.stopPropagation(); router.push(`/savat/checkout/map?edit=${addr.id}`); }}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button className={styles.deleteBtn} onClick={(e) => handleDelete(addr.id, e)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <p className={styles.addressText}>{addr.address_text}</p>

                                {(addr.apartment || addr.floor) && (
                                    <p className={styles.details}>
                                        {addr.apartment && `${t('apartment')}: ${addr.apartment}`}
                                        {addr.floor && ` • ${t('floor')}: ${addr.floor}`}
                                    </p>
                                )}

                                <div className={styles.status}>
                                    {addr.is_default ? (
                                        <div className={styles.defaultBadge}>
                                            <CheckCircle2 size={16} />
                                            <span>{t('defaultAddress')}</span>
                                        </div>
                                    ) : (
                                        <div className={styles.setAsDefault}>
                                            <Circle size={16} />
                                            <span>{t('setAsDefault')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <MapPin size={64} className={styles.emptyIcon} />
                        <h3>{t('noSavedAddresses')}</h3>
                        <p>{t('noAddressesDesc')}</p>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => router.push('/savat/checkout/map')}
                        >
                            {t('addNewAddress')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
