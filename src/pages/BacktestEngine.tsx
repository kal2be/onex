import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { computeSignals, simulateTrades, type EngineStats } from "@/lib/tradingEngine";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, TrendingUp, Target, Activity, BarChart3 } from "lucide-react";

const SelectField = ({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange?: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select value={value} onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const InputField = ({ label, value, onChange }: { label: string; value: string; onChange?: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input value={value} onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
  </div>
);

const BacktestEngine = () => {
  const { candles, activeSymbol } = useLiveData();

  const [riskPerTrade, setRiskPerTrade] = useState("2.0");
  const [posModel, setPosModel] = useState("Fixed Fractional");
  const [maxTrades, setMaxTrades] = useState("5");
  const [slModel, setSlModel] = useState("ATR-Based");
  const [tpModel, setTpModel] = useState("Risk:Reward Ratio");
  const [slippage, setSlippage] = useState("Volume-Dependent");
  const [spread, setSpread] = useState("Variable (Time-Based)");
  const [commission, setCommission] = useState("$2.50");
  const [capital, setCapital] = useState("$100,000");

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<EngineStats | null>(null);

  const runBacktest = useCallback(() => {
    if (candles.length < 60) return;
    setIsRunning(true);
    setTimeout(() => {
      const signals = computeSignals(candles);
      const stats = simulateTrades(candles, signals);
      setResult(stats);
      setIsRunning(false);
    }, 400);
  }, [candles]);

  return (
    <DashboardLayout>
      <PageHeader title="Backtest Engine" description={`Run backtests on live ${SYMBOL_LABELS[activeSymbol]} data — ${candles.length} bars`} />

      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <StatCard label="Net P&L" value={`${result.netPnL >= 0 ? "+" : ""}$${result.netPnL.toFixed(0)}`} trend={result.netPnL >= 0 ? "up" : "down"} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Sharpe Ratio" value={result.sharpe.toFixed(2)} trend={result.sharpe > 1 ? "up" : "down"} icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Win Rate" value={`${result.winRate.toFixed(1)}%`} trend={result.winRate > 50 ? "up" : "down"} icon={<Target className="w-4 h-4" />} />
          <StatCard label="Trades" value={result.totalTrades.toString()} subValue={`${result.buySignals}B / ${result.sellSignals}S`} trend="neutral" icon={<BarChart3 className="w-4 h-4" />} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card-sharp rounded-sm p-5 space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Configuration</h3>
          <InputField label="Risk Per Trade (%)" value={riskPerTrade} onChange={setRiskPerTrade} />
          <SelectField label="Position Sizing Model" options={["Fixed Fractional", "Kelly Criterion", "Optimal F", "Equal Weight"]} value={posModel} onChange={setPosModel} />
          <InputField label="Max Simultaneous Trades" value={maxTrades} onChange={setMaxTrades} />
          <SelectField label="Stop Loss Model" options={["Fixed %", "ATR-Based", "Volatility-Adjusted", "Trailing"]} value={slModel} onChange={setSlModel} />
          <SelectField label="Take Profit Model" options={["Fixed %", "Risk:Reward Ratio", "ATR-Based", "Dynamic"]} value={tpModel} onChange={setTpModel} />
        </div>

        <div className="card-sharp rounded-sm p-5 space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Execution Model</h3>
          <SelectField label="Slippage Model" options={["None", "Fixed (1 tick)", "Volume-Dependent", "Random"]} value={slippage} onChange={setSlippage} />
          <SelectField label="Spread Behavior" options={["Fixed", "Variable (Time-Based)", "Stochastic"]} value={spread} onChange={setSpread} />
          <InputField label="Commission (per side)" value={commission} onChange={setCommission} />
          <InputField label="Initial Capital" value={capital} onChange={setCapital} />
          <div className="pt-4">
            <Button className="w-full gap-2" size="lg" onClick={runBacktest} disabled={isRunning || candles.length < 60}>
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Running on Live Data…" : `Run on ${candles.length} Live Bars`}
            </Button>
          </div>
          <p className="text-xs text-primary font-mono text-center">Using live {SYMBOL_LABELS[activeSymbol]} data</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BacktestEngine;
