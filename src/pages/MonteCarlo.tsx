import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS } from "@/hooks/useBinanceStream";
import { Play, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const MonteCarlo = () => {
  const { candles, activeSymbol } = useLiveData();
  const [numSims, setNumSims] = useState(500);
  const [numPaths, setNumPaths] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  // Compute returns from live candles
  const liveReturns = useMemo(() => {
    if (candles.length < 10) return [];
    return candles.slice(1).map((c, i) => Math.log(c.close / candles[i].close));
  }, [candles]);

  // Run MC simulation using bootstrapped returns from live data
  const { paths, histogram, stats } = useMemo(() => {
    if (liveReturns.length < 10) {
      return { paths: [], histogram: [], stats: { median: 0, worstDD: 0, probRuin: 0 } };
    }

    const pathLength = Math.min(liveReturns.length, 100);
    const allFinal: number[] = [];
    const displayPaths: { step: number; value: number; path: number }[][] = [];

    for (let p = 0; p < numSims; p++) {
      let equity = 100000;
      let peak = equity;
      let maxDD = 0;
      const pathData: { step: number; value: number; path: number }[] = [];

      for (let s = 0; s < pathLength; s++) {
        // Bootstrap: pick random return from live data
        const r = liveReturns[Math.floor(Math.random() * liveReturns.length)];
        equity *= Math.exp(r);
        peak = Math.max(peak, equity);
        maxDD = Math.max(maxDD, (peak - equity) / peak);

        if (p < numPaths) {
          pathData.push({ step: s, value: equity, path: p });
        }
      }

      allFinal.push(((equity - 100000) / 100000) * 100);
      if (p < numPaths) displayPaths.push(pathData);
    }

    // Stats
    allFinal.sort((a, b) => a - b);
    const median = allFinal[Math.floor(allFinal.length / 2)] ?? 0;
    const worstDD = allFinal[Math.floor(allFinal.length * 0.05)] ?? 0;
    const probRuin = (allFinal.filter((r) => r < -50).length / allFinal.length) * 100;

    // Histogram
    const buckets = 20;
    const min = allFinal[0] ?? -50;
    const max = allFinal[allFinal.length - 1] ?? 50;
    const range = max - min || 1;
    const hist = Array.from({ length: buckets }, (_, i) => ({
      bucket: `${(min + (i * range) / buckets).toFixed(0)}%`,
      count: 0,
    }));
    allFinal.forEach((r) => {
      const idx = Math.min(Math.floor(((r - min) / range) * buckets), buckets - 1);
      hist[idx].count++;
    });

    return {
      paths: displayPaths,
      histogram: hist,
      stats: { median, worstDD, probRuin },
    };
  }, [liveReturns, numSims, numPaths, runCount]);

  const rerun = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      setRunCount((c) => c + 1);
      setIsRunning(false);
    }, 200);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Monte Carlo Simulation" description={`Bootstrapped from live ${SYMBOL_LABELS[activeSymbol]} returns`} />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Simulations</label>
          <input type="number" value={numSims} onChange={(e) => setNumSims(+e.target.value)} min={100} max={10000} step={100}
            className="w-24 bg-background border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Display Paths</label>
          <input type="number" value={numPaths} onChange={(e) => setNumPaths(+e.target.value)} min={5} max={50} step={5}
            className="w-20 bg-background border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button onClick={rerun} disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? "Running…" : "Re-Run"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Median Return" value={`${stats.median >= 0 ? "+" : ""}${stats.median.toFixed(1)}%`} trend={stats.median >= 0 ? "up" : "down"} />
        <StatCard label="5th Percentile" value={`${stats.worstDD.toFixed(1)}%`} subValue="Worst case" trend="down" />
        <StatCard label="Prob. of Ruin" value={`${stats.probRuin.toFixed(1)}%`} subValue={stats.probRuin < 5 ? "Low" : "High"} trend={stats.probRuin < 5 ? "up" : "down"} />
        <StatCard label="Simulations" value={numSims.toLocaleString()} subValue="Complete" trend="neutral" />
      </div>

      <div className="card-sharp rounded-sm p-4 mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Equity Paths ({numSims} simulations) <span className="text-primary ml-1">LIVE DATA</span>
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
            <XAxis dataKey="step" type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
            {paths.map((path, i) => (
              <Line key={i} data={path} type="monotone" dataKey="value" stroke={`hsl(157 100% 48% / 0.15)`} strokeWidth={1} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card-sharp rounded-sm p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Return Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 26% 12%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "2px", fontSize: 11 }} />
            <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
};

export default MonteCarlo;
