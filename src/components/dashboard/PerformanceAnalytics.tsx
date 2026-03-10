import { useLiveData } from "@/contexts/LiveDataContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts";
import { BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function PerformanceAnalytics() {
  const { equityCurve, drawdownData, tradeList, signals } = useLiveData();
  const isMobile = useIsMobile();

  const wins = tradeList.filter(t => t.pnl.startsWith("+")).length;
  const losses = tradeList.filter(t => !t.pnl.startsWith("+")).length;
  const winRate = tradeList.length > 0 ? (wins / tradeList.length) * 100 : 0;

  const avgWin = tradeList.filter(t => t.pnl.startsWith("+")).reduce((s, t) => s + parseFloat(t.pnl.replace("$", "").replace("+", "")), 0) / (wins || 1);
  const avgLoss = tradeList.filter(t => !t.pnl.startsWith("+")).reduce((s, t) => s + Math.abs(parseFloat(t.pnl.replace("$", ""))), 0) / (losses || 1);
  const profitFactor = avgLoss > 0 ? (avgWin * wins) / (avgLoss * losses) : wins > 0 ? Infinity : 0;

  const lastEquity = equityCurve[equityCurve.length - 1]?.equity ?? 100000;
  const netPnL = lastEquity - 100000;
  const maxDD = drawdownData.reduce((min, d) => Math.min(min, d.drawdown), 0);

  const avgProb = signals.length > 0 ? signals.reduce((s, sig) => s + sig.probability, 0) / signals.length : 0;
  const sharpe = tradeList.length > 2 ? ((netPnL / 100000) / (Math.abs(maxDD / 100) || 0.01)) : 0;

  const statRows = [
    { label: "Total Trades", value: `${tradeList.length}` },
    { label: "Win Rate", value: `${winRate.toFixed(1)}%`, color: winRate > 50 ? "text-success" : "text-destructive" },
    { label: "Profit Factor", value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2) },
    { label: "Avg Win", value: `+$${avgWin.toFixed(0)}`, color: "text-success" },
    { label: "Avg Loss", value: `-$${avgLoss.toFixed(0)}`, color: "text-destructive" },
    { label: "Max Drawdown", value: `${maxDD.toFixed(1)}%`, color: "text-destructive" },
    { label: "Avg Confidence", value: `${(avgProb * 100).toFixed(0)}%`, color: "text-primary" },
    { label: "Net P&L", value: `${netPnL >= 0 ? "+" : ""}$${netPnL.toFixed(0)}`, color: netPnL >= 0 ? "text-success" : "text-destructive" },
  ];

  const tooltipStyle = { backgroundColor: "hsl(220 26% 10%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 };
  const equityHeight = isMobile ? 140 : 180;
  const ddHeight = isMobile ? 80 : 100;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Equity Curve */}
      <div className="glass-panel rounded-sm p-3 sm:p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Equity Curve
          <span className="text-[10px] text-primary font-mono ml-auto">LIVE</span>
        </h3>
        <ResponsiveContainer width="100%" height={equityHeight}>
          <AreaChart data={equityCurve}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(157 100% 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(157 100% 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 15%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(218 11% 50%)" }} tickLine={false} axisLine={false} hide={isMobile} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(218 11% 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={isMobile ? 40 : 50} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="equity" stroke="hsl(157 100% 48%)" strokeWidth={2} fill="url(#equityGrad)" />
            <Line type="monotone" dataKey="benchmark" stroke="hsl(218 11% 45%)" strokeWidth={1} dot={false} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Drawdown */}
      <div className="glass-panel rounded-sm p-3 sm:p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3">Drawdown</h3>
        <ResponsiveContainer width="100%" height={ddHeight}>
          <AreaChart data={drawdownData}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis tick={{ fontSize: 9, fill: "hsl(218 11% 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={isMobile ? 35 : 40} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="drawdown" stroke="hsl(0 84% 60%)" strokeWidth={1.5} fill="url(#ddGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="glass-panel rounded-sm p-3 sm:p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5">
          {statRows.map((s, i) => (
            <div key={i} className="flex justify-between text-[11px] sm:text-xs font-mono py-0.5">
              <span className="text-muted-foreground">{s.label}</span>
              <span className={s.color || "text-foreground"}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
