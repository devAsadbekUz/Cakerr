export const CAKE_OPTIONS = {
    shapes: [
        { id: 'round', label: 'Yumaloq', image: '/images/shapes/round.png' },
        { id: 'square', label: 'To\'rtburchak', image: '/images/shapes/square.png' },
        { id: 'heart', label: 'Yurak', image: '/images/shapes/heart.png' },
    ],
    sizes: [
        { id: 'small', label: 'Kichik (6-8 kishilik)', priceMultiplier: 1 },
        { id: 'medium', label: 'O\'rtacha (10-12 kishilik)', priceMultiplier: 1.5 },
        { id: 'large', label: 'Katta (15-20 kishilik)', priceMultiplier: 2 },
    ],
    sponges: [
        { id: 'vanilla', label: 'Vanilli', color: '#f3e5ab' },
        { id: 'chocolate', label: 'Shokoladli', color: '#3e2723' },
        { id: 'red-velvet', label: 'Qizil Baxmal', color: '#b71c1c' },
    ],
    creams: [
        { id: 'choco', label: 'Shokoladli', color: '#5d4037' },
        { id: 'berry', label: 'Mevali', color: '#e91e63' },
        { id: 'cheese', label: 'Qaymoqli', color: '#fff9c4' },
    ],
    decorations: [
        { id: 'berries', label: 'Mevalar', price: 20000 },
        { id: 'macarons', label: 'Makaronlar', price: 30000 },
        { id: 'candles', label: 'Shamlar', price: 5000 },
        { id: 'sprinkles', label: 'Fruktoza', price: 10000 },
    ],
} as const;

export type CakeShapeId = typeof CAKE_OPTIONS.shapes[number]['id'];
export type CakeSizeId = typeof CAKE_OPTIONS.sizes[number]['id'];
export type CakeSpongeId = typeof CAKE_OPTIONS.sponges[number]['id'];
export type CakeCreamId = typeof CAKE_OPTIONS.creams[number]['id'];
