'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import styles from './page.module.css';

interface Props {
    shareUrl: string;
    copyLabel: string;
    copiedLabel: string;
    shareText: string;
}

export default function CopyShareButton({ shareUrl, copyLabel, copiedLabel, shareText }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            if (navigator.share) {
                setTimeout(() => {
                    navigator.share({ title: "TORTEL'E", text: shareText, url: shareUrl }).catch(() => {});
                }, 300);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={styles.linkBox}>
            <span className={styles.link}>{shareUrl}</span>
            <button className={styles.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={20} /> : <Copy size={20} />}
                <span>{copied ? copiedLabel : copyLabel}</span>
            </button>
        </div>
    );
}
