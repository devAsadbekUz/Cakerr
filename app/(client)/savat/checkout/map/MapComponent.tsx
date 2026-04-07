'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import { ChevronLeft, MapPin, Navigation, Loader2 } from 'lucide-react';
import styles from './page.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401]; // Tashkent

// Custom SVG pin matching app primary colour — avoids missing-image issues in Next.js
const PIN_ICON = L.divIcon({
    html: `<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 28 16 28S32 29 32 16C32 7.163 24.837 0 16 0z" fill="#BE185D"/>
        <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    className: '',
});

function MapClickHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => onMove(e.latlng.lat, e.latlng.lng),
    });
    return null;
}

export default function MapComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    const { setDeliveryAddress, setDeliveryCoords, addSavedAddress, savedAddresses, updateSavedAddress } = useCart();
    const { t, lang } = useLanguage();

    const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
    const [address, setAddress] = useState('');
    const [label, setLabel] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const mapRef = useRef<LeafletMap | null>(null);
    const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Reverse geocoding (debounced 600 ms) ──────────────────────────────────
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
                { headers: { 'Accept-Language': lang === 'ru' ? 'ru' : 'uz,ru' } }
            );
            const data = await res.json();
            const a = data.address || {};
            const parts: string[] = [];
            if (a.road || a.pedestrian || a.footway) parts.push(a.road || a.pedestrian || a.footway);
            if (a.house_number) parts.push(a.house_number);
            if (a.neighbourhood || a.suburb || a.city_district) parts.push(a.neighbourhood || a.suburb || a.city_district);
            setAddress(
                parts.length > 0
                    ? parts.join(', ')
                    : data.display_name?.split(', ').slice(0, 3).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            );
        } catch {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setIsGeocoding(false);
        }
    }, [lang]);

    const debouncedGeocode = useCallback((lat: number, lng: number) => {
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        geocodeTimer.current = setTimeout(() => reverseGeocode(lat, lng), 600);
    }, [reverseGeocode]);

    // ── Load existing address when editing ────────────────────────────────────
    useEffect(() => {
        if (editId) {
            const existing = savedAddresses.find(a => a.id === editId);
            if (existing) {
                setLabel(existing.label || '');
                if (existing.lat && existing.lng) {
                    const pos: [number, number] = [existing.lat, existing.lng];
                    setPosition(pos);
                    setAddress(existing.address);
                    // Pan map after it mounts
                    setTimeout(() => mapRef.current?.setView(pos, 16), 300);
                    return;
                }
            }
        }
        // Initial geocode for default center
        debouncedGeocode(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleMove = useCallback((lat: number, lng: number) => {
        setPosition([lat, lng]);
        debouncedGeocode(lat, lng);
    }, [debouncedGeocode]);

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const pos: [number, number] = [coords.latitude, coords.longitude];
                setPosition(pos);
                mapRef.current?.setView(pos, 17);
                debouncedGeocode(pos[0], pos[1]);
            },
            () => alert(t('locationError'))
        );
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const finalLabel = label.trim() || address.split(',')[0].trim();

            setDeliveryAddress(address);
            setDeliveryCoords({ lat: position[0], lng: position[1] });

            if (editId) {
                await updateSavedAddress(editId, {
                    address,
                    label: finalLabel,
                    lat: position[0],
                    lng: position[1],
                });
            } else {
                await addSavedAddress({
                    address,
                    label: finalLabel,
                    type: 'other',
                    lat: position[0],
                    lng: position[1],
                });
            }
        } finally {
            setIsSaving(false);
        }
        router.back();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={28} />
                </button>
                <h1 className={styles.title}>{t('selectAddress')}</h1>
            </header>

            <MapContainer
                center={DEFAULT_CENTER}
                zoom={15}
                className={styles.map}
                ref={mapRef}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    maxZoom={20}
                />
                <MapClickHandler onMove={handleMove} />
                <Marker
                    position={position}
                    icon={PIN_ICON}
                    draggable
                    eventHandlers={{
                        dragend: (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            handleMove(lat, lng);
                        },
                    }}
                />
            </MapContainer>

            <div className={styles.overlay}>
                <button className={styles.locationBtn} onClick={handleCurrentLocation} type="button">
                    <Navigation size={22} />
                </button>

                <div className={styles.addressCard}>
                    <div className={styles.addressInfo}>
                        {isGeocoding
                            ? <Loader2 size={20} className={`${styles.pinIcon} ${styles.spinning}`} />
                            : <MapPin className={styles.pinIcon} size={20} />
                        }
                        <p className={styles.addressText}>
                            {isGeocoding
                                ? (lang === 'ru' ? 'Определяем адрес…' : 'Manzil aniqlanmoqda…')
                                : (address || '—')}
                        </p>
                    </div>

                    <input
                        className={styles.labelInput}
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder={lang === 'ru' ? 'Название (Дом, Работа…)' : 'Nom (Uy, Ish…)'}
                        maxLength={30}
                    />

                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={!address || isGeocoding || isSaving}
                        type="button"
                    >
                        {isSaving
                            ? (lang === 'ru' ? 'Сохранение…' : 'Saqlanmoqda…')
                            : t('saveAddress')}
                    </button>
                </div>
            </div>
        </div>
    );
}
