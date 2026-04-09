'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './WizardShell.module.css';
import {
    SpongeStep,
    CreamStep,
    DecorationStep,
    ReviewStep
} from './Steps';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartActions } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
// BuilderModeSelection and PhotoUploadForm removed

import { useEffect } from 'react';
import { customCakeService } from '@/app/services/customCakeService';
import { useLanguage } from '@/app/context/LanguageContext';

interface WizardShellProps {
    onItemComplete?: (item: any) => void;
    onClose?: () => void;
}

export default function WizardShell({ onItemComplete, onClose }: WizardShellProps) {
    const {
        sponge,
        cream,
        decorations,
        text,
        drawingData,
        options,
        setOptions,
        calculateTotal,
        reset
    } = useCustomCake();
    const { step, nextStep, prevStep } = useCustomCake(); // Extracting step control
    const { addItem } = useCartActions();
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [optionsError, setOptionsError] = React.useState<string | null>(null);

    const STEPS = [
        { title: t('stepSponge'), component: SpongeStep },
        { title: t('stepCream'), component: CreamStep },
        { title: t('stepDecoration'), component: DecorationStep },
        { title: t('stepReview'), component: ReviewStep },
    ];

    useEffect(() => {
        const load = async () => {
            try {
                const opts = await customCakeService.getOptions();
                setOptions(opts);
            } catch (err) {
                console.error('[WizardShell] Failed to load cake options:', err);
                setOptionsError(t('optionsLoadError'));
            }
        };
        load();
    }, []);

    // Mode selection and photo upload removed, always default to wizard

    if (optionsError) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
                <div style={{ textAlign: 'center', color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px' }}>
                    <p style={{ fontWeight: 700, marginBottom: '12px' }}>{optionsError}</p>
                    <button
                        onClick={() => { setOptionsError(null); customCakeService.getOptions().then(setOptions).catch(() => setOptionsError(t('optionsLoadError'))); }}
                        style={{ padding: '8px 20px', borderRadius: '8px', background: '#BE185D', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                        {t('retry')}
                    </button>
                </div>
            </div>
        );
    }

    const CurrentStepComponent = STEPS[step - 1]?.component;
    if (!CurrentStepComponent) return null;
    const progress = (step / STEPS.length) * 100;

    const isNextDisabled = () => {
        if (step === 1 && !sponge) return true;
        if (step === 2 && !cream) return true;
        return false;
    };

    const handleComplete = () => {
        const total = calculateTotal();

        const item: any = {
            id: '00000000-0000-0000-0000-000000000000',
            productId: '00000000-0000-0000-0000-000000000000',
            name: t('customCake'),
            price: 0,
            quantity: 1,
            image: '/images/custom-cake-placeholder.jpg',
            // Portion and flavor for CartItem type
            portion: t('custom'),
            flavor: lang === 'uz' ? (options.find(o => o.id === cream)?.label_uz || t('custom')) : (options.find(o => o.id === cream)?.label_ru || t('custom')),
            configuration: {
                mode: 'wizard',
                sponge_uz: options.find(o => o.id === sponge)?.label_uz,
                sponge_ru: options.find(o => o.id === sponge)?.label_ru,
                flavor_uz: options.find(o => o.id === cream)?.label_uz,
                flavor_ru: options.find(o => o.id === cream)?.label_ru,
                decorations_uz: options.filter(o => decorations.includes(o.id)).map(o => o.label_uz).join(', '),
                decorations_ru: options.filter(o => decorations.includes(o.id)).map(o => o.label_ru).join(', '),
                custom_note: text,
                drawing: drawingData,
                pricing_type: 'hybrid',
                estimated_total: 0
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
            }
        } else {
            prevStep();
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{t('createCake')}</h1>
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
                <div className={styles.buttonGroup}>
                    <button className={styles.prevBtn} onClick={handleBack}>
                        <ChevronLeft size={20} style={{ marginRight: 4 }} />
                        {t('back')}
                    </button>

                    {step < STEPS.length ? (
                        <button
                            className={styles.nextBtn}
                            onClick={nextStep}
                            disabled={isNextDisabled()}
                        >
                            {t('continue')}
                            <ChevronRight size={20} style={{ marginLeft: 4 }} />
                        </button>
                    ) : (
                        <button className={styles.nextBtn} onClick={handleComplete}>
                            {t('addToCart')}
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}
