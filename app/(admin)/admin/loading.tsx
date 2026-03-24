export default function AdminLoading() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '20px'
        }}>
            <div style={{
                width: 40, height: 40,
                border: '3px solid #F3F4F6',
                borderTopColor: '#BE185D',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500, margin: 0 }}>
                Yuklanmoqda...
            </p>
        </div>
    );
}
