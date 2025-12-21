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
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';

const STEPS = [
    { title: 'Shakl', component: ShapeStep },
    { title: 'Hajm', component: SizeStep },
    { title: 'Biskvit', component: SpongeStep },
    { title: 'Krem', component: CreamStep },
    { title: 'Bezak', component: DecorationStep },
    { title: 'Tekshirish', component: ReviewStep },
];

export default function WizardShell() {
    const { step, nextStep, prevStep, shape, size, sponge, cream, decorations, text } = useCustomCake();
    const { addItem } = useCart();
    const router = useRouter();

    const CurrentStepComponent = STEPS[step - 1].component;
    const progress = (step / STEPS.length) * 100;

    const isNextDisabled = () => {
        if (step === 1 && !shape) return true;
        if (step === 2 && !size) return true;
        if (step === 3 && !sponge) return true;
        if (step === 4 && !cream) return true;
        return false;
    };

    const handleAddToCart = () => {
        const flavor = `${sponge} + ${cream}`;
        const name = `Maxsus Tort (${shape})`;

        addItem({
            id: 'custom-cake',
            name: name,
            price: 350000, // Fixed price for custom cake for now
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
            portion: size || 'O\'rtacha',
            flavor: flavor,
            quantity: 1
        });

        router.push('/savat');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Tort Yaratish</h1>
                <p>{STEPS[step - 1].title} - {step}/{STEPS.length}</p>
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
                {step > 1 && (
                    <button className={styles.prevBtn} onClick={prevStep}>
                        <ChevronLeft size={20} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Orqaga
                    </button>
                )}
                {step < STEPS.length ? (
                    <button
                        className={styles.nextBtn}
                        onClick={nextStep}
                        disabled={isNextDisabled()}
                    >
                        Davom etish
                        <ChevronRight size={20} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                    </button>
                ) : (
                    <button className={styles.nextBtn} onClick={handleAddToCart}>
                        Savatga qo'shish
                    </button>
                )}
            </footer>
        </div>
    );
}
