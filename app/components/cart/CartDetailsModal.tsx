import React from 'react';
import { X, Ruler, Users, Utensils } from 'lucide-react';
import styles from './CartDetailsModal.module.css';
import { CartItem } from '@/app/context/CartContext';

interface CartDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: CartItem;
}

export default function CartDetailsModal({ isOpen, onClose, item }: CartDetailsModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <img src={item.image} alt={item.name} className={styles.image} />
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <h2 className={styles.title}>{item.name}</h2>
                    <p className={styles.price}>{item.price.toLocaleString('en-US')} so'm</p>

                    <div className={styles.detailsList}>
                        <div className={styles.row}>
                            <span className={styles.label}>Porsiya</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={16} color="#9CA3AF" />
                                <span className={styles.value}>{item.portion} kishilik</span>
                            </div>
                        </div>

                        {item.diameter && (
                            <div className={styles.row}>
                                <span className={styles.label}>Diametr</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Ruler size={16} color="#9CA3AF" />
                                    <span className={styles.value}>{item.diameter} sm</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.row}>
                            <span className={styles.label}>Ta'mi</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Utensils size={16} color="#9CA3AF" />
                                <span className={styles.value}>{item.flavor}</span>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <span className={styles.label}>Soni</span>
                            <span className={styles.value}>{item.quantity} ta</span>
                        </div>
                    </div>

                    {item.customNote && (
                        <div className={styles.noteBox}>
                            <span className={styles.noteLabel}>Sizning izohingiz:</span>
                            <p className={styles.noteText}>{item.customNote}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
