import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Bell, BellRing, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  triggered: boolean;
  createdAt: number;
}

interface PriceAlertPanelProps {
  currentPrice: number;
  symbol: string;
}

export function PriceAlertPanel({ currentPrice, symbol }: PriceAlertPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const prevPriceRef = useRef(currentPrice);

  // Check alerts against current price
  useEffect(() => {
    if (currentPrice <= 0) return;

    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.triggered || alert.symbol !== symbol) return alert;

        const crossed =
          (alert.direction === "above" && currentPrice >= alert.targetPrice && prevPriceRef.current < alert.targetPrice) ||
          (alert.direction === "below" && currentPrice <= alert.targetPrice && prevPriceRef.current > alert.targetPrice);

        if (crossed) {
          toast.success(`🔔 Price Alert: ${symbol}`, {
            description: `Price crossed ${alert.direction} ${alert.targetPrice.toLocaleString()} — now at ${currentPrice.toLocaleString()}`,
            duration: 10000,
          });
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );

    prevPriceRef.current = currentPrice;
  }, [currentPrice, symbol]);

  const addAlert = useCallback(() => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    const newAlert: PriceAlert = {
      id: Math.random().toString(36).slice(2, 8),
      symbol,
      targetPrice: price,
      direction,
      triggered: false,
      createdAt: Date.now(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setTargetPrice("");
    toast.info(`Alert set: ${symbol} ${direction} ${price.toLocaleString()}`);
  }, [targetPrice, direction, symbol]);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const activeAlerts = alerts.filter((a) => !a.triggered && a.symbol === symbol);
  const triggeredAlerts = alerts.filter((a) => a.triggered && a.symbol === symbol);

  return (
    <div className="card-sharp rounded-sm p-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Bell className="w-3 h-3" />
        Price Alerts
      </h3>

      {/* Add alert form */}
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setDirection("above")}
            className={`flex items-center justify-center gap-1 py-1.5 text-xs font-mono rounded-sm transition-colors ${
              direction === "above"
                ? "bg-success/20 text-success border border-success/30"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <ArrowUpRight className="w-3 h-3" /> Above
          </button>
          <button
            onClick={() => setDirection("below")}
            className={`flex items-center justify-center gap-1 py-1.5 text-xs font-mono rounded-sm transition-colors ${
              direction === "below"
                ? "bg-destructive/20 text-destructive border border-destructive/30"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <ArrowDownRight className="w-3 h-3" /> Below
          </button>
        </div>
        <div className="flex gap-1">
          <input
            type="number"
            step="0.01"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : "Price"}
            onKeyDown={(e) => e.key === "Enter" && addAlert()}
            className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addAlert}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-sm hover:bg-primary/90 transition-colors"
          >
            Set
          </button>
        </div>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {activeAlerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-sm bg-secondary/50"
            >
              <span className={a.direction === "above" ? "text-success" : "text-destructive"}>
                {a.direction === "above" ? "▲" : "▼"} {a.targetPrice.toLocaleString()}
              </span>
              <button
                onClick={() => removeAlert(a.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">Triggered</span>
          {triggeredAlerts.slice(0, 5).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded-sm bg-primary/5 opacity-60"
            >
              <span className="flex items-center gap-1 text-muted-foreground">
                <BellRing className="w-3 h-3 text-primary" />
                {a.targetPrice.toLocaleString()}
              </span>
              <button onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeAlerts.length === 0 && triggeredAlerts.length === 0 && (
        <p className="text-xs text-muted-foreground">No alerts set</p>
      )}
    </div>
  );
}
