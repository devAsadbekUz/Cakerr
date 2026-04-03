'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import styles from './page.module.css';
import { ChevronLeft, MapPin, Navigation, Loader2 } from 'lucide-react';
import Script from 'next/script';
import Head from 'next/head';
import { useLanguage } from '@/app/context/LanguageContext';

declare var L: any;

function MapContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const { setDeliveryAddress, setDeliveryCoords, addSavedAddress, savedAddresses, updateSavedAddress } = useCart();
    const { t } = useLanguage();
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [address, setAddress] = useState('');
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (scriptLoaded && mapRef.current && !map) {
            const L = (window as any).L;
            if (!L) return;

            let initialPos: [number, number] = [41.2995, 69.2401]; // Tashkent default

            // If editing, find existing position
            if (editId) {
                const addrToEdit = savedAddresses.find(a => a.id === editId);
                if (addrToEdit) {
                    if (addrToEdit.lat && addrToEdit.lng) {
                        initialPos = [addrToEdit.lat, addrToEdit.lng];
                    }
                    setAddress(addrToEdit.address);
                }
            }

            const leafletMap = L.map(mapRef.current).setView(initialPos, 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);

            const selectionMarker = L.marker(initialPos, { draggable: true }).addTo(leafletMap);

            setMap(leafletMap);
            setMarker(selectionMarker);

            // Initial address fetch
            fetchAddress(initialPos[0], initialPos[1]);

            selectionMarker.on('dragend', (e: any) => {
                const pos = e.target.getLatLng();
                fetchAddress(pos.lat, pos.lng);
            });

            // Clicking on map moves marker
            leafletMap.on('click', (e: any) => {
                selectionMarker.setLatLng(e.latlng);
                fetchAddress(e.latlng.lat, e.latlng.lng);
            });

            // Fix for map not rendering correctly in some containers
            setTimeout(() => {
                leafletMap.invalidateSize();
            }, 100);
        }
    }, [scriptLoaded, map]);

    const fetchAddress = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            // Simplify address for UI
            const displayName = data.display_name || '';
            const parts = displayName.split(', ');
            const shortAddress = parts.slice(0, 3).join(', ');
            setAddress(shortAddress || t('unknownAddress'));
        } catch (error) {
            setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
    };

    const handleSave = () => {
        setDeliveryAddress(address);

        // Guard against marker not being initialized yet
        if (!marker) {
            alert(t('mapNotReady'));
            return;
        }

        const latlng = marker.getLatLng();
        setDeliveryCoords({ lat: latlng.lat, lng: latlng.lng });

        if (editId) {
            updateSavedAddress(editId, {
                address: address,
                label: address.split(',')[0].trim(),
                lat: latlng.lat,
                lng: latlng.lng
            });
        } else {
            addSavedAddress({
                address: address,
                label: address.split(',')[0].trim(),
                type: 'other',
                lat: latlng.lat,
                lng: latlng.lng
            });
        }
        router.back();
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation && map && marker) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 16);
                marker.setLatLng([latitude, longitude]);
                fetchAddress(latitude, longitude);
            }, (error) => {
                console.error('Geolocation error', error);
                alert(t('locationError'));
            });
        }
    };

    return (
        <div className={styles.container}>
            {/* Leaflet CSS - Critical for map to render */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                strategy="afterInteractive"
                onLoad={() => setScriptLoaded(true)}
            />

            {/* Loading overlay while map initializes */}
            {!map && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#BE185D'
                }}>
                    <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('mapLoading')}</span>
                </div>
            )}

            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={28} />
                </button>
                <h1 className={styles.title}>{t('selectAddress')}</h1>
            </header>

            <div ref={mapRef} className={styles.map} />

            <div className={styles.overlay}>
                <button className={styles.locationBtn} onClick={handleCurrentLocation}>
                    <Navigation size={24} />
                </button>

                <div className={styles.addressCard}>
                    <div className={styles.addressInfo}>
                        <MapPin className={styles.pinIcon} size={24} />
                        <p className={styles.addressText}>{address}</p>
                    </div>
                    <button className={styles.saveBtn} onClick={handleSave}>
                        {t('saveAddress')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>...</div>}>
            <MapContent />
        </Suspense>
    );
}
