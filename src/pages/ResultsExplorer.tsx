import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useMemo } from "react";

const ResultsExplorer = () => {
  const { equityCurve, drawdownData, tradeList, signals, candles, activeSymbol } = useLiveData();

  const lastEq = equityCurve[equityCurve.length - 1]?.equity ?? 100000;
  const totalReturn = ((lastEq - 100000) / 100000) * 100;
  const wins = tradeList.filter(t => t.pnl.startsWith("+")).length;
  const winRate = tradeList.length > 0 ? ((wins / tradeList.length) * 100).toFixed(1) : "0";
  const maxDD = drawdownData.length > 0 ? Math.min(...drawdownData.map(d => d.drawdown)) : 0;

  // Sharpe from equity curve
  const sharpe = useMemo(() => {
    if (equityCurve.length < 3) return 0;
    const returns = equityCurve.slice(1).map((e, i) => (e.equity - equityCurve[i].equity) / equityCurve[i].equity);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
    return std > 0 ? (mean / std) * Math.sqrt(252) : 0;
  }, [equityCurve]);

  const exportCSV = () => {
    const header = "Side,Entry,Exit,PnL,Duration\n";
    const rows = tradeList.map(t => `${t.side},${t.entry},${t.exit},${t.pnl},${t.duration}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades_${activeSymbol}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Results Explorer" description={`Live performance analysis — ${SYMBOL_LABELS[activeSymbol]}`} />
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Return" value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`} trend={totalReturn >= 0 ? "up" : "down"} />
        <StatCard label="Sharpe" value={sharpe.toFixed(2)} trend={sharpe > 1 ? "up" : "down"} />
        <StatCard label="Max Drawdown" value={`${maxDD.toFixed(1)}%`} trend="down" />
        <StatCard label="Win Rate" value={`${winRate}%`} trend={Number(winRate) > 50 ? "up" : "down"} />
        <StatCard label="Total Signals" value={signals.length.toString()} trend="neutral" />
      </div>

      <div className="card-sharp rounded-sm p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Equity Curve <span className="text-primary ml-1">LIVE</span></h3>
        <ResponsiveContainer width="100%" height={250}>
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

      <div className="card-sharp rounded-sm p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Drawdown <span className="text-primary ml-1">LIVE</span></h3>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={drawdownData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
            <Area type="monotone" dataKey="drawdown" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60% / 0.15)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card-sharp rounded-sm p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Trade History <span className="text-primary ml-1">LIVE</span></h3>
        {tradeList.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-4">Waiting for signals to generate trades…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Side", "Entry", "Exit", "P&L", "Duration"].map((h) => (
                  <th key={h} className="pb-2 text-xs text-muted-foreground font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tradeList.map((t) => (
                <tr key={t.id} className="border-b border-border/30">
                  <td className={`py-2 font-mono text-xs font-medium ${t.side === 'LONG' ? 'text-success' : 'text-destructive'}`}>{t.side}</td>
                  <td className="py-2 font-mono text-xs">{t.entry < 1 ? t.entry.toFixed(4) : t.entry.toFixed(2)}</td>
                  <td className="py-2 font-mono text-xs">{t.exit < 1 ? t.exit.toFixed(4) : t.exit.toFixed(2)}</td>
                  <td className={`py-2 font-mono text-xs ${t.pnl.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{t.pnl}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{t.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResultsExplorer;
