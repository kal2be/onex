import { useLiveData } from "@/contexts/LiveDataContext";
import { Play, Pause, Zap, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface DbStrategy {
  id: string;
  name: string;
  symbol: string;
  status: string;
  test_results: any;
}

export function StrategyStatusPanel() {
  const { signals, isConnected } = useLiveData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dbStrategies, setDbStrategies] = useState<DbStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("strategies")
        .select("id, name, symbol, status, test_results")
        .order("created_at", { ascending: false });
      setDbStrategies((data as DbStrategy[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const lastSignal = signals[signals.length - 1];
  const avgConf = signals.length > 0 ? signals.reduce((s, sig) => s + sig.probability, 0) / signals.length : 0;

  const hasStrategies = dbStrategies.length > 0;

  return (
    <div className="glass-panel rounded-sm p-3 sm:p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" /> Active Strategies
      </h3>
      <div className="space-y-2">
        {/* Default built-in strategy — only show when no user strategies */}
        {!hasStrategies && (
          <div className={`rounded-sm p-2.5 transition-all ${isConnected ? "bg-primary/5 border border-primary/20" : "bg-secondary/30 border border-transparent"}`}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">Default (EMA Cross + RSI)</span>
              <span className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 ${
                isConnected ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
              }`}>
                {isConnected ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                {isConnected ? "RUNNING" : "PAUSED"}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              <span>Signals: <span className="text-foreground">{signals.length}</span></span>
              <span>Last: <span className="text-foreground">{lastSignal ? new Date().toLocaleTimeString() : "—"}</span></span>
              {avgConf > 0 && (
                <span>Conf: <span className="text-primary">{(avgConf * 100).toFixed(0)}%</span></span>
              )}
            </div>
          </div>
        )}

        {/* User-created strategies from database */}
        {loading && (
          <div className="text-[10px] text-muted-foreground text-center py-3 font-mono">Loading strategies...</div>
        )}
        {hasStrategies && dbStrategies.map((s) => {
          const results = s.test_results;
          const winRate = results?.winRate ?? 0;
          const totalTrades = results?.totalTrades ?? 0;
          const isActive = s.status === "active" || s.status === "tested";
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/strategy?deploy=${s.id}`)}
              className={`w-full text-left rounded-sm p-2.5 transition-all hover:border-primary/30 ${
                isActive ? "bg-primary/5 border border-primary/20" : "bg-secondary/30 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{s.name}</span>
                <span className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 ${
                  isActive ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {isActive ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                  {isActive ? "ACTIVE" : s.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
                <span>Symbol: <span className="text-foreground">{s.symbol}</span></span>
                {totalTrades > 0 && (
                  <>
                    <span>Trades: <span className="text-foreground">{totalTrades}</span></span>
                    <span>Win: <span className="text-primary">{winRate.toFixed(0)}%</span></span>
                  </>
                )}
              </div>
            </button>
          );
        })}

        {/* Empty state prompt */}
        {!loading && !hasStrategies && (
          <button
            onClick={() => navigate("/research")}
            className="w-full rounded-sm border border-dashed border-border p-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Create a strategy in Research
          </button>
        )}
      </div>
    </div>
  );
}
