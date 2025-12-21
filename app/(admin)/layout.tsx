import AdminSidebar from "@/app/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
            <AdminSidebar />
            <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
