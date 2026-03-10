import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Button } from "@/components/ui/button";
import { Download, Link, Key, FileJson, FileCode, Terminal } from "lucide-react";
import { toast } from "sonner";

const ExportDeploy = () => {
  const { candles, signals, equityCurve, activeSymbol, tradeList } = useLiveData();

  const exportJSON = () => {
    const data = {
      symbol: activeSymbol,
      exportedAt: new Date().toISOString(),
      candlesCount: candles.length,
      signalsCount: signals.length,
      signals: signals.map(s => ({ type: s.type, price: s.price, probability: s.probability, reason: s.reason })),
      equityCurve,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategy_${activeSymbol}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Strategy exported as JSON");
  };

  const exportPython = () => {
    const code = `# Strategy Export - ${SYMBOL_LABELS[activeSymbol]}
# Generated: ${new Date().toISOString()}
# Signals: ${signals.length} | Candles: ${candles.length}

import pandas as pd

# Live signals from Binance ${SYMBOL_LABELS[activeSymbol]}
signals = [
${signals.slice(0, 20).map(s => `    {"type": "${s.type}", "price": ${s.price}, "probability": ${s.probability.toFixed(3)}, "reason": "${s.reason}"},`).join("\n")}
]

# Trade history
trades = [
${tradeList.slice(0, 10).map(t => `    {"side": "${t.side}", "entry": ${t.entry}, "exit": ${t.exit}, "pnl": "${t.pnl}"},`).join("\n")}
]

df_signals = pd.DataFrame(signals)
print(f"Total signals: {len(df_signals)}")
print(df_signals.head())
`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategy_${activeSymbol}.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Python script exported");
  };

  const exportCSV = () => {
    const header = "time,open,high,low,close,volume\n";
    const rows = candles.map(c => `${c.date},${c.open},${c.high},${c.low},${c.close},${c.volume}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data_${activeSymbol}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${candles.length} candles exported as CSV`);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Export & Deploy" description={`Export live ${SYMBOL_LABELS[activeSymbol]} strategy data and connect to execution`} />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card-sharp rounded-sm p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Export Strategy</h3>
            <div className="space-y-3">
              {[
                { label: "JSON Configuration", desc: `${signals.length} signals · ${candles.length} candles`, icon: FileJson, action: exportJSON },
                { label: "Python Script", desc: "Executable research notebook", icon: FileCode, action: exportPython },
                { label: "Raw Data (CSV)", desc: `${candles.length} OHLCV bars from Binance`, icon: Terminal, action: exportCSV },
              ].map((e) => (
                <button key={e.label} onClick={e.action}
                  className="w-full flex items-center gap-3 p-3 bg-secondary rounded-sm hover:bg-muted transition-colors text-left">
                  <e.icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-sharp rounded-sm p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Connect to Broker</h3>
            <div className="space-y-3">
              {["Interactive Brokers", "Alpaca", "Binance"].map((b) => (
                <div key={b} className="flex items-center justify-between p-3 bg-secondary rounded-sm">
                  <div className="flex items-center gap-3">
                    <Link className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{b}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info(`${b} integration coming soon`)}>Connect</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="card-sharp rounded-sm p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Live Data Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Symbol", value: SYMBOL_LABELS[activeSymbol] },
                { label: "Candles", value: candles.length.toString() },
                { label: "Signals", value: signals.length.toString() },
                { label: "Trades", value: tradeList.length.toString() },
              ].map((k) => (
                <div key={k.label} className="flex items-center justify-between p-2 text-sm">
                  <span className="text-muted-foreground">{k.label}</span>
                  <span className="font-mono text-foreground">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExportDeploy;
