import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS, CRYPTO_SYMBOLS, INTERVALS, type CryptoSymbol, type BinanceInterval } from "@/hooks/useBinanceStream";
import { toast } from "sonner";

const Settings = () => {
  const { activeSymbol, setActiveSymbol, activeInterval, setActiveInterval } = useLiveData();

  const [notifications, setNotifications] = useState({
    backtestComplete: true,
    optimizationDone: true,
    errorAlerts: true,
    priceAlerts: true,
  });

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success(`${key} ${next[key] ? "enabled" : "disabled"}`);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Platform configuration — changes apply globally across all pages" />

      <div className="grid grid-cols-2 gap-6">
        <div className="card-sharp rounded-sm p-5 space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Market Configuration</h3>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Default Symbol</span>
            <select value={activeSymbol} onChange={(e) => { setActiveSymbol(e.target.value as CryptoSymbol); toast.success(`Symbol changed to ${SYMBOL_LABELS[e.target.value as CryptoSymbol]}`); }}
              className="bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {CRYPTO_SYMBOLS.map(s => <option key={s} value={s}>{SYMBOL_LABELS[s]}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Default Interval</span>
            <select value={activeInterval} onChange={(e) => { setActiveInterval(e.target.value as BinanceInterval); toast.success(`Interval changed to ${e.target.value}`); }}
              className="bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data Source</span>
            <span className="font-mono text-foreground bg-secondary px-3 py-1.5 rounded-sm text-sm">Binance (Live)</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Base Currency</span>
            <span className="font-mono text-foreground bg-secondary px-3 py-1.5 rounded-sm text-sm">USDT</span>
          </div>
        </div>

        <div className="card-sharp rounded-sm p-5 space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notifications</h3>
          {[
            { label: "Backtest Complete", key: "backtestComplete" as const },
            { label: "Optimization Done", key: "optimizationDone" as const },
            { label: "Error Alerts", key: "errorAlerts" as const },
            { label: "Price Alerts", key: "priceAlerts" as const },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{n.label}</span>
              <button onClick={() => toggleNotif(n.key)}
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${notifications[n.key] ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${notifications[n.key] ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
