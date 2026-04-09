'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { CustomOption } from '../services/customCakeService';

export type BuilderMode = 'wizard' | 'upload' | null;

interface CustomCakeState {
    mode: 'wizard';
    step: number;

    // New Wizard State
    cakeType: string | null;
    photoRef: string | null;     // Reference photo URL/base64
    comment: string;            // User's instructions
    nachinka: string | null;     // Ingredients
    size: string | null;
    drawingData: string;

    // Options from DB
    options: CustomOption[];
}

interface CustomCakeContextType extends CustomCakeState {
    setMode: (mode: BuilderMode) => void;
    setCakeType: (id: string | null) => void;
    setPhotoRef: (ref: string | null) => void;
    setComment: (text: string) => void;
    setNachinka: (id: string | null) => void;
    setSize: (id: string | null) => void;
    setDrawingData: (data: string) => void;

    setOptions: (options: CustomOption[]) => void;

    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
    calculateTotal: () => number;
    isFullyPriced: boolean;
}

const initialState: CustomCakeState = {
    mode: 'wizard',
    step: 1,
    cakeType: null,
    photoRef: null,
    comment: '',
    nachinka: null,
    size: null,
    drawingData: '',
    options: []
};

const CustomCakeContext = createContext<CustomCakeContextType | undefined>(undefined);

export function CustomCakeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CustomCakeState>(initialState);

    const setMode = useCallback((mode: BuilderMode) => setState(prev => ({ ...prev, mode: 'wizard' })), []);

    const setCakeType = useCallback((cakeType: string | null) => setState(prev => ({
        ...prev,
        cakeType,
        // Reset dependent fields if cake type changes
        nachinka: null,
        size: null
    })), []);

    const setPhotoRef = useCallback((photoRef: string | null) => setState(prev => ({ ...prev, photoRef })), []);
    const setComment = useCallback((comment: string) => setState(prev => ({ ...prev, comment })), []);
    const setNachinka = useCallback((nachinka: string | null) => setState(prev => ({ ...prev, nachinka })), []);
    const setSize = useCallback((size: string | null) => setState(prev => ({ ...prev, size })), []);


    const setDrawingData = useCallback((drawingData: string) => setState(prev => ({ ...prev, drawingData })), []);

    const setOptions = useCallback((options: CustomOption[]) => setState(prev => ({ ...prev, options })), []);

    const nextStep = useCallback(() => setState(prev => ({ ...prev, step: prev.step + 1 })), []);
    const prevStep = useCallback(() => setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) })), []);
    const reset = useCallback(() => setState(initialState), []);

    const calculateTotal = useCallback(() => {
        const selectedIds = [state.cakeType, state.nachinka, state.size].filter(Boolean);
        const selectedOptions = state.options.filter(o => selectedIds.includes(o.id));
        
        return selectedOptions.reduce((sum, o) => {
            return sum + (Number(o.price) || 0);
        }, 0);
    }, [state.cakeType, state.nachinka, state.size, state.options]);

    const isFullyPriced = useMemo(() => {
        const selectedIds = [state.cakeType, state.nachinka, state.size].filter(Boolean);
        if (selectedIds.length < 3) return false;

        const selectedOptions = state.options.filter(o => selectedIds.includes(o.id));
        return selectedOptions.every(o => (Number(o.price) || 0) > 0);
    }, [state.cakeType, state.nachinka, state.size, state.options]);

    const value = useMemo(() => ({
        ...state,
        setMode,
        setCakeType,
        setPhotoRef,
        setComment,
        setNachinka,
        setSize,
        setDrawingData,
        setOptions,
        nextStep,
        prevStep,
        reset,
        calculateTotal,
        isFullyPriced,
    }), [state, isFullyPriced, setMode, setCakeType, setPhotoRef, setComment, setNachinka, setSize, setDrawingData, setOptions, nextStep, prevStep, reset, calculateTotal]);

    return (
        <CustomCakeContext.Provider value={value}>
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
