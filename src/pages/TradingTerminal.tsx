import { useState, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlobalMetricsBar } from "@/components/dashboard/GlobalMetricsBar";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { SymbolSelector } from "@/components/trading/SymbolSelector";
import { OrderEntryPanel } from "@/components/trading/OrderEntryPanel";
import { PriceAlertPanel } from "@/components/trading/PriceAlertPanel";
import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { LiveSignalFeed } from "@/components/dashboard/LiveSignalFeed";
import { StatCard } from "@/components/StatCard";
import {
  Activity, TrendingUp, TrendingDown, BarChart3, Timer, Target,
  Zap, RefreshCw, Monitor, ArrowUpRight, ArrowDownRight, Wifi, WifiOff,
} from "lucide-react";
import {
  INTERVALS, SYMBOL_LABELS,
  type CryptoSymbol, type BinanceInterval,
} from "@/hooks/useBinanceStream";
import {
  runEngine, DEFAULT_CONFIG,
  type EngineConfig, type Signal,
} from "@/lib/tradingEngine";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useIsMobile } from "@/hooks/use-mobile";

type Mode = "live" | "sim";

const TradingTerminal = () => {
  const [mode, setMode] = useState<Mode>("live");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const isMobile = useIsMobile();

  const {
    activeSymbol: symbol, setActiveSymbol: setSymbol,
    activeInterval: timeInterval, setActiveInterval: setTimeInterval,
    candles: liveCandles, signals: liveSignals,
    currentPrice, isConnected, error,
  } = useLiveData();

  const [simResult, setSimResult] = useState<ReturnType<typeof runEngine> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<EngineConfig>({ ...DEFAULT_CONFIG, candles: 500 });

  const tfMinutes: Record<string, number> = { "1m": 1, "3m": 3, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440 };

  const runSim = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const c = { ...config, timeframeMinutes: tfMinutes[timeInterval] || 15 };
      setSimResult(runEngine(c));
      setIsRunning(false);
    }, 300);
  }, [config, timeInterval]);

  useEffect(() => { if (mode === "sim" && !simResult) runSim(); }, [mode]);

  const candles = mode === "live" ? liveCandles : (simResult?.candles ?? []);
  const signals = mode === "live" ? liveSignals : (simResult?.signals ?? []);
  const stats = mode === "sim" ? simResult?.stats : null;

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const price = mode === "live" ? currentPrice : (lastCandle?.close ?? 0);
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const priceChangePct = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;

  const chartHeight = isMobile ? 350 : 520;

  return (
    <DashboardLayout>
      <GlobalMetricsBar />

      <div className="p-2.5 sm:p-4 lg:p-5">
        {/* Top bar */}
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Monitor className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Trading Terminal</h1>
              <div className="flex bg-secondary rounded-sm overflow-hidden">
                {(["live", "sim"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`px-3 py-1 text-xs font-mono uppercase transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {m === "live" ? "🔴 Live" : "⚡ Sim"}
                  </button>
                ))}
              </div>
              {mode === "live" && (
                <span className={`flex items-center gap-1 text-xs font-mono ${isConnected ? "text-success" : "text-destructive"}`}>
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Connected" : "Reconnecting…"}
                </span>
              )}
            </div>
            {price > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{SYMBOL_LABELS[symbol]}</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                  {price < 1 ? price.toFixed(4) : price < 100 ? price.toFixed(3) : price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-sm font-mono ${priceChange >= 0 ? "text-success neon-green" : "text-destructive neon-red"}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {priceChange >= 0 ? "+" : ""}{priceChange < 1 ? priceChange.toFixed(4) : priceChange.toFixed(2)} ({priceChangePct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {mode === "live" && <SymbolSelector selected={symbol} onChange={setSymbol} />}
            <div className="flex bg-secondary rounded-sm overflow-x-auto scrollbar-none">
              {INTERVALS.map((tf) => (
                <button key={tf} onClick={() => setTimeInterval(tf)}
                  className={`px-2.5 py-1.5 text-xs font-mono transition-colors whitespace-nowrap ${timeInterval === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {tf}
                </button>
              ))}
            </div>
            {mode === "sim" && (
              <button onClick={runSim} disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {isRunning ? "Running…" : "Run Engine"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2 mb-3 text-xs text-destructive font-mono">{error}</div>
        )}

        {stats && mode === "sim" && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            <StatCard label="Net P&L" value={`${stats.netPnL >= 0 ? "+" : ""}$${stats.netPnL.toFixed(0)}`} trend={stats.netPnL >= 0 ? "up" : "down"} icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatCard label="Sharpe" value={stats.sharpe.toFixed(2)} icon={<Activity className="w-3.5 h-3.5" />} />
            <StatCard label="Drawdown" value={`-${stats.maxDrawdown.toFixed(1)}%`} trend="down" icon={<TrendingDown className="w-3.5 h-3.5" />} />
            <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} trend={stats.winRate > 50 ? "up" : "down"} icon={<Target className="w-3.5 h-3.5" />} />
            <StatCard label="P.Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <StatCard label="Signals" value={`${stats.totalSignals}`} icon={<Timer className="w-3.5 h-3.5" />} />
          </div>
        )}

        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_280px]"}`}>
          <div className="space-y-3">
            <div className="glass-panel rounded-sm p-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {SYMBOL_LABELS[symbol]} · {timeInterval} · {candles.length} bars{mode === "live" && " · LIVE"}
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-success" /> Buy</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Sell</span>
                </span>
              </div>
              <TradingViewChart candles={candles} signals={signals} height={chartHeight} />
            </div>

            {/* Live signal feed below chart */}
            {mode === "live" && <LiveSignalFeed />}
          </div>

          <div className="space-y-3">
            <OrderEntryPanel currentPrice={price} symbol={symbol} />
            <PriceAlertPanel currentPrice={price} symbol={symbol} />
            <PortfolioTracker />

            <div className="glass-panel rounded-sm p-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Signal Book ({signals.length})</h3>
              {signals.length > 0 ? (
                <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                  {signals.slice(-20).reverse().map((s, i) => (
                    <button key={i} onClick={() => setSelectedSignal(s)}
                      className={`w-full flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-sm transition-colors ${
                        selectedSignal?.index === s.index ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary border border-transparent"
                      }`}>
                      <span className={`font-semibold ${s.type === "buy" ? "text-success" : "text-destructive"}`}>
                        {s.type === "buy" ? "▲" : "▼"} {s.type.toUpperCase()}
                      </span>
                      <span className="text-foreground">{s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)}</span>
                      <span className="text-primary">{(s.probability * 100).toFixed(0)}%</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{candles.length < 50 ? "Loading data…" : "No signals"}</p>
              )}
            </div>

            {selectedSignal && (
              <div className="glass-panel rounded-sm p-3 animate-in fade-in duration-200">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Signal Detail</h3>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className={selectedSignal.type === "buy" ? "text-success" : "text-destructive"}>{selectedSignal.type.toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="text-foreground">{selectedSignal.price.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Probability</span><span className="text-primary">{(selectedSignal.probability * 100).toFixed(1)}%</span></div>
                  <div className="pt-1 border-t border-border"><span className="text-muted-foreground">Factors</span><p className="text-foreground mt-0.5 leading-relaxed">{selectedSignal.reason}</p></div>
                </div>
              </div>
            )}

            {mode === "sim" && (
              <div className="glass-panel rounded-sm p-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Engine Config</h3>
                <div className="space-y-2">
                  {[
                    { label: "Candles", key: "candles" as const, min: 100, max: 1000, step: 50 },
                    { label: "Volatility %", key: "volatility" as const, min: 5, max: 50, step: 1 },
                    { label: "Drift %", key: "drift" as const, min: -20, max: 40, step: 1 },
                    { label: "Init Price", key: "initialPrice" as const, min: 100, max: 50000, step: 100 },
                  ].map(({ label, key, min, max, step }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input type="number" min={min} max={max} step={step} value={config[key]}
                        onChange={(e) => setConfig((prev) => ({ ...prev, [key]: +e.target.value }))}
                        className="w-20 bg-background border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TradingTerminal;
