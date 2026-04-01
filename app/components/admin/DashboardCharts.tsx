'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { format, subDays, isSameDay, addDays, addMonths, differenceInMonths } from 'date-fns';
import styles from './DashboardCharts.module.css';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';

interface CategoryData {
    label: string;
    value: number;
    color: string;
    percent: number;
}

interface DonutChartProps {
    title: string;
    data: CategoryData[];
}

export function CategoryDonutChart({ title, data }: DonutChartProps) {
    const { t } = useAdminI18n();
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // SVG path calculation for donut slices
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
        <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>{title}</h3>
            <div className={styles.donutContainer}>
                <svg viewBox="-1 -1 2 2" className={styles.donutSvg}>
                    {data.map((item, index) => {
                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += item.percent / 100;
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                        const largeArcFlag = item.percent > 50 ? 1 : 0;
                        const pathData = [
                            `M ${startX} ${startY}`,
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            `L 0 0`,
                        ].join(' ');

                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={item.color}
                                className={styles.donutSlice}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                                    transformOrigin: '0 0',
                                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    cursor: 'pointer',
                                    opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.6 : 1
                                }}
                            />
                        );
                    })}
                    <circle cx="0" cy="0" r="0.65" fill="white" />
                </svg>
                <div className={styles.donutCenter}>
                    <div className={styles.totalLabel}>
                        {hoveredItem ? hoveredItem.label : t('totalLabel').toUpperCase()}
                    </div>
                    <div className={styles.totalValue} style={{ fontSize: hoveredItem ? '16px' : '20px', color: hoveredItem?.color }}>
                        {(hoveredItem ? hoveredItem.value : total).toLocaleString()}
                    </div>
                </div>
            </div>

            <div className={styles.legend}>
                {data.map((item, index) => (
                    <div
                        key={index}
                        className={styles.legendItem}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        style={{
                            opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <div className={styles.legendColor} style={{ backgroundColor: item.color }} />
                        <span className={styles.legendLabel}>{item.label}</span>
                        <span className={styles.legendValue}>{item.percent.toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface RetentionProps {
    totalActive: number;
    repeatCount: number;
    newCount: number;
}

export function RetentionFunnel({ totalActive, repeatCount, newCount }: RetentionProps) {
    const { t } = useAdminI18n();
    const repeatPercent = totalActive > 0 ? (repeatCount / totalActive) * 100 : 0;
    const newPercent = 100 - repeatPercent;

    return (
        <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
            <h3 className={styles.chartTitle}>{t('retentionTitle')}</h3>
            <div className={styles.retentionContainer}>
                <div className={styles.retentionTrack}>
                    <div
                        className={styles.retentionBar}
                        style={{ width: `${repeatPercent}%`, background: 'linear-gradient(90deg, #BE185D, #EC4899)' }}
                        title={`${t('retentionRepeat')}: ${repeatCount}`}
                    >
                        {repeatPercent > 15 && <span className={styles.barPercent}>{repeatPercent.toFixed(0)}%</span>}
                    </div>
                    <div
                        className={styles.retentionBar}
                        style={{ width: `${newPercent}%`, background: '#F3F4F6' }}
                        title={`${t('retentionNew')}: ${newCount}`}
                    >
                        {newPercent > 15 && <span className={styles.barPercent} style={{ color: '#6B7280' }}>{newPercent.toFixed(0)}%</span>}
                    </div>
                </div>

                <div className={styles.retentionLabels}>
                    <div className={styles.retentionInfo}>
                        <div className={styles.labelDot} style={{ background: '#BE185D' }} />
                        <div>
                            <div className={styles.labelTitle}>{t('retentionRepeat')}</div>
                            <div className={styles.labelSub}>{repeatCount} {t('retentionRepeatSub')}</div>
                        </div>
                    </div>
                    <div className={styles.retentionInfo}>
                        <div className={styles.labelDot} style={{ background: '#E5E7EB' }} />
                        <div>
                            <div className={styles.labelTitle}>{t('retentionNew')}</div>
                            <div className={styles.labelSub}>{newCount} {t('retentionNewSub')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface LineChartData {
    label: string;
    revenue: number;
    sales: number;
    isFuture?: boolean;
}

type ChartRange = '30d' | '90d' | '180d' | 'all';

export function RevenueLineChart({ title, data, orders }: {
    title: string;
    data: LineChartData[];
    orders?: any[];
}) {
    const { lang, t } = useAdminI18n();
    const [range, setRange] = React.useState<ChartRange>('30d');

    // ── Build chart data from raw orders based on selected range ──
    const { points: chartPoints, todayIdx } = React.useMemo(() => {
        if (!orders?.length) return { points: data, todayIdx: 6 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        type Bucket = { date: Date; aggEnd: Date | null; label: string };
        let buckets: Bucket[];

        if (range === '30d') {
            buckets = Array.from({ length: 30 }, (_, i) => {
                const d = subDays(today, 29 - i);
                return { date: d, aggEnd: null, label: format(d, 'dd/MM') };
            });
        } else if (range === '90d') {
            // 13 weekly buckets
            buckets = Array.from({ length: 13 }, (_, i) => {
                const wStart = subDays(today, (12 - i) * 7 + 6);
                return { date: wStart, aggEnd: addDays(wStart, 7), label: format(wStart, 'dd/MM') };
            });
        } else if (range === '180d') {
            // 13 biweekly buckets
            buckets = Array.from({ length: 13 }, (_, i) => {
                const bStart = subDays(today, (12 - i) * 14 + 13);
                return { date: bStart, aggEnd: addDays(bStart, 14), label: format(bStart, 'dd/MM') };
            });
        } else {
            // All time — monthly buckets
            const firstDate = orders.reduce((min: Date, o: any) => {
                const d = new Date(o.created_at);
                return d < min ? d : min;
            }, new Date());
            const monthCount = Math.max(differenceInMonths(today, firstDate) + 2, 2);
            const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
            buckets = Array.from({ length: monthCount }, (_, i) => {
                const mStart = addMonths(monthStart, i);
                return { date: mStart, aggEnd: addMonths(mStart, 1), label: format(mStart, 'MMM yy') };
            }).filter(b => b.date <= today);
        }

        const points: LineChartData[] = buckets.map(({ date, aggEnd, label }) => {
            let revenue = 0, sales = 0;
            for (const order of orders) {
                if (order.status !== 'completed') continue;
                const d = new Date(order.created_at);
                const hit = aggEnd ? (d >= date && d < aggEnd) : isSameDay(d, date);
                if (hit) { revenue += Number(order.total_price) || 0; sales++; }
            }
            return { label, revenue, sales, isFuture: false };
        });

        const tIdx = range === '30d'
            ? buckets.findIndex(b => isSameDay(b.date, today))
            : -1;

        return { points, todayIdx: tIdx };
    }, [range, data, orders]);

    if (!chartPoints || chartPoints.length === 0) return null;

    const maxRevenue = Math.max(...chartPoints.map(d => d.revenue), 1000);
    const maxSales   = Math.max(...chartPoints.map(d => d.sales), 1);

    // ── Layout ────────────────────────────────────────────────────
    const W = 840, H = 340;
    const padL = 58, padR = 24, padT = 44, padB = 38;
    const cW = W - padL - padR;
    const BAR_H = 54, GAP = 18;
    const revH     = H - padT - padB - BAR_H - GAP;
    const revBaseY = padT + revH;
    const barTopY  = revBaseY + GAP;
    const barBotY  = H - padB;

    const n   = chartPoints.length;
    const xAt = (i: number) => padL + (i / Math.max(n - 1, 1)) * cW;
    const revY = (v: number) => revBaseY - (v / maxRevenue) * revH;
    const rPts: [number, number][] = chartPoints.map((d, i) => [xAt(i), revY(d.revenue)]);
    const barW = Math.min(cW / Math.max(n - 1, 1) * 0.45, 20);

    // ── Catmull-Rom → cubic Bézier ────────────────────────────────
    function crPath(pts: [number, number][], from = 0, to = pts.length): string {
        const p = pts.slice(from, to);
        if (p.length < 2) return '';
        const tension = 0.18;
        let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
        for (let i = 0; i < p.length - 1; i++) {
            const p0 = p[Math.max(0, i - 1)];
            const p1 = p[i];
            const p2 = p[i + 1];
            const p3 = p[Math.min(p.length - 1, i + 2)];
            const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
            const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
            const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
            const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        }
        return d;
    }
    function crArea(pts: [number, number][], from: number, to: number, baseY: number): string {
        const path = crPath(pts, from, to);
        const s = pts.slice(from, to);
        if (!s.length) return '';
        return `${path} L ${s[s.length - 1][0].toFixed(1)} ${baseY} L ${s[0][0].toFixed(1)} ${baseY} Z`;
    }

    // Past = up to todayIdx (inclusive), or all if no today marker
    const splitAt   = todayIdx >= 0 ? todayIdx + 1 : n;
    const revLinePast   = crPath(rPts, 0, splitAt);
    const revLineFuture = todayIdx >= 0 ? crPath(rPts, todayIdx) : '';
    const revAreaPast   = crArea(rPts, 0, splitAt, revBaseY);
    const todayX = todayIdx >= 0 ? xAt(todayIdx) : -999;

    const fmtRev = (v: number) =>
        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000     ? `${(v / 1_000).toFixed(0)}K`
      : `${v}`;

    // Show every Nth x-axis label to prevent crowding
    const labelEvery = n > 20 ? Math.ceil(n / 12) : 1;
    const Y_STEPS = 4;

    const RANGE_TABS: { key: ChartRange; label: string }[] = [
        { key: '30d',  label: t('filter_30') },
        { key: '90d',  label: t('filter_90') },
        { key: '180d', label: t('filter_180') },
        { key: 'all',  label: t('filter_all') },
    ];

    return (
        <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
            {/* ── Header row ── */}
            <div className={styles.chartHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="#BE185D" />
                    <h2 className={styles.chartTitle}>{title}</h2>
                </div>
                <div className={styles.lineLegend}>
                    <div className={styles.legendItem}>
                        <svg width="28" height="10" style={{ marginRight: 8, flexShrink: 0 }}>
                            <line x1="0" y1="5" x2="28" y2="5" stroke="#BE185D" strokeWidth="3" strokeLinecap="round"/>
                            <circle cx="14" cy="5" r="4" fill="white" stroke="#BE185D" strokeWidth="2"/>
                        </svg>
                        <span className={styles.legendLabel}>{t('revenueLabel')} ({lang === 'uz' ? "so'm" : 'сум'})</span>
                    </div>
                    <div className={styles.legendItem}>
                        <svg width="16" height="10" style={{ marginRight: 8, flexShrink: 0 }}>
                            <rect x="0" y="1" width="16" height="8" rx="3" fill="#3B82F6" opacity="0.85"/>
                        </svg>
                        <span className={styles.legendLabel}>{t('salesLabel')}</span>
                    </div>
                </div>
            </div>

            {/* ── Range tabs ── */}
            <div className={styles.rangeTabs}>
                {RANGE_TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`${styles.rangeTab} ${range === key ? styles.rangeTabActive : ''}`}
                        onClick={() => setRange(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── SVG Chart ── */}
            <div className={styles.lineChartContainer}>
                <svg viewBox={`0 0 ${W} ${H}`} className={styles.lineSvg} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="gradRevLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#BE185D" stopOpacity="0.22"/>
                            <stop offset="100%" stopColor="#BE185D" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.9"/>
                            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.65"/>
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>

                    {/* Y-axis grid + labels */}
                    {Array.from({ length: Y_STEPS + 1 }).map((_, i) => {
                        const y   = padT + (i / Y_STEPS) * revH;
                        const val = maxRevenue * (1 - i / Y_STEPS);
                        return (
                            <g key={i}>
                                <line x1={padL} y1={y} x2={W - padR} y2={y}
                                    stroke={i === Y_STEPS ? '#E5E7EB' : '#F3F4F6'}
                                    strokeWidth={i === Y_STEPS ? 1.5 : 1}/>
                                <text x={padL - 8} y={y + 4} fontSize="10" fill="#9CA3AF" fontWeight="600" textAnchor="end">
                                    {fmtRev(val)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bar lane background */}
                    <rect x={padL} y={barTopY} width={cW} height={BAR_H} rx="6" fill="#F8FAFC"/>
                    <text x={padL + 4} y={barTopY + 11} fontSize="9" fill="#94A3B8" fontWeight="700" letterSpacing="0.8">
                        {t('salesLabel').toUpperCase()}
                    </text>

                    {/* Today marker — only for 30d range */}
                    {todayIdx >= 0 && (
                        <>
                            <line x1={todayX} y1={padT - 10} x2={todayX} y2={barBotY}
                                stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 4"/>
                            <rect x={todayX - 28} y={padT - 28} width={56} height={20} rx={10} fill="#1E293B"/>
                            <text x={todayX} y={padT - 14} fontSize="9.5" fill="white" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
                                {t('todayLabel')}
                            </text>
                        </>
                    )}

                    {/* Revenue area (past) */}
                    <path d={revAreaPast} fill="url(#gradRevLine)" className={styles.fadeIn}/>

                    {/* Revenue line — past */}
                    <path d={revLinePast} fill="none" stroke="#BE185D" strokeWidth="3.5"
                        strokeLinecap="round" strokeLinejoin="round"
                        className={styles.drawPath} filter="url(#glow)"/>

                    {/* Revenue line — future forecast (30d only) */}
                    {todayIdx >= 0 && revLineFuture && (
                        <path d={revLineFuture} fill="none" stroke="#BE185D" strokeWidth="2.5"
                            strokeDasharray="7 5" strokeLinecap="round" opacity="0.4"/>
                    )}

                    {/* Order count bars */}
                    {chartPoints.map((d, i) => {
                        if (d.sales === 0) return null;
                        const x  = xAt(i);
                        const bh = (d.sales / maxSales) * (BAR_H - 18);
                        return (
                            <g key={`bar-${i}`}>
                                <rect x={x - barW / 2} y={barBotY - bh} width={barW} height={bh}
                                    rx="4" fill="url(#gradBar)"/>
                                <text x={x} y={barBotY - bh - 5}
                                    fontSize="11" fontWeight="800" textAnchor="middle" fill="#3B82F6"
                                    className={styles.valueLabel}>
                                    {d.sales}
                                </text>
                            </g>
                        );
                    })}

                    {/* Revenue ring dots + value labels + x-axis labels */}
                    {chartPoints.map((d, i) => {
                        const x  = xAt(i);
                        const ry = revY(d.revenue);
                        const showLabel = i % labelEvery === 0 || i === n - 1;
                        return (
                            <g key={`dot-${i}`}>
                                <circle cx={x} cy={ry} r="4.5" fill="white" stroke="#BE185D" strokeWidth="2.5"/>
                                {d.revenue > 0 && (
                                    <text x={x} y={ry - 13} fontSize="11" fontWeight="800"
                                        textAnchor="middle" fill="#BE185D" className={styles.valueLabel}>
                                        {fmtRev(d.revenue)}
                                    </text>
                                )}
                                {showLabel && (
                                    <text x={x} y={H - 8} fontSize="11" textAnchor="middle"
                                        fill={i === todayIdx ? '#1E293B' : '#9CA3AF'}
                                        fontWeight={i === todayIdx ? '800' : '500'}>
                                        {d.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
