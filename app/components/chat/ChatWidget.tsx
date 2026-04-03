'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import styles from './ChatWidget.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatWidget() {
    const { t } = useLanguage();
    const QUICK_ACTIONS = [t('chatQuestion1'), t('chatQuestion2'), t('chatQuestion3')];

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasUnread, setHasUnread] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

    // Keep welcome message in sync with language
    useEffect(() => {
        setMessages(prev => {
            const welcome = { id: 'welcome', role: 'assistant' as const, content: t('chatWelcome') };
            if (prev.length === 0) return [welcome];
            if (prev[0].id === 'welcome') return [welcome, ...prev.slice(1)];
            return prev;
        });
    }, [t]);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    useEffect(() => {
        // Only scroll if the chat is actually open OR if we are currently loading (streaming response)
        // This prevents background CPU usage when the app first loads.
        if (isOpen || isLoading) {
            scrollToBottom(isLoading ? 'auto' : 'smooth');
        }
    }, [messages, isLoading, isOpen, scrollToBottom]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setHasUnread(false);
        }
    }, [isOpen]);

    // Cleanup reader on unmount
    useEffect(() => {
        return () => {
            if (readerRef.current) {
                readerRef.current.cancel();
            }
        };
    }, []);

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        // Cancel any existing stream reader
        if (readerRef.current) {
            try {
                readerRef.current.cancel();
                readerRef.current = null;
            } catch (e) {
                console.error('[ChatWidget] Error cancelling reader:', e);
            }
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: content.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        // Build message history for API (exclude welcome message)
        const apiMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage].map(m => ({
            role: m.role,
            content: m.content,
        }));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t('chatError'));
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const assistantId = `assistant-${Date.now()}`;

            // Add an empty assistant message that we'll fill in
            setMessages(prev => [...prev, {
                id: assistantId,
                role: 'assistant',
                content: '',
            }]);

            let fullContent = '';

            if (reader) {
                readerRef.current = reader;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                    for (const line of lines) {
                        const data = line.slice(6); // Remove 'data: ' prefix
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullContent += parsed.content;
                                // Update the assistant message content
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === assistantId
                                            ? { ...m, content: fullContent }
                                            : m
                                    )
                                );
                            }
                        } catch {
                            // Skip unparseable chunks
                        }
                    }
                }
            }

            // Mark as unread if chat is closed
            if (!isOpen) {
                setHasUnread(true);
            }
        } catch (err: any) {
            console.error('[ChatWidget] Error:', err);
            setError(err.message || t('chatError'));
        } finally {
            setIsLoading(false);
            readerRef.current = null;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleQuickAction = (action: string) => {
        sendMessage(action);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const showQuickActions = messages.length <= 1 && !isLoading;

    return (
        <>
            {/* Chat toggle button */}
            <button
                className={`${styles.toggleButton} ${isOpen ? styles.toggleButtonOpen : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? t('chatClose') : t('chatOpen')}
                id="chat-toggle-btn"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                {hasUnread && !isOpen && (
                    <span className={styles.unreadBadge}>!</span>
                )}
            </button>

            {/* Chat window */}
            {isOpen && (
                <>
                    {/* Backdrop — tap outside to close */}
                    <div
                        className={styles.backdrop}
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div className={styles.chatWindow} id="chat-window">
                        {/* Header */}
                        <div className={styles.chatHeader}>
                            <div className={styles.botAvatar}>🎂</div>
                            <div className={styles.headerInfo}>
                                <div className={styles.headerTitle}>{t('chatTitle')}</div>
                                <div className={styles.headerSubtitle}>{t('chatSubtitle')}</div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className={styles.messagesContainer} id="chat-messages">
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.botMessage
                                        }`}
                                >
                                    {message.content}
                                </div>
                            ))}

                            {isLoading && (
                                <div className={styles.typingIndicator}>
                                    <div className={styles.typingDot} />
                                    <div className={styles.typingDot} />
                                    <div className={styles.typingDot} />
                                </div>
                            )}

                            {error && (
                                <div className={styles.errorMessage}>
                                    {error}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick action chips */}
                        {showQuickActions && (
                            <div className={styles.quickActions}>
                                {QUICK_ACTIONS.map(action => (
                                    <button
                                        key={action}
                                        className={styles.quickAction}
                                        onClick={() => handleQuickAction(action)}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input area */}
                        <form className={styles.inputArea} onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                className={styles.input}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('chatPlaceholder')}
                                disabled={isLoading}
                                id="chat-input"
                                autoComplete="off"
                            />
                            <button
                                className={styles.sendButton}
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                aria-label="Yuborish"
                                id="chat-send-btn"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </>
    );
}
