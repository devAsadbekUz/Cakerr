import BottomNav from "../components/layout/BottomNav";

export default function ClientLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div style={{ paddingBottom: '100px' }}>
            {children}
            <BottomNav />
        </div>
    );
}
