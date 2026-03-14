'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import styles from './DashboardCharts.module.css';

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
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // SVG path calculation for donut slices
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

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
                            />
                        );
                    })}
                    <circle cx="0" cy="0" r="0.65" fill="white" />
                </svg>
                <div className={styles.donutCenter}>
                    <div className={styles.totalLabel}>Jami</div>
                    <div className={styles.totalValue}>{total.toLocaleString()}</div>
                </div>
            </div>

            <div className={styles.legend}>
                {data.map((item, index) => (
                    <div key={index} className={styles.legendItem}>
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
    const repeatPercent = totalActive > 0 ? (repeatCount / totalActive) * 100 : 0;
    const newPercent = 100 - repeatPercent;

    return (
        <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
            <h3 className={styles.chartTitle}>Mijozlar tarkibi</h3>
            <div className={styles.retentionContainer}>
                <div className={styles.retentionTrack}>
                    <div
                        className={styles.retentionBar}
                        style={{ width: `${repeatPercent}%`, background: 'linear-gradient(90deg, #BE185D, #EC4899)' }}
                        title={`Doimiy: ${repeatCount} mijoz`}
                    >
                        {repeatPercent > 15 && <span className={styles.barPercent}>{repeatPercent.toFixed(0)}%</span>}
                    </div>
                    <div
                        className={styles.retentionBar}
                        style={{ width: `${newPercent}%`, background: '#F3F4F6' }}
                        title={`Yangi: ${newCount} mijoz`}
                    >
                        {newPercent > 15 && <span className={styles.barPercent} style={{ color: '#6B7280' }}>{newPercent.toFixed(0)}%</span>}
                    </div>
                </div>

                <div className={styles.retentionLabels}>
                    <div className={styles.retentionInfo}>
                        <div className={styles.labelDot} style={{ background: '#BE185D' }} />
                        <div>
                            <div className={styles.labelTitle}>Doimiy mijozlar</div>
                            <div className={styles.labelSub}>{repeatCount} ta (2+ marta)</div>
                        </div>
                    </div>
                    <div className={styles.retentionInfo}>
                        <div className={styles.labelDot} style={{ background: '#E5E7EB' }} />
                        <div>
                            <div className={styles.labelTitle}>Yangi mijozlar</div>
                            <div className={styles.labelSub}>{newCount} ta (ilk marta)</div>
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

export function RevenueLineChart({ title, data }: { title: string; data: LineChartData[] }) {
    if (!data || data.length === 0) return null;

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
    const maxSales = Math.max(...data.map(d => d.sales), 5);

    const width = 800;
    const height = 240;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const pointsRevenue = data.map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth + padding;
        const y = height - ((d.revenue / maxRevenue) * chartHeight + padding);
        return `${x},${y}`;
    });

    const pointsSales = data.map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth + padding;
        const y = height - ((d.sales / maxSales) * chartHeight + padding);
        return `${x},${y}`;
    });

    const pathRevenuePast = `M ${pointsRevenue.slice(0, 7).join(' L ')}`;
    const pathRevenueFuture = `M ${pointsRevenue.slice(6).join(' L ')}`;

    const pathSalesPast = `M ${pointsSales.slice(0, 7).join(' L ')}`;
    const pathSalesFuture = `M ${pointsSales.slice(6).join(' L ')}`;

    // Area paths (combine past and future for area)
    const areaRevenue = `M ${pointsRevenue.join(' L ')} L ${pointsRevenue[pointsRevenue.length - 1].split(',')[0]},${height - padding} L ${padding},${height - padding} Z`;
    const areaSales = `M ${pointsSales.join(' L ')} L ${pointsSales[pointsSales.length - 1].split(',')[0]},${height - padding} L ${padding},${height - padding} Z`;

    const todayX = pointsRevenue[6].split(',')[0];

    return (
        <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.chartHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="#BE185D" />
                    <h2 className={styles.chartTitle}>{title}</h2>
                </div>
                <div className={styles.lineLegend}>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: '#BE185D' }} />
                        <span className={styles.legendLabel}>Daromad (so'm)</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: '#3B82F6' }} />
                        <span className={styles.legendLabel}>Sotuvlar</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={`${styles.legendColor} ${styles.dashedIcon}`} style={{ borderColor: '#9CA3AF' }} />
                        <span className={styles.legendLabel}>Bashorat (10 kun)</span>
                    </div>
                </div>
            </div>

            <div className={styles.lineChartContainer}>
                <svg viewBox={`0 0 ${width} ${height}`} className={styles.lineSvg} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#BE185D" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#BE185D" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradientSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grids */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <line
                            key={i}
                            x1={padding} y1={padding + p * chartHeight}
                            x2={width - padding} y2={padding + p * chartHeight}
                            stroke="#F3F4F6"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Areas */}
                    <path d={areaRevenue} fill="url(#gradientRevenue)" className={styles.fadeIn} />
                    <path d={areaSales} fill="url(#gradientSales)" className={styles.fadeIn} />

                    {/* Today Line */}
                    <line x1={todayX} y1={padding} x2={todayX} y2={height - padding} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={Number(todayX) + 5} y={padding + 10} fontSize="10" fill="#9CA3AF" fontWeight="700">BUGUN</text>

                    {/* Revenue Line Past */}
                    <path
                        d={pathRevenuePast}
                        fill="none"
                        stroke="#BE185D"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.drawPath}
                    />

                    {/* Revenue Line Future */}
                    <path
                        d={pathRevenueFuture}
                        fill="none"
                        stroke="#BE185D"
                        strokeWidth="3"
                        strokeDasharray="8 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.6 }}
                    />

                    {/* Sales Line Past */}
                    <path
                        d={pathSalesPast}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.drawPath}
                        style={{ animationDelay: '0.4s' }}
                    />

                    {/* Sales Line Future */}
                    <path
                        d={pathSalesFuture}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeDasharray="8 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.6 }}
                    />

                    {/* Interaction Points & Labels */}
                    {data.map((d, i) => {
                        const [rx, ry] = pointsRevenue[i].split(',').map(Number);
                        const [sx, sy] = pointsSales[i].split(',').map(Number);
                        return (
                            <g key={i}>
                                <circle cx={rx} cy={ry} r="5" fill="#BE185D" className={styles.pulsePoint} />
                                <circle cx={sx} cy={sy} r="5" fill="#3B82F6" className={styles.pulsePoint} style={{ animationDelay: '0.4s' }} />

                                {/* Value Labels */}
                                <text
                                    x={rx} y={ry - 12}
                                    fontSize="11" fontWeight="700"
                                    textAnchor="middle" fill="#BE185D"
                                    className={styles.valueLabel}
                                >
                                    {d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(0)}K` : d.revenue}
                                </text>
                                <text
                                    x={sx} y={sy + 18}
                                    fontSize="11" fontWeight="700"
                                    textAnchor="middle" fill="#3B82F6"
                                    className={styles.valueLabel}
                                >
                                    {d.sales}
                                </text>

                                <text x={rx} y={height - 10} fontSize="12" textAnchor="middle" fill="#9CA3AF" fontWeight="600">{d.label}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
