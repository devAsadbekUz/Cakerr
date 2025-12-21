'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Bell, Globe, Moon, Lock, Trash2, FileText, Shield, Info } from 'lucide-react';
import styles from './page.module.css';

export default function SettingsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState({
        orders: true,
        promotions: false,
        reminders: true
    });

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>Sozlamalar</h1>
            </header>

            {/* Notifications */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Bildirishnomalar</h2>
                <div className={styles.settingsList}>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Bell size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Buyurtma yangiliklari</h3>
                                <p>Buyurtma holati haqida xabar oling</p>
                            </div>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={notifications.orders}
                                onChange={() => toggleNotification('orders')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Bell size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Aksiyalar va chegirmalar</h3>
                                <p>Maxsus takliflar haqida bilib oling</p>
                            </div>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={notifications.promotions}
                                onChange={() => toggleNotification('promotions')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Bell size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Eslatmalar</h3>
                                <p>Muhim sanalar haqida eslatma</p>
                            </div>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={notifications.reminders}
                                onChange={() => toggleNotification('reminders')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Afzalliklar</h2>
                <div className={styles.settingsList}>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Globe size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Til</h3>
                                <p>O'zbekcha</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Moon size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Qorong'i rejim</h3>
                                <p>Tez kunda</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                </div>
            </div>

            {/* Privacy */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Maxfiylik va xavfsizlik</h2>
                <div className={styles.settingsList}>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Lock size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Parolni o'zgartirish</h3>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Trash2 size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Keshni tozalash</h3>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                </div>
            </div>

            {/* Legal */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Huquqiy</h2>
                <div className={styles.settingsList}>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <FileText size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Foydalanish shartlari</h3>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                    <button className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Shield size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Maxfiylik siyosati</h3>
                            </div>
                        </div>
                        <ChevronRight size={20} className={styles.chevron} />
                    </button>
                </div>
            </div>

            {/* About */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Ilova haqida</h2>
                <div className={styles.settingsList}>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <Info size={20} className={styles.settingIcon} />
                            <div>
                                <h3>Versiya</h3>
                                <p>1.0.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={styles.section}>
                <div className={styles.dangerZone}>
                    <button className={styles.dangerBtn}>
                        <Trash2 size={20} />
                        <span>Akkauntni o'chirish</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
