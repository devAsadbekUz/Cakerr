'use client';

import React from 'react';
import { X, Home, MapPin, Edit2, Plus, Trash2 } from 'lucide-react';
import styles from './AddressesModal.module.css';
import { useCart, SavedAddress } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';

interface AddressesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (address: SavedAddress) => void;
    onNewAddress?: () => void;
    onEdit?: (address: SavedAddress) => void;
}

export default function AddressesModal({ isOpen, onClose, onSelect, onNewAddress, onEdit }: AddressesModalProps) {
    const { savedAddresses, setDeliveryAddress, setDeliveryCoords, removeSavedAddress } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    const handleSelect = (addr: SavedAddress) => {
        setDeliveryAddress(addr.address);
        if (addr.lat && addr.lng) {
            setDeliveryCoords({ lat: addr.lat, lng: addr.lng });
        } else {
            setDeliveryCoords(null);
        }
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

    const handleEdit = (addr: SavedAddress, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't select, just edit
        if (onEdit) {
            onEdit(addr);
        } else {
            router.push(`/savat/checkout/map?edit=${addr.id}`);
        }
        onClose();
    };

    const handleDelete = (addr: SavedAddress, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't select, just delete
        if (confirm(`"${addr.label}" manzilini o'chirmoqchimisiz?`)) {
            removeSavedAddress(addr.id);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2 className={styles.title}>Manzillar</h2>
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
                                <div className={styles.actions}>
                                    <button className={styles.editBtn} onClick={(e) => handleEdit(addr, e)}>
                                        <Edit2 size={18} />
                                    </button>
                                    <button className={styles.deleteBtn} onClick={(e) => handleDelete(addr, e)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
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
                    Yangi manzil
                </button>
            </div>
        </div>
    );
}
