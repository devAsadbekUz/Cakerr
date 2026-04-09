'use client';

import React, { useEffect, useState } from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './WizardShell.module.css';
import {
    TypeStep,
    DesignStep,
    NachinkaStep,
    SizeStep,
    ReviewStep
} from './Steps';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartActions } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';

import { customCakeService } from '@/app/services/customCakeService';
import { useLanguage } from '@/app/context/LanguageContext';

interface WizardShellProps {
    onItemComplete?: (item: any) => void;
    onClose?: () => void;
}

export default function WizardShell({ onItemComplete, onClose }: WizardShellProps) {
    const {
        cakeType,
        nachinka,
        size,
        photoRef,
        comment,
        drawingData,
        options,
        setOptions,
        calculateTotal,
        reset
    } = useCustomCake();
    const { step, nextStep, prevStep } = useCustomCake();
    const { addItem } = useCartActions();
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [optionsError, setOptionsError] = useState<string | null>(null);

    const STEPS = [
        { title: t('stepType'), component: TypeStep },
        { title: t('stepDesign'), component: DesignStep },
        { title: t('stepNachinka'), component: NachinkaStep },
        { title: t('stepSize'), component: SizeStep },
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
    }, [setOptions, t]);

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

    const progress = (step / STEPS.length) * 100;

    const isNextDisabled = () => {
        if (step === 1 && !cakeType) return true;
        if (step === 2) return false; // Design step is optional
        if (step === 3 && !nachinka) return true;
        if (step === 4 && !size) return true;
        return false;
    };

    const handleComplete = () => {
        const selectedType = options.find(o => o.id === cakeType);
        const selectedNachinka = options.find(o => o.id === nachinka);
        const selectedSize = options.find(o => o.id === size);

        const item: any = {
            id: crypto.randomUUID(),
            productId: '00000000-0000-0000-0000-000000000000',
            name: t('customCake'),
            price: 0,
            quantity: 1,
            image: photoRef || selectedType?.image_url || '/images/custom-cake-placeholder.jpg',
            portion: lang === 'uz' ? selectedSize?.label_uz : selectedSize?.label_ru || selectedSize?.label_uz,
            flavor: lang === 'uz' ? selectedNachinka?.label_uz : selectedNachinka?.label_ru || selectedNachinka?.label_uz,
            configuration: {
                mode: 'wizard',
                type_uz: selectedType?.label_uz,
                type_ru: selectedType?.label_ru,
                nachinka_uz: selectedNachinka?.label_uz,
                nachinka_ru: selectedNachinka?.label_ru,
                size_uz: selectedSize?.label_uz,
                size_ru: selectedSize?.label_ru,
                photo_ref: photoRef,
                custom_note: comment,
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

    const CurrentStepComponent = STEPS[step - 1]?.component;
    if (!CurrentStepComponent) return null;

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
