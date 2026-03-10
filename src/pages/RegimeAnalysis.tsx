import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMemo } from "react";

const RegimeAnalysis = () => {
  const { regimeData, regimePerformance, equityCurve, candles, activeSymbol } = useLiveData();

  // Live volatility heatmap from candles
  const volHeatmap = useMemo(() => {
    if (candles.length < 48) return Array.from({ length: 48 }, () => Math.random());
    const step = Math.floor(candles.length / 48);
    return Array.from({ length: 48 }, (_, i) => {
      const idx = Math.min(i * step, candles.length - 2);
      const ret = Math.abs(Math.log(candles[idx + 1]?.close / candles[idx]?.close) || 0);
      return Math.min(ret / 0.05, 1); // normalize
    });
  }, [candles]);

  return (
    <DashboardLayout>
      <PageHeader title="Regime Analysis" description={`Live market regime classification — ${SYMBOL_LABELS[activeSymbol]}`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-sharp rounded-sm p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Regime Distribution <span className="text-primary ml-1">LIVE</span></h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={regimeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="hsl(220 26% 12%)" strokeWidth={2}>
                {regimeData.map((_, i) => <Cell key={i} fill={regimeData[i].fill} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {regimeData.map((r) => (
              <span key={r.name} className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.fill }} /> {r.name} ({r.value}%)
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-2 card-sharp rounded-sm p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Equity Curve by Regime <span className="text-primary ml-1">LIVE</span></h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
              <Line type="monotone" dataKey="equity" stroke="hsl(157 100% 48%)" strokeWidth={2} dot={false} name="Strategy" />
              <Line type="monotone" dataKey="benchmark" stroke="hsl(218 11% 65%)" strokeWidth={1} dot={false} name="Buy & Hold" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-sharp rounded-sm p-4 mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Performance by Regime <span className="text-primary ml-1">LIVE</span></h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Regime", "Trades", "Win Rate", "Avg Return", "Sharpe"].map((h) => (
                <th key={h} className="pb-2 text-xs text-muted-foreground font-medium text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regimePerformance.map((r) => (
              <tr key={r.regime} className="border-b border-border/30">
                <td className="py-2.5 font-medium">{r.regime}</td>
                <td className="py-2.5 font-mono text-muted-foreground">{r.trades}</td>
                <td className="py-2.5 font-mono">{r.winRate}</td>
                <td className={`py-2.5 font-mono ${r.avgReturn.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{r.avgReturn}</td>
                <td className={`py-2.5 font-mono ${r.sharpe > 0 ? 'text-success' : 'text-destructive'}`}>{r.sharpe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-sharp rounded-sm p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Volatility Heatmap <span className="text-primary ml-1">LIVE</span></h3>
        <div className="grid grid-cols-12 gap-0.5">
          {volHeatmap.map((intensity, i) => (
            <div key={i} className="aspect-square rounded-sm" style={{ backgroundColor: `hsl(157 100% ${20 + intensity * 40}% / ${0.3 + intensity * 0.7})` }} title={`Vol: ${(intensity * 30).toFixed(1)}%`} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RegimeAnalysis;
