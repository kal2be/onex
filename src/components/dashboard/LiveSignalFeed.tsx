import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Radio } from "lucide-react";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function LiveSignalFeed() {
  const { signals, activeSymbol } = useLiveData();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(signals.length);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (signals.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevCountRef.current = signals.length;
  }, [signals.length]);

  const recentSignals = signals.slice(-25).reverse();

  return (
    <div className="glass-panel rounded-sm p-3 sm:p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-primary animate-pulse" /> Live Signal Feed
      </h3>

      {isMobile ? (
        /* Mobile: compact card layout */
        <div ref={scrollRef} className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
          {recentSignals.length > 0 ? recentSignals.map((s, i) => {
            const isNew = i === 0 && signals.length > 1;
            return (
              <div key={`${s.index}-${i}`}
                className={`flex items-center justify-between py-2 px-2.5 rounded-sm bg-secondary/30 transition-all ${
                  isNew ? "animate-in fade-in slide-in-from-top-1 duration-300 bg-primary/5" : ""
                }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-mono font-semibold ${s.type === "buy" ? "text-success" : "text-destructive"}`}>
                    {s.type === "buy" ? "▲ BUY" : "▼ SELL"}
                  </span>
                  <span className="text-[11px] font-mono text-foreground">{SYMBOL_LABELS[activeSymbol].split("/")[0]}</span>
                </div>
                <span className="text-primary text-xs font-mono font-semibold">{(s.probability * 100).toFixed(0)}%</span>
              </div>
            );
          }) : (
            <p className="text-xs text-muted-foreground font-mono py-6 text-center">Waiting for signals…</p>
          )}
        </div>
      ) : (
        /* Desktop: table layout */
        <>
          <div className="grid grid-cols-5 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium pb-1.5 border-b border-border/50 mb-1">
            <span>Time</span>
            <span>Symbol</span>
            <span>Strategy</span>
            <span>Signal</span>
            <span className="text-right">Conf</span>
          </div>

          <div ref={scrollRef} className="space-y-0 max-h-[240px] overflow-y-auto scrollbar-thin">
            {recentSignals.length > 0 ? recentSignals.map((s, i) => {
              const isNew = i === 0 && signals.length > 1;
              return (
                <div key={`${s.index}-${i}`}
                  className={`grid grid-cols-5 gap-2 py-1.5 text-xs font-mono border-b border-border/20 last:border-0 transition-all ${
                    isNew ? "animate-in fade-in slide-in-from-top-1 duration-300 bg-primary/5" : ""
                  }`}>
                  <span className="text-muted-foreground">{new Date().toLocaleTimeString().slice(0, 5)}</span>
                  <span className="text-foreground">{SYMBOL_LABELS[activeSymbol].split("/")[0]}</span>
                  <span className="text-muted-foreground">Default</span>
                  <span className={`font-semibold ${s.type === "buy" ? "text-success" : "text-destructive"}`}>
                    {s.type === "buy" ? "▲ BUY" : "▼ SELL"}
                  </span>
                  <span className="text-primary text-right">{(s.probability * 100).toFixed(0)}%</span>
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground font-mono py-6 text-center">Waiting for signals…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
