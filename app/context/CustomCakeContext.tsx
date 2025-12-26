'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CakeShapeId, CakeSizeId, CakeSpongeId, CakeCreamId } from '../config/cakeBuilderConfig';

export type BuilderMode = 'wizard' | 'upload' | null;

interface CustomCakeState {
    // Mode
    mode: BuilderMode;

    // Wizard State
    step: number;
    shape: CakeShapeId | null;
    size: CakeSizeId | null;
    sponge: CakeSpongeId | null;
    cream: CakeCreamId | null;
    decorations: string[];
    text: string;
    drawingData: string;

    // Upload State
    uploadedImage: string | null;
    uploadComment: string;
}

interface CustomCakeContextType extends CustomCakeState {
    setMode: (mode: BuilderMode) => void;
    setShape: (shape: CakeShapeId) => void;
    setSize: (size: CakeSizeId) => void;
    setSponge: (sponge: CakeSpongeId) => void;
    setCream: (cream: CakeCreamId) => void;
    toggleDecoration: (decoration: string) => void;
    setText: (text: string) => void;
    setDrawingData: (data: string) => void;

    setUploadedImage: (image: string | null) => void;
    setUploadComment: (comment: string) => void;

    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
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
};

const CustomCakeContext = createContext<CustomCakeContextType | undefined>(undefined);

export function CustomCakeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CustomCakeState>(initialState);

    const setMode = (mode: BuilderMode) => setState(prev => ({ ...prev, mode }));

    const setShape = (shape: CakeShapeId) => setState(prev => ({ ...prev, shape }));
    const setSize = (size: CakeSizeId) => setState(prev => ({ ...prev, size }));
    const setSponge = (sponge: CakeSpongeId) => setState(prev => ({ ...prev, sponge }));
    const setCream = (cream: CakeCreamId) => setState(prev => ({ ...prev, cream }));
    const toggleDecoration = (decoration: string) => {
        setState(prev => ({
            ...prev,
            decorations: prev.decorations.includes(decoration)
                ? prev.decorations.filter(d => d !== decoration)
                : [...prev.decorations, decoration]
        }));
    };
    const setText = (text: string) => setState(prev => ({ ...prev, text }));
    const setDrawingData = (drawingData: string) => setState(prev => ({ ...prev, drawingData }));

    const setUploadedImage = (uploadedImage: string | null) => setState(prev => ({ ...prev, uploadedImage }));
    const setUploadComment = (uploadComment: string) => setState(prev => ({ ...prev, uploadComment }));

    const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));
    const prevStep = () => setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
    const reset = () => setState(initialState);

    return (
        <CustomCakeContext.Provider
            value={{
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
