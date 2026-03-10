export const equityCurveData = Array.from({ length: 60 }, (_, i) => ({
  date: `2024-${String(Math.floor(i / 5) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  equity: 100000 + Math.floor(Math.random() * 5000 - 1000) * (i + 1) / 10 + i * 800,
  benchmark: 100000 + i * 500 + Math.floor(Math.random() * 2000 - 1000),
}));

export const recentBacktests = [
  { id: 1, strategy: "Mean Reversion Alpha", asset: "ES (S&P 500)", period: "2020-2024", sharpe: 2.14, profit: "+18.3%", status: "completed" },
  { id: 2, strategy: "Momentum Factor V2", asset: "NQ (Nasdaq)", period: "2019-2024", sharpe: 1.87, profit: "+24.1%", status: "completed" },
  { id: 3, strategy: "Vol Carry Strategy", asset: "VIX Futures", period: "2021-2024", sharpe: 1.42, profit: "+12.7%", status: "running" },
  { id: 4, strategy: "Stat Arb Pairs", asset: "Multi-Asset", period: "2022-2024", sharpe: 0.93, profit: "+8.2%", status: "failed" },
  { id: 5, strategy: "Trend Following CTA", asset: "CL (Crude Oil)", period: "2018-2024", sharpe: 1.65, profit: "+31.4%", status: "completed" },
];

export const researchProjects = [
  { id: 1, name: "Mean Reversion Alpha", asset: "ES (S&P 500)", lastRun: "2024-12-15", status: "active" },
  { id: 2, name: "Momentum Factor V2", asset: "NQ (Nasdaq)", lastRun: "2024-12-14", status: "active" },
  { id: 3, name: "Vol Carry Strategy", asset: "VIX Futures", lastRun: "2024-12-10", status: "draft" },
  { id: 4, name: "Stat Arb Pairs", asset: "Multi-Asset", lastRun: "2024-12-08", status: "archived" },
  { id: 5, name: "Trend Following CTA", asset: "CL (Crude Oil)", lastRun: "2024-12-12", status: "active" },
  { id: 6, name: "Gamma Scalping", asset: "SPX Options", lastRun: "2024-12-01", status: "draft" },
];

export const mockDataPreview = Array.from({ length: 20 }, (_, i) => ({
  date: `2024-12-${String(i + 1).padStart(2, '0')}`,
  open: (4500 + Math.random() * 100).toFixed(2),
  high: (4550 + Math.random() * 100).toFixed(2),
  low: (4450 + Math.random() * 100).toFixed(2),
  close: (4500 + Math.random() * 100).toFixed(2),
  volume: Math.floor(1000000 + Math.random() * 500000),
}));

export const volatilityData = Array.from({ length: 30 }, (_, i) => ({
  date: `Dec ${i + 1}`,
  volatility: 12 + Math.random() * 8,
  volume: Math.floor(800000 + Math.random() * 600000),
}));

export const regimeData = [
  { name: "Bull Trend", value: 35, fill: "hsl(var(--primary))" },
  { name: "Bear Trend", value: 20, fill: "hsl(var(--destructive))" },
  { name: "Mean Reverting", value: 25, fill: "hsl(var(--accent))" },
  { name: "High Volatility", value: 20, fill: "hsl(var(--warning))" },
];

export const regimePerformance = [
  { regime: "Bull Trend", trades: 142, winRate: "68%", avgReturn: "+1.2%", sharpe: 2.1 },
  { regime: "Bear Trend", trades: 87, winRate: "52%", avgReturn: "+0.4%", sharpe: 0.8 },
  { regime: "Mean Reverting", trades: 203, winRate: "71%", avgReturn: "+0.9%", sharpe: 1.9 },
  { regime: "High Volatility", trades: 64, winRate: "45%", avgReturn: "-0.2%", sharpe: -0.3 },
];

export const monteCarloData = Array.from({ length: 20 }, (_, pathIdx) =>
  Array.from({ length: 50 }, (_, i) => ({
    step: i,
    value: 100000 + Array.from({ length: i }, () => (Math.random() - 0.48) * 3000).reduce((a, b) => a + b, 0),
    path: pathIdx,
  }))
);

export const optimizationResults = [
  { smaFast: 10, smaSlow: 30, sharpe: 1.82, profit: "14.2%", maxDD: "-8.1%", trades: 142 },
  { smaFast: 15, smaSlow: 40, sharpe: 2.14, profit: "18.3%", maxDD: "-6.4%", trades: 118 },
  { smaFast: 20, smaSlow: 50, sharpe: 1.95, profit: "16.1%", maxDD: "-7.2%", trades: 96 },
  { smaFast: 10, smaSlow: 50, sharpe: 1.67, profit: "12.8%", maxDD: "-9.3%", trades: 134 },
  { smaFast: 15, smaSlow: 30, sharpe: 1.45, profit: "10.4%", maxDD: "-11.2%", trades: 156 },
  { smaFast: 20, smaSlow: 40, sharpe: 2.31, profit: "21.7%", maxDD: "-5.8%", trades: 87 },
];

export const tradeList = [
  { id: 1, date: "2024-12-15", side: "LONG", entry: 4521.50, exit: 4558.25, pnl: "+$3,675", duration: "2h 14m" },
  { id: 2, date: "2024-12-14", side: "SHORT", entry: 4567.00, exit: 4543.75, pnl: "+$2,325", duration: "4h 02m" },
  { id: 3, date: "2024-12-13", side: "LONG", entry: 4498.25, exit: 4485.50, pnl: "-$1,275", duration: "1h 38m" },
  { id: 4, date: "2024-12-12", side: "LONG", entry: 4512.00, exit: 4549.75, pnl: "+$3,775", duration: "3h 22m" },
  { id: 5, date: "2024-12-11", side: "SHORT", entry: 4589.50, exit: 4601.25, pnl: "-$1,175", duration: "0h 45m" },
  { id: 6, date: "2024-12-10", side: "LONG", entry: 4475.00, exit: 4512.50, pnl: "+$3,750", duration: "5h 11m" },
];

export const monthlyReturns = [
  { month: "Jan", "2022": 2.1, "2023": -1.3, "2024": 3.4 },
  { month: "Feb", "2022": -0.8, "2023": 1.7, "2024": 2.1 },
  { month: "Mar", "2022": 1.5, "2023": 2.4, "2024": -0.5 },
  { month: "Apr", "2022": 3.2, "2023": -0.9, "2024": 1.8 },
  { month: "May", "2022": -1.1, "2023": 1.2, "2024": 2.7 },
  { month: "Jun", "2022": 0.7, "2023": 3.1, "2024": 1.4 },
  { month: "Jul", "2022": 2.3, "2023": -0.4, "2024": 3.9 },
  { month: "Aug", "2022": -0.3, "2023": 1.8, "2024": -1.2 },
  { month: "Sep", "2022": 1.9, "2023": 2.6, "2024": 2.3 },
  { month: "Oct", "2022": -1.7, "2023": 0.5, "2024": 1.6 },
  { month: "Nov", "2022": 2.8, "2023": 3.3, "2024": 2.9 },
  { month: "Dec", "2022": 0.4, "2023": 1.1, "2024": 1.8 },
];

export const walkForwardData = Array.from({ length: 10 }, (_, i) => ({
  period: `P${i + 1}`,
  inSample: 1.5 + Math.random() * 1.5,
  outOfSample: 0.8 + Math.random() * 1.5,
}));

export const drawdownData = equityCurveData.map((d, i) => {
  const peak = Math.max(...equityCurveData.slice(0, i + 1).map(e => e.equity));
  return { date: d.date, drawdown: ((d.equity - peak) / peak) * 100 };
});
