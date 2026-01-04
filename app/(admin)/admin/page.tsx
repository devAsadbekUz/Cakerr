import { TrendingUp, Users, ShoppingBag, Clock } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>Bosh sahifa</h1>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <StatCard title="Bugungi buyurtmalar" value="12" icon={ShoppingBag} color="blue" />
                <StatCard title="Jami tushum" value="2,450,000" sub="so'm" icon={TrendingUp} color="green" />
                <StatCard title="Faol mijozlar" value="45" icon={Users} color="purple" />
                <StatCard title="Kutilmoqda" value="5" icon={Clock} color="orange" />
            </div>

            {/* Recent Orders Table Placeholder */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Oxirgi buyurtmalar</h2>
                <table style={{ width: '100%', minWidth: '600px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: '#6B7280', fontSize: '13px', borderBottom: '1px solid #F3F4F6' }}>
                            <th style={{ padding: '12px' }}>ID</th>
                            <th style={{ padding: '12px' }}>Mijoz</th>
                            <th style={{ padding: '12px' }}>Mahsulot</th>
                            <th style={{ padding: '12px' }}>Narx</th>
                            <th style={{ padding: '12px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <OrderRow id="#1024" customer="Aziza Rahimova" product="Shokoladli tort" price="228,000" status="Yangi" statusColor="blue" />
                        <OrderRow id="#1023" customer="Bekzod Aliyev" product="Vanilla Dream" price="180,000" status="Yuborildi" statusColor="green" />
                        <OrderRow id="#1022" customer="Malika T." product="Red Velvet" price="250,000" status="Bekor qilindi" statusColor="red" />
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Simple Components for MVP
function StatCard({ title, value, sub, icon: Icon, color }: any) {
    const colors: any = {
        blue: { bg: '#DBEAFE', text: '#1E40AF' },
        green: { bg: '#D1FAE5', text: '#065F46' },
        purple: { bg: '#EDE9FE', text: '#5B21B6' },
        orange: { bg: '#FFEDD5', text: '#9A3412' },
    };

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '16px' }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: colors[color].bg, color: colors[color].text,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>{title}</p>
                <p style={{ fontSize: '24px', fontWeight: 800 }}>
                    {value} <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{sub}</span>
                </p>
            </div>
        </div>
    )
}

function OrderRow({ id, customer, product, price, status, statusColor }: any) {
    const colors: any = {
        blue: { bg: '#DBEAFE', text: '#1E40AF' },
        green: { bg: '#D1FAE5', text: '#065F46' },
        red: { bg: '#FEE2E2', text: '#991B1B' },
    };

    return (
        <tr style={{ borderBottom: '1px solid #F9FAFB' }}>
            <td style={{ padding: '16px 12px', fontWeight: 600 }}>{id}</td>
            <td style={{ padding: '16px 12px' }}>{customer}</td>
            <td style={{ padding: '16px 12px' }}>{product}</td>
            <td style={{ padding: '16px 12px' }}>{price}</td>
            <td style={{ padding: '16px 12px' }}>
                <span style={{
                    background: colors[statusColor].bg, color: colors[statusColor].text,
                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                }}>
                    {status}
                </span>
            </td>
        </tr>
    )
}
