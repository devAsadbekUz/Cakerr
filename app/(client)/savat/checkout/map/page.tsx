'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import styles from './page.module.css';

// ssr: false — Leaflet requires browser APIs (window, document)
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

export default function MapPage() {
    return (
        <Suspense
            fallback={
                <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                    <span style={{ color: '#BE185D', fontWeight: 600 }}>…</span>
                </div>
            }
        >
            <MapComponent />
        </Suspense>
    );
}
