'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Shape = 'round' | 'square' | 'heart' | null;
export type Size = 'small' | 'medium' | 'large' | null;
export type Sponge = 'vanilla' | 'chocolate' | 'red-velvet' | null;
export type Cream = 'choco' | 'berry' | 'cheese' | null;

interface CustomCakeState {
    step: number;
    shape: Shape;
    size: Size;
    sponge: Sponge;
    cream: Cream;
    decorations: string[];
    text: string;
}

interface CustomCakeContextType extends CustomCakeState {
    setShape: (shape: Shape) => void;
    setSize: (size: Size) => void;
    setSponge: (sponge: Sponge) => void;
    setCream: (cream: Cream) => void;
    toggleDecoration: (decoration: string) => void;
    setText: (text: string) => void;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
}

const initialState: CustomCakeState = {
    step: 1,
    shape: null,
    size: null,
    sponge: null,
    cream: null,
    decorations: [],
    text: '',
};

const CustomCakeContext = createContext<CustomCakeContextType | undefined>(undefined);

export function CustomCakeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CustomCakeState>(initialState);

    const setShape = (shape: Shape) => setState(prev => ({ ...prev, shape }));
    const setSize = (size: Size) => setState(prev => ({ ...prev, size }));
    const setSponge = (sponge: Sponge) => setState(prev => ({ ...prev, sponge }));
    const setCream = (cream: Cream) => setState(prev => ({ ...prev, cream }));
    const toggleDecoration = (decoration: string) => {
        setState(prev => ({
            ...prev,
            decorations: prev.decorations.includes(decoration)
                ? prev.decorations.filter(d => d !== decoration)
                : [...prev.decorations, decoration]
        }));
    };
    const setText = (text: string) => setState(prev => ({ ...prev, text }));
    const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));
    const prevStep = () => setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
    const reset = () => setState(initialState);

    return (
        <CustomCakeContext.Provider
            value={{
                ...state,
                setShape,
                setSize,
                setSponge,
                setCream,
                toggleDecoration,
                setText,
                nextStep,
                prevStep,
                reset,
            }}
        >
            {children}
        </CustomCakeContext.Provider>
    );
}

export function useCustomCake() {
    const context = useContext(CustomCakeContext);
    if (context === undefined) {
        throw new Error('useCustomCake must be used within a CustomCakeProvider');
    }
    return context;
}
