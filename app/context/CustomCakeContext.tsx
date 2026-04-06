'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { CustomOption } from '../services/customCakeService';

export type BuilderMode = 'wizard' | 'upload' | null;

interface CustomCakeState {
    // Mode
    mode: BuilderMode;

    // Wizard State
    step: number;
    shape: string | null;
    size: string | null;
    sponge: string | null;
    cream: string | null;
    decorations: string[];
    text: string;
    drawingData: string;

    // Upload State
    uploadedImage: string | null;
    uploadComment: string;

    // Options from DB
    options: CustomOption[];
}

interface CustomCakeContextType extends CustomCakeState {
    setMode: (mode: BuilderMode) => void;
    setShape: (shape: string) => void;
    setSize: (size: string) => void;
    setSponge: (sponge: string) => void;
    setCream: (cream: string) => void;
    toggleDecoration: (decoration: string) => void;
    setText: (text: string) => void;
    setDrawingData: (data: string) => void;

    setUploadedImage: (image: string | null) => void;
    setUploadComment: (comment: string) => void;
    setOptions: (options: CustomOption[]) => void;

    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
    calculateTotal: () => number;
}

const initialState: CustomCakeState = {
    mode: null,
    step: 1,
    shape: null,
    size: null,
    sponge: null,
    cream: null,
    decorations: [],
    text: '',
    drawingData: '',
    uploadedImage: null,
    uploadComment: '',
    options: []
};

const CustomCakeContext = createContext<CustomCakeContextType | undefined>(undefined);

export function CustomCakeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CustomCakeState>(initialState);

    const setMode = useCallback((mode: BuilderMode) => setState(prev => ({ ...prev, mode })), []);

    const setShape = useCallback((shape: string) => setState(prev => ({ ...prev, shape })), []);
    const setSize = useCallback((size: string) => setState(prev => ({ ...prev, size })), []);
    const setSponge = useCallback((sponge: string) => setState(prev => ({ ...prev, sponge })), []);
    const setCream = useCallback((cream: string) => setState(prev => ({ ...prev, cream })), []);
    const toggleDecoration = useCallback((decoration: string) => {
        setState(prev => ({
            ...prev,
            decorations: prev.decorations.includes(decoration)
                ? prev.decorations.filter(d => d !== decoration)
                : [...prev.decorations, decoration]
        }));
    }, []);
    const setText = useCallback((text: string) => setState(prev => ({ ...prev, text })), []);
    const setDrawingData = useCallback((drawingData: string) => setState(prev => ({ ...prev, drawingData })), []);

    const setUploadedImage = useCallback((uploadedImage: string | null) => setState(prev => ({ ...prev, uploadedImage })), []);
    const setUploadComment = useCallback((uploadComment: string) => setState(prev => ({ ...prev, uploadComment })), []);
    const setOptions = useCallback((options: CustomOption[]) => setState(prev => ({ ...prev, options })), []);

    const nextStep = useCallback(() => setState(prev => ({ ...prev, step: prev.step + 1 })), []);
    const prevStep = useCallback(() => setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) })), []);
    const reset = useCallback(() => setState(initialState), []);

    const calculateTotal = useCallback(() => {
        let total = 0;

        const selectedShape = state.options.find(o => o.id === state.shape);
        const selectedSize = state.options.find(o => o.id === state.size);
        const selectedSponge = state.options.find(o => o.id === state.sponge);
        const selectedCream = state.options.find(o => o.id === state.cream);
        const selectedDecors = state.options.filter(o => state.decorations.includes(o.id));

        if (selectedShape) total += Number(selectedShape.price);
        if (selectedSize) total += Number(selectedSize.price);
        if (selectedSponge) total += Number(selectedSponge.price);
        if (selectedCream) total += Number(selectedCream.price);
        selectedDecors.forEach(d => total += Number(d.price));

        return total;
    }, [state.options, state.shape, state.size, state.sponge, state.cream, state.decorations]);

    const value = useMemo(() => ({
        ...state,
        setMode,
        setShape,
        setSize,
        setSponge,
        setCream,
        toggleDecoration,
        setText,
        setDrawingData,
        setUploadedImage,
        setUploadComment,
        setOptions,
        nextStep,
        prevStep,
        reset,
        calculateTotal,
    }), [state, setMode, setShape, setSize, setSponge, setCream, toggleDecoration, setText, setDrawingData, setUploadedImage, setUploadComment, setOptions, nextStep, prevStep, reset, calculateTotal]);

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
