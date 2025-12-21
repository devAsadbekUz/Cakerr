import React from 'react';
import styles from './MenuItem.module.css';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface MenuItemProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    color?: string;
}

export default function MenuItem({ icon: Icon, label, onClick, color = '#1F2937' }: MenuItemProps) {
    return (
        <button className={styles.item} onClick={onClick}>
            <div className={styles.left}>
                <div className={styles.iconWrapper} style={{ backgroundColor: `${color}10` }}>
                    <Icon size={20} color={color} />
                </div>
                <span className={styles.label}>{label}</span>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
        </button>
    );
}
