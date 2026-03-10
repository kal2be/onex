import { useState, useCallback, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { StatCard } from "@/components/StatCard";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS, type CryptoSymbol } from "@/hooks/useBinanceStream";
import { simulateTrades } from "@/lib/tradingEngine";
import {
  Activity, TrendingUp, TrendingDown, BarChart3, Timer, Target,
  Zap, Wifi, WifiOff, FlaskConical,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const MATH_MODEL_NAMES: Record<string, string> = {
  ema_crossover: "EMA Crossover",
  rsi_threshold: "RSI Threshold",
  bollinger_bands: "Bollinger Bands",
  macd: "MACD",
  volume_spike: "Volume Spike",
  atr_filter: "ATR Filter",
  stochastic: "Stochastic",
  mean_reversion: "Mean Reversion",
};

interface DeployedStrategy {
  id: string;
  name: string;
  symbol: string;
  entry_logic: any[];
  exit_logic: any[];
}

const variables = ["Close", "Open", "High", "Low", "Volume", "SMA()", "EMA()", "StdDev()", "ATR()", "RSI()", "VWAP", "BollingerBands()"];

const StrategyBuilder = () => {
  const { candles, signals, activeSymbol, isConnected, currentPrice, setActiveSymbol } = useLiveData();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const deployedId = searchParams.get("deploy");

  const [deployedStrategy, setDeployedStrategy] = useState<DeployedStrategy | null>(null);

  const [formula, setFormula] = useState(
    `# Probability-Based Strategy\nentry = EMA(9) crosses above EMA(21)\n  AND RSI(14) < 30\n  AND Close > SMA(50)\n  AND Volume > SMA(Volume, 20) * 1.5\n\nexit = EMA(9) crosses below EMA(21)\n  OR RSI(14) > 70\n  OR Close touches BollingerBands(upper)`
  );

  // Load deployed strategy
  useEffect(() => {
    if (!deployedId) { setDeployedStrategy(null); return; }
    const load = async () => {
      const { data } = await supabase
        .from("strategies")
        .select("*")
        .eq("id", deployedId)
        .single();
      if (data) {
        setDeployedStrategy({
          id: data.id,
          name: data.name,
          symbol: data.symbol,
          entry_logic: data.entry_logic as any[] || [],
          exit_logic: data.exit_logic as any[] || [],
        });
        // Switch to the strategy's symbol
        if (data.symbol) {
          setActiveSymbol(data.symbol as CryptoSymbol);
        }
        // Update formula display
        const entryText = (data.entry_logic as any[] || []).map((c: any, i: number) => {
          const name = MATH_MODEL_NAMES[c.model_id] || c.model_id;
          const params = Object.entries(c.params || {}).map(([k, v]) => `${k}=${v}`).join(", ");
          return `${i > 0 ? `  ${c.operator || "AND"} ` : ""}${name}(${params}) → ${c.direction}`;
        }).join("\n");
        const exitText = (data.exit_logic as any[] || []).map((c: any, i: number) => {
          const name = MATH_MODEL_NAMES[c.model_id] || c.model_id;
          const params = Object.entries(c.params || {}).map(([k, v]) => `${k}=${v}`).join(", ");
          return `${i > 0 ? `  ${c.operator || "AND"} ` : ""}${name}(${params}) → ${c.direction}`;
        }).join("\n");
        setFormula(`# ${data.name}\n\nentry =\n${entryText || "  (default signals)"}\n\nexit =\n${exitText || "  (default signals)"}`);
      }
    };
    load();
  }, [deployedId, setActiveSymbol]);

  const stats = useMemo(() => {
    if (candles.length < 60) return null;
    return simulateTrades(candles, signals);
  }, [candles, signals]);

  const insertVariable = (v: string) => {
    setFormula((prev) => prev + `\n${v}`);
  };

  const chartHeight = isMobile ? 300 : 420;

  return (
    <DashboardLayout>
      <PageHeader
        title={deployedStrategy ? `Signals — ${deployedStrategy.name}` : "Signals"}
        description={`Live signal generation on ${SYMBOL_LABELS[activeSymbol]}`}
      />

      {/* Deployed strategy banner */}
      {deployedStrategy && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 border border-primary/20 rounded-sm animate-in fade-in duration-200">
          <FlaskConical className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">Deployed Strategy:</span>
            <span className="text-xs text-foreground ml-1.5 font-mono">{deployedStrategy.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {deployedStrategy.entry_logic.slice(0, 3).map((c: any, i: number) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground font-mono">
                {MATH_MODEL_NAMES[c.model_id] || c.model_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`flex items-center gap-1 text-xs font-mono ${isConnected ? "text-success" : "text-destructive"}`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? "Live" : "Reconnecting…"}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {SYMBOL_LABELS[activeSymbol]} · {candles.length} bars · {signals.length} signals
        </span>
        {currentPrice > 0 && (
          <span className="text-xs font-mono text-foreground ml-auto">
            ${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <StatCard label="Net P&L" value={`${stats.netPnL >= 0 ? "+" : ""}$${stats.netPnL.toFixed(0)}`} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Sharpe" value={stats.sharpe.toFixed(2)} icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Drawdown" value={`-${stats.maxDrawdown.toFixed(1)}%`} icon={<TrendingDown className="w-4 h-4" />} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={<Target className="w-4 h-4" />} />
          <StatCard label="P.Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} icon={<BarChart3 className="w-4 h-4" />} />
          <StatCard label="Trades" value={`${stats.totalTrades}`} icon={<Timer className="w-4 h-4" />} />
        </div>
      )}

      {/* Chart */}
      <div className="card-sharp rounded-sm p-2 sm:p-3 mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Live Signal Chart
            </h3>
            <span className="text-xs font-mono text-primary">LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Buy</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Sell</span>
          </div>
        </div>
        <TradingViewChart candles={candles} signals={signals} height={chartHeight} />
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Formula editor */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card-sharp rounded-sm p-3 sm:p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Variables</h3>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button key={v} onClick={() => insertVariable(v)}
                  className="text-xs font-mono bg-secondary text-muted-foreground px-2 py-1 rounded-sm cursor-pointer hover:text-primary hover:bg-primary/10 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="card-sharp rounded-sm p-3 sm:p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Strategy Logic</h3>
            <textarea
              className="w-full h-24 sm:h-28 bg-background border border-border rounded-sm p-3 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              value={formula} onChange={(e) => setFormula(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card-sharp rounded-sm p-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Entry Condition</h3>
              <div className="bg-background border border-border rounded-sm p-2.5 font-mono text-xs text-success leading-relaxed">
                {deployedStrategy
                  ? deployedStrategy.entry_logic.map((c: any) => MATH_MODEL_NAMES[c.model_id] || c.model_id).join(" + ")
                  : "EMA(9) × EMA(21)↑ + RSI < 30 + Volume spike + Trend filter"
                }
              </div>
            </div>
            <div className="card-sharp rounded-sm p-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Exit Condition</h3>
              <div className="bg-background border border-border rounded-sm p-2.5 font-mono text-xs text-destructive leading-relaxed">
                {deployedStrategy && deployedStrategy.exit_logic.length > 0
                  ? deployedStrategy.exit_logic.map((c: any) => MATH_MODEL_NAMES[c.model_id] || c.model_id).join(" + ")
                  : "EMA(9) × EMA(21)↓ + RSI > 70 + Bollinger upper touch"
                }
              </div>
            </div>
          </div>
        </div>

        {/* Signal log */}
        <div className="space-y-3">
          <div className="card-sharp rounded-sm p-3 sm:p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Live Signals <span className="text-primary ml-1">({signals.length})</span>
            </h3>
            {signals.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {signals.slice(-15).reverse().map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-border/30 last:border-0">
                    <span className={s.type === "buy" ? "text-success" : "text-destructive"}>
                      {s.type === "buy" ? "▲" : "▼"} {s.type.toUpperCase()}
                    </span>
                    <span className="text-foreground">
                      {s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)}
                    </span>
                    <span className="text-primary">{(s.probability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono py-4 text-center">
                {candles.length < 60 ? "Loading live data…" : "Waiting for signals…"}
              </p>
            )}
          </div>

          {stats && (
            <div className="card-sharp rounded-sm p-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Performance Summary</h3>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Signals</span><span>{stats.totalSignals} ({stats.buySignals}B / {stats.sellSignals}S)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Probability</span><span className="text-primary">{(stats.avgProbability * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sharpe Ratio</span><span>{stats.sharpe.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max Drawdown</span><span className="text-destructive">-{stats.maxDrawdown.toFixed(1)}%</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StrategyBuilder;
