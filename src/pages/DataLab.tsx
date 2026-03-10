import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { SymbolSelector } from "@/components/trading/SymbolSelector";
import { Wifi, WifiOff } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DataLab = () => {
  const { candles, volatilityData, activeSymbol, setActiveSymbol, activeInterval, isConnected } = useLiveData();

  const latestCandles = candles.slice(-20);

  // Live data statistics
  const totalBars = candles.length;
  const avgVolume = candles.length > 0 ? candles.reduce((s, c) => s + c.volume, 0) / candles.length : 0;
  const firstDate = candles[0]?.date ?? "—";
  const lastDate = candles[candles.length - 1]?.date ?? "—";
  const avgSpread = candles.length > 0
    ? candles.reduce((s, c) => s + (c.high - c.low), 0) / candles.length
    : 0;

  return (
    <DashboardLayout>
      <PageHeader title="Data Lab" description="Live market data inspection and analysis" />

      <div className="flex items-center gap-3 mb-4">
        <SymbolSelector selected={activeSymbol} onChange={setActiveSymbol} />
        <span className={`flex items-center gap-1 text-xs font-mono ${isConnected ? "text-success" : "text-destructive"}`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? "Streaming" : "Reconnecting…"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          {/* Live Data Preview */}
          <div className="card-sharp rounded-sm p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Live OHLCV — {SYMBOL_LABELS[activeSymbol]} <span className="text-primary ml-1">LIVE</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    {["Time", "Open", "High", "Low", "Close", "Volume"].map((h) => (
                      <th key={h} className="pb-2 text-muted-foreground font-medium text-left px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestCandles.map((c, i) => {
                    const bullish = c.close >= c.open;
                    return (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 px-2 text-muted-foreground">{c.date}</td>
                        <td className="py-1.5 px-2">{c.open < 1 ? c.open.toFixed(4) : c.open.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-success">{c.high < 1 ? c.high.toFixed(4) : c.high.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-destructive">{c.low < 1 ? c.low.toFixed(4) : c.low.toFixed(2)}</td>
                        <td className={`py-1.5 px-2 ${bullish ? "text-success" : "text-destructive"}`}>
                          {c.close < 1 ? c.close.toFixed(4) : c.close.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{c.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Config */}
          <div className="card-sharp rounded-sm p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stream Configuration</h3>
            {[
              { label: "Symbol", value: SYMBOL_LABELS[activeSymbol] },
              { label: "Interval", value: activeInterval },
              { label: "Source", value: "Binance WebSocket" },
            ].map((c) => (
              <div key={c.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono text-foreground bg-secondary px-2 py-0.5 rounded-sm text-xs">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <div className="card-sharp rounded-sm p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Realized Volatility <span className="text-primary ml-1">LIVE</span></h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={volatilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
                <Line type="monotone" dataKey="volatility" stroke="hsl(157 100% 48%)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card-sharp rounded-sm p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Volume Distribution <span className="text-primary ml-1">LIVE</span></h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volatilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
                <Bar dataKey="volume" fill="hsl(217 91% 60%)" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-sharp rounded-sm p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Statistics <span className="text-primary ml-1">LIVE</span></h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Bars", value: totalBars.toLocaleString() },
                { label: "Range", value: `${firstDate} — ${lastDate}` },
                { label: "Avg Volume", value: avgVolume > 1e6 ? `${(avgVolume / 1e6).toFixed(1)}M` : avgVolume > 1e3 ? `${(avgVolume / 1e3).toFixed(0)}K` : avgVolume.toFixed(0) },
                { label: "Avg Range", value: avgSpread < 1 ? avgSpread.toFixed(6) : avgSpread.toFixed(2) },
                { label: "Connection", value: isConnected ? "Active" : "Offline" },
                { label: "Interval", value: activeInterval },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DataLab;
