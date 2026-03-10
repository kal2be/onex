import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Clock } from "lucide-react";

export function TradeTimeline() {
  const { signals, activeSymbol } = useLiveData();

  const recentSignals = signals.slice(-10).reverse();
  const symbolBase = SYMBOL_LABELS[activeSymbol].split("/")[0];

  return (
    <div className="glass-panel rounded-sm p-3 sm:p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-accent" /> Trade Timeline
      </h3>

      {recentSignals.length > 0 ? (
        <div className="space-y-0 relative max-h-[250px] overflow-y-auto scrollbar-thin">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />

          {recentSignals.map((s, i) => {
            const time = new Date(Date.now() - i * 300000).toLocaleTimeString().slice(0, 5);
            const action = s.type === "buy" ? "BUY" : "SELL";
            const label = i === 0 ? `${action} ${symbolBase}` :
              s.type !== recentSignals[i - 1]?.type ? `${action} ${symbolBase}` :
              `${action} ${symbolBase}`;

            return (
              <div key={i} className="flex items-start gap-2.5 sm:gap-3 py-1.5 relative pl-5">
                <div className={`absolute left-0.5 top-2.5 w-3 h-3 rounded-full border-2 ${
                  s.type === "buy" ? "bg-success/20 border-success" : "bg-destructive/20 border-destructive"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
                    <span className={`text-[11px] sm:text-xs font-mono font-medium ${s.type === "buy" ? "text-success" : "text-destructive"}`}>
                      {label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    @ {s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)} · {(s.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-mono text-center py-4">No trade events yet</p>
      )}
    </div>
  );
}
