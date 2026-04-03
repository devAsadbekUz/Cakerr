function SkeletonBlock({ width, height, radius = 12 }: { width: string; height: number; radius?: number }) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius: radius,
                background: 'linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%)',
                backgroundSize: '200% 100%',
                animation: 'admin-page-skeleton 1.4s ease-in-out infinite',
                flexShrink: 0,
            }}
        />
    );
}

function SkeletonCard() {
    return (
        <div
            style={{
                background: 'white',
                borderRadius: '20px',
                border: '1px solid #E5E7EB',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    <SkeletonBlock width="55%" height={16} radius={999} />
                    <SkeletonBlock width="40%" height={12} radius={999} />
                </div>
                <SkeletonBlock width="64px" height={28} radius={8} />
            </div>
            <SkeletonBlock width="100%" height={1} radius={0} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <SkeletonBlock width="80%" height={12} radius={999} />
                <SkeletonBlock width="65%" height={12} radius={999} />
            </div>
            <SkeletonBlock width="100%" height={40} radius={10} />
        </div>
    );
}

export default function AdminPageSkeleton() {
    return (
        <div
            style={{
                padding: '24px',
                maxWidth: '1400px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
            }}
        >
            <style>{`
                @keyframes admin-page-skeleton {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <SkeletonBlock width="200px" height={36} radius={10} />
                <SkeletonBlock width="140px" height={40} radius={10} />
            </div>

            {/* Cards grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px',
                }}
            >
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        </div>
    );
}
