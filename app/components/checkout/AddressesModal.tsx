'use client';

import React from 'react';
import { X, Home, MapPin, Edit2, Plus } from 'lucide-react';
import styles from './AddressesModal.module.css';
import { useCart, SavedAddress } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';

interface AddressesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (address: SavedAddress) => void;
    onNewAddress?: () => void;
}

export default function AddressesModal({ isOpen, onClose, onSelect, onNewAddress }: AddressesModalProps) {
    const { savedAddresses, setDeliveryAddress } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    const handleSelect = (addr: SavedAddress) => {
        setDeliveryAddress(addr.address);
        if (onSelect) onSelect(addr);
        onClose();
    };

    const handleNewAddress = () => {
        if (onNewAddress) {
            onNewAddress();
        } else {
            router.push('/savat/checkout/map');
        }
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2 className={styles.title}>Адреса</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} color="#111827" />
                    </button>
                </header>

                <div className={styles.addressList}>
                    {savedAddresses.length > 0 ? (
                        savedAddresses.map((addr) => (
                            <div
                                key={addr.id}
                                className={styles.addressItem}
                                onClick={() => handleSelect(addr)}
                            >
                                <div className={`${styles.iconWrapper} ${addr.type === 'home' ? styles.home : ''}`}>
                                    {addr.type === 'home' ? <Home size={24} /> : <MapPin size={24} />}
                                </div>
                                <div className={styles.addressDetails}>
                                    <span className={styles.addressLabel}>{addr.label}</span>
                                    <span className={styles.addressValue}>{addr.address}</span>
                                </div>
                                <button className={styles.editBtn}>
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                            Saqlangan manzillar yo'q
                        </div>
                    )}
                </div>

                <button className={styles.newAddressBtn} onClick={handleNewAddress}>
                    <Plus size={20} />
                    Новый адрес
                </button>
            </div>
        </div>
    );
}
