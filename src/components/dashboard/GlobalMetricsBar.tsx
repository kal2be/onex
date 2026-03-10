import { useLiveData } from "@/contexts/LiveDataContext";
import { useEffect, useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";


function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) { setDisplay(value); return; }
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

export function GlobalMetricsBar() {
  const { signals, equityCurve, tradeList, isConnected, regimeData,hmmRegime,microstructure} = useLiveData();
  const isMobile = useIsMobile();

  const lastEquity = equityCurve[equityCurve.length - 1]?.equity ?? 100000;
  const dailyPnL = lastEquity - 100000;
  const dailyPnLPct = (dailyPnL / 100000) * 100;
  const wins = tradeList.filter(t => t.pnl.startsWith("+")).length;
  const winRate = tradeList.length > 0 ? (wins / tradeList.length) * 100 : 0;

  const topRegime = regimeData.reduce((a, b) => a.value > b.value ? a : b, regimeData[0] || { name: "Loading", value: 0 });
 const marketState =
  topRegime?.name === "Bull Trend"
    ? "BULL"
    : topRegime?.name === "Bear Trend"
    ? "BEAR"
    : topRegime?.name === "Volatility Expansion"
    ? "VOLATILE"
    : "RANGE";
  const marketColor =
  marketState === "BULL"
    ? "text-success"
    : marketState === "BEAR"
    ? "text-destructive"
    : marketState === "VOLATILE"
    ? "text-warning"
    : "text-muted-foreground";

  const metrics = [
    {
      label: "Equity",
      value: <AnimatedCounter value={lastEquity} prefix="$" decimals={0} />,
      color: "text-foreground",
    },
    {
      label: "P&L",
      value: <AnimatedCounter value={dailyPnL} prefix={dailyPnL >= 0 ? "+$" : "-$"} decimals={0} />,
      sub: <AnimatedCounter value={Math.abs(dailyPnLPct)} prefix={dailyPnLPct >= 0 ? "+" : "-"} suffix="%" decimals={2} />,
      color: dailyPnL >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Signals",
      value: <span>{signals.length}</span>,
      color: "text-primary",
    },
    {
      label: "Win Rate",
      value: <AnimatedCounter value={winRate} suffix="%" decimals={1} />,
      color: winRate > 50 ? "text-success" : "text-destructive",
    },
    ...(!isMobile ? [
      {
        label: "Market",
        value: <span>{marketState}</span>,
        color: marketColor,
      },
      {
        label: "Engine",
        value: <span className="flex items-center gap-1">{isConnected ? "ON" : "OFF"} <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-destructive"}`} /></span>,
        color: isConnected ? "text-success" : "text-destructive",
      },
      {
  label: "Regime",
  value: <span>{hmmRegime}</span>,
  color: "text-primary",
},
{
  label: "Structure",
  value: <span>{microstructure}</span>,
  color: "text-primary",
}
    ] : []),
  ];

  return (
    <div className="glass-panel border-b border-border/50 px-2 sm:px-3 py-1.5 sm:py-2 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-3 sm:gap-4 min-w-max">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
              <span className={`text-xs sm:text-sm font-mono font-semibold ${m.color}`}>
                {m.value}
                {m.sub && <span className="text-[9px] sm:text-[10px] ml-1 opacity-75">{m.sub}</span>}
              </span>
            </div>
            {i < metrics.length - 1 && <div className="w-px h-5 sm:h-6 bg-border/50 ml-1 sm:ml-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}
