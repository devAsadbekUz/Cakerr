'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Send, MessageSquare, Clock, Users, User,
    Search, X, AlertTriangle, CheckCircle, XCircle, Filter
} from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { format } from 'date-fns';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from './page.module.css';

interface UserProfile {
    id: string;
    telegram_id: number;
    full_name: string | null;
    phone_number: string | null;
}

interface AdminMessage {
    id: string;
    recipient_type: string;
    recipient_id: string | null;
    message_text: string;
    total_recipients: number;
    successful_sends: number;
    failed_sends: number;
    created_at: string;
}

type RecipientType = 'individual' | 'broadcast' | 'segment';
type Tab = 'compose' | 'history';

export default function AdminMessagesPage() {
    const { lang, t } = useAdminI18n();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('compose');
    const supabase = useMemo(() => createClient(), []);

    // Compose state
    const [recipientType, setRecipientType] = useState<RecipientType>('broadcast');
    const [messageText, setMessageText] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [segmentFilter, setSegmentFilter] = useState({ hasOrdered: false });
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // History state
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // User count for broadcast info
    const [totalBotUsers, setTotalBotUsers] = useState(0);

    useEffect(() => {
        setMounted(true);
        fetchBotUserCount();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchBotUserCount = async () => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .not('telegram_id', 'is', null);
        setTotalBotUsers(count || 0);
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/api/admin/messages/history');
            const data = await res.json();
            setMessages(data.messages || []);
        } catch {
            console.error('Failed to fetch message history');
        }
        setHistoryLoading(false);
    };

    // Search users with debounce
    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('id, telegram_id, full_name, phone_number')
            .not('telegram_id', 'is', null)
            .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
            .limit(10);

        setSearchResults(data || []);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchUsers(userSearch), 300);
        return () => clearTimeout(timer);
    }, [userSearch, searchUsers]);

    const handleSend = () => {
        if (!messageText.trim()) return;
        if (recipientType === 'individual' && !selectedUser) return;
        setShowConfirm(true);
    };

    const confirmSend = async () => {
        setShowConfirm(false);
        setSending(true);

        try {
            const res = await fetch('/api/admin/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientType,
                    recipientId: selectedUser?.id,
                    segmentFilter: recipientType === 'segment' ? segmentFilter : undefined,
                    messageText: messageText.trim()
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setToast({
                    type: 'success',
                    message: `✅ ${t('confirmSendSuccess').replace('{sent}', data.sent).replace('{total}', data.total)}`
                });
                setMessageText('');
                setSelectedUser(null);
                setUserSearch('');
            } else {
                setToast({
                    type: 'error',
                    message: `❌ ${t('error')}: ${data.error || t('unknown')}`
                });
            }
        } catch {
            setToast({ type: 'error', message: `❌ ${t('networkError')}` });
        }

        setSending(false);
    };

    const getRecipientLabel = () => {
        switch (recipientType) {
            case 'individual': return selectedUser?.full_name || t('selectUser');
            case 'broadcast': return `${t('everyone')} (${totalBotUsers})`;
            case 'segment': return t('segment');
        }
    };

    const canSend = messageText.trim().length > 0 &&
        (recipientType !== 'individual' || selectedUser !== null);

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            {/* Toast */}
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.title}>{t('messages')}</h1>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'compose' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('compose')}
                    >
                        <Send size={16} />
                        {t('compose')}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <Clock size={16} />
                        {t('history')}
                    </button>
                </div>
            </header>

            {activeTab === 'compose' ? (
                <div className={styles.composeCard}>
                    {/* Recipient Type */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('sendTo')}</label>
                        <div className={styles.recipientTypes}>
                            <button
                                className={`${styles.recipientType} ${recipientType === 'broadcast' ? styles.recipientTypeActive : ''}`}
                                onClick={() => { setRecipientType('broadcast'); setSelectedUser(null); }}
                            >
                                <Users size={18} />
                                {t('everyone')}
                            </button>
                            <button
                                className={`${styles.recipientType} ${recipientType === 'individual' ? styles.recipientTypeActive : ''}`}
                                onClick={() => setRecipientType('individual')}
                            >
                                <User size={18} />
                                {t('individual')}
                            </button>
                            <button
                                className={`${styles.recipientType} ${recipientType === 'segment' ? styles.recipientTypeActive : ''}`}
                                onClick={() => { setRecipientType('segment'); setSelectedUser(null); }}
                            >
                                <Filter size={18} />
                                {t('segment')}
                            </button>
                        </div>
                    </div>

                    {/* Individual: User Search */}
                    {recipientType === 'individual' && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('selectUser')}</label>
                            {selectedUser ? (
                                <div className={styles.selectedUser}>
                                    <span>{selectedUser.full_name || selectedUser.phone_number}</span>
                                    <button className={styles.removeUser} onClick={() => setSelectedUser(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.searchWrapper}>
                                    <Search size={18} className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder={t('searchPlaceholder')}
                                        value={userSearch}
                                        onChange={(e) => { setUserSearch(e.target.value); setShowSearch(true); }}
                                        onFocus={() => setShowSearch(true)}
                                        onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                                    />
                                    {showSearch && searchResults.length > 0 && (
                                        <div className={styles.searchResults}>
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    className={styles.userItem}
                                                    onMouseDown={() => {
                                                        setSelectedUser(user);
                                                        setUserSearch('');
                                                        setShowSearch(false);
                                                    }}
                                                >
                                                    <div className={styles.userAvatar}>
                                                        {(user.full_name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className={styles.userName}>{user.full_name || t('unknown')}</div>
                                                        <div className={styles.userPhone}>{user.phone_number}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Segment: Filters */}
                    {recipientType === 'segment' && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('filtering')}</label>
                            <div className={styles.segmentFilters}>
                                <label className={`${styles.filterCheckbox} ${segmentFilter.hasOrdered ? styles.filterCheckboxActive : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={segmentFilter.hasOrdered}
                                        onChange={(e) => setSegmentFilter({ ...segmentFilter, hasOrdered: e.target.checked })}
                                    />
                                    <div>
                                        <div className={styles.filterLabel}>{t('orderedBefore')}</div>
                                        <div className={styles.filterDesc}>{t('orderedBeforeDesc')}</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Broadcast info */}
                    {recipientType === 'broadcast' && (
                        <div className={styles.formGroup}>
                            <div style={{
                                background: '#FEF3C7',
                                padding: '14px 16px',
                                borderRadius: '14px',
                                fontSize: '14px',
                                color: '#92400E',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontWeight: 500
                            }}>
                                <AlertTriangle size={18} />
                                {t('allUsersCount').replace('{count}', totalBotUsers.toString())}
                            </div>
                        </div>
                    )}

                    {/* Message Text */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('messageTextLabel')}</label>
                        <textarea
                            className={styles.textarea}
                            placeholder={t('messagePlaceholder')}
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            maxLength={4096}
                        />
                        <div className={`${styles.charCount} ${messageText.length > 3800 ? styles.charCountWarn : ''}`}>
                            {messageText.length} / 4096
                        </div>
                    </div>

                    {/* Send Button */}
                    <button
                        className={styles.sendButton}
                        onClick={handleSend}
                        disabled={!canSend || sending}
                    >
                        {sending ? (
                            <>
                                <div className={styles.spinner} />
                                {t('loading')}
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                {t('sendMessageButton')}
                            </>
                        )}
                    </button>
                </div>
            ) : (
                /* History Tab */
                <div>
                    {historyLoading ? (
                        <div className={styles.emptyState}>{t('loading')}</div>
                    ) : messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📭</div>
                            <div className={styles.emptyTitle}>{t('noMessagesYet')}</div>
                            <div className={styles.emptyText}>{t('noMessagesDesc')}</div>
                        </div>
                    ) : (
                        <div className={styles.historyList}>
                            {messages.map(msg => (
                                <div key={msg.id} className={styles.historyCard}>
                                    <div className={styles.historyTop}>
                                        <div className={styles.historyMeta}>
                                            <span className={`${styles.historyBadge} ${msg.recipient_type === 'broadcast' ? styles.badgeBroadcast :
                                                    msg.recipient_type === 'individual' ? styles.badgeIndividual :
                                                        styles.badgeSegment
                                                }`}>
                                                {msg.recipient_type === 'broadcast' ? `📢 ${t('everyone')}` :
                                                    msg.recipient_type === 'individual' ? `👤 ${t('personal')}` :
                                                        `🎯 ${t('segment')}`}
                                            </span>
                                        </div>
                                        <span className={styles.historyDate}>
                                            {format(new Date(msg.created_at), 'dd.MM.yyyy HH:mm')}
                                        </span>
                                    </div>
                                    <div className={styles.historyText}>{msg.message_text}</div>
                                    <div className={styles.historyStats}>
                                        <span className={styles.statTotal}>📨 {msg.total_recipients} {t('totalRecipients')}</span>
                                        <span className={styles.statSuccess}>✅ {msg.successful_sends} {t('sentSuccess')}</span>
                                        {msg.failed_sends > 0 && (
                                            <span className={styles.statFail}>❌ {msg.failed_sends} {t('sendErrors')}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIcon} ${styles.modalIconWarn}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('sendConfirmTitle')}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6B7280' }}>
                                    {getRecipientLabel()}
                                </p>
                            </div>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalPreview}>{messageText}</div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setShowConfirm(false)}>
                                {t('cancel')}
                            </button>
                            <button className={styles.btnConfirm} onClick={confirmSend}>
                                <Send size={16} style={{ marginRight: '6px' }} />
                                {t('sendMessageButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
