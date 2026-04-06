'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './WizardShell.module.css';
import {
    ShapeStep,
    SizeStep,
    SpongeStep,
    CreamStep,
    DecorationStep,
    ReviewStep
} from './Steps';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartActions } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import BuilderModeSelection from './BuilderModeSelection';
import PhotoUploadForm from './PhotoUploadForm';

import { useEffect } from 'react';
import { customCakeService } from '@/app/services/customCakeService';

const STEPS = [
    { title: 'Shakl', component: ShapeStep },
    { title: 'Hajm', component: SizeStep },
    { title: 'Biskvit', component: SpongeStep },
    { title: 'Krem', component: CreamStep },
    { title: 'Bezak', component: DecorationStep },
    { title: 'Tekshirish', component: ReviewStep },
];

interface WizardShellProps {
    onItemComplete?: (item: any) => void;
    onClose?: () => void;
}

export default function WizardShell({ onItemComplete, onClose }: WizardShellProps) {
    const {
        mode,
        step,
        nextStep,
        prevStep,
        setMode,
        shape,
        size,
        sponge,
        cream,
        decorations,
        text,
        drawingData,
        uploadedImage,
        uploadComment,
        options,
        setOptions,
        calculateTotal,
        reset
    } = useCustomCake();
    const { addItem } = useCartActions();
    const router = useRouter();
    const [optionsError, setOptionsError] = React.useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const opts = await customCakeService.getOptions();
                setOptions(opts);
            } catch (err) {
                console.error('[WizardShell] Failed to load cake options:', err);
                setOptionsError('Variantlarni yuklashda xatolik yuz berdi. Sahifani yangilang.');
            }
        };
        load();
    }, []);

    if (!mode) {
        return <BuilderModeSelection />;
    }

    if (mode === 'upload') {
        return <PhotoUploadForm />;
    }

    if (optionsError) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
                <div style={{ textAlign: 'center', color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px' }}>
                    <p style={{ fontWeight: 700, marginBottom: '12px' }}>{optionsError}</p>
                    <button
                        onClick={() => { setOptionsError(null); customCakeService.getOptions().then(setOptions).catch(() => setOptionsError('Variantlarni yuklashda xatolik yuz berdi. Sahifani yangilang.')); }}
                        style={{ padding: '8px 20px', borderRadius: '8px', background: '#BE185D', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Qayta urinish
                    </button>
                </div>
            </div>
        );
    }

    const CurrentStepComponent = STEPS[step - 1]?.component;
    if (!CurrentStepComponent) return null;
    const progress = (step / STEPS.length) * 100;

    const isNextDisabled = () => {
        if (step === 1 && !shape) return true;
        if (step === 2 && !size) return true;
        if (step === 3 && !sponge) return true;
        if (step === 4 && !cream) return true;
        return false;
    };

    const handleComplete = () => {
        const total = calculateTotal();

        const item: any = {
            id: '00000000-0000-0000-0000-000000000000',
            productId: '00000000-0000-0000-0000-000000000000',
            name: 'Maxsus tort',
            price: total,
            quantity: 1,
            image: '/images/custom-cake-placeholder.jpg',
            // Portsiya and flavor are required by CartItem type
            portion: options.find(o => o.id === size)?.label || 'Maxsus',
            flavor: options.find(o => o.id === cream)?.label || 'Maxsus',
            configuration: {
                mode,
                // Shape is now stored by DB UUID — look it up from options
                shape: options.find(o => o.id === shape)?.label || shape,
                size: options.find(o => o.id === size)?.label,
                sponge: options.find(o => o.id === sponge)?.label,
                flavor: options.find(o => o.id === cream)?.label,
                decorations: options.filter(o => decorations.includes(o.id)).map(o => o.label).join(', '),
                custom_note: text,
                drawing: drawingData,
                uploaded_photo_url: uploadedImage,
                order_note: uploadComment,
                pricing_type: 'hybrid',
                estimated_total: total
            }
        };

        if (onItemComplete) {
            onItemComplete(item);
            return;
        }

        addItem(item);
        reset();
        router.push('/savat');
    };

    const handleBack = () => {
        if (step === 1) {
            if (onClose) {
                onClose();
            } else {
                setMode(null);
            }
        } else {
            prevStep();
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Tort Yaratish</h1>
                <p>{STEPS[step - 1]?.title} - {step}/{STEPS.length}</p>
                <div className={styles.progressContainer}>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </header>

            <main className={styles.stepContent}>
                <CurrentStepComponent />
            </main>

            <footer className={styles.footer}>
                <div className={styles.priceBar}>
                    <span className={styles.priceLabel}>Taxminiy narxi*</span>
                    <span className={styles.priceValue}>{calculateTotal().toLocaleString()} so'm</span>
                </div>

                <div className={styles.buttonGroup}>
                    <button className={styles.prevBtn} onClick={handleBack}>
                        <ChevronLeft size={20} style={{ marginRight: 4 }} />
                        Orqaga
                    </button>

                    {step < STEPS.length ? (
                        <button
                            className={styles.nextBtn}
                            onClick={nextStep}
                            disabled={isNextDisabled()}
                        >
                            Davom etish
                            <ChevronRight size={20} style={{ marginLeft: 4 }} />
                        </button>
                    ) : (
                        <button className={styles.nextBtn} onClick={handleComplete}>
                            Savatga qo'shish
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}
