import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS, type CryptoSymbol } from "@/hooks/useBinanceStream";
import { toast } from "sonner";
import { Plus, X, TrendingUp, TrendingDown, Briefcase, Trash2, Edit3, Check, Shield, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Position {
  id: string;
  symbol: string;
  side: string;
  entry_price: number;
  quantity: number;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  closed_price: number | null;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export function PortfolioTracker() {
  const { user } = useAuth();
  const { tickers } = useLiveData();
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSL, setEditSL] = useState("");
  const [editTP, setEditTP] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const isMobile = useIsMobile();

  const [form, setForm] = useState({
    symbol: "BTCUSDT" as string,
    side: "long" as "long" | "short",
    entry_price: "",
    quantity: "",
    stop_loss: "",
    take_profit: "",
    notes: "",
  });

  const loadPositions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("portfolio_positions")
      .select("*")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false });

    if (!error && data) setPositions(data as unknown as Position[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  const addPosition = async () => {
    if (!user) return;
    const entry = parseFloat(form.entry_price);
    const qty = parseFloat(form.quantity);
    if (!entry || !qty || entry <= 0 || qty <= 0) {
      toast.error("Enter valid price and quantity");
      return;
    }

    const { error } = await supabase.from("portfolio_positions").insert({
      user_id: user.id,
      symbol: form.symbol,
      side: form.side,
      entry_price: entry,
      quantity: qty,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
      take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
      notes: form.notes || null,
    } as any);

    if (error) {
      toast.error("Failed to add position");
    } else {
      toast.success("Position added");
      setShowAdd(false);
      setForm({ symbol: "BTCUSDT", side: "long", entry_price: "", quantity: "", stop_loss: "", take_profit: "", notes: "" });
      loadPositions();
    }
  };

  const updateSLTP = async (pos: Position) => {
    const sl = editSL ? parseFloat(editSL) : null;
    const tp = editTP ? parseFloat(editTP) : null;

    const { error } = await supabase.from("portfolio_positions")
      .update({ stop_loss: sl, take_profit: tp } as any)
      .eq("id", pos.id);

    if (!error) {
      toast.success("SL/TP updated");
      setEditingId(null);
      loadPositions();
    } else {
      toast.error("Failed to update");
    }
  };

  const closePosition = async (pos: Position) => {
    const ticker = tickers.find(t => t.symbol === pos.symbol);
    const closePrice = ticker?.price || 0;
    if (closePrice <= 0) { toast.error("Cannot get current price"); return; }

    const pnl = pos.side === "long"
      ? (closePrice - pos.entry_price) * pos.quantity
      : (pos.entry_price - closePrice) * pos.quantity;

    const { error } = await supabase.from("portfolio_positions")
      .update({ status: "closed", closed_price: closePrice, pnl, closed_at: new Date().toISOString() } as any)
      .eq("id", pos.id);

    if (!error) {
      toast.success(`Position closed: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
      loadPositions();
    }
  };

  const deletePosition = async (id: string) => {
    await supabase.from("portfolio_positions").delete().eq("id", id);
    loadPositions();
  };

  const openPositions = positions.filter(p => p.status === "open");
  const closedPositions = positions.filter(p => p.status === "closed");

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => {
    const ticker = tickers.find(t => t.symbol === pos.symbol);
    if (!ticker) return sum;
    const pnl = pos.side === "long"
      ? (ticker.price - pos.entry_price) * pos.quantity
      : (pos.entry_price - ticker.price) * pos.quantity;
    return sum + pnl;
  }, 0);

  const totalRealizedPnL = closedPositions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
  const totalInvested = openPositions.reduce((sum, pos) => sum + (pos.entry_price * pos.quantity), 0);

  const inputClass = "w-full bg-background border border-border rounded-sm px-2 py-2 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none";

  const getRiskInfo = (pos: Position) => {
    const ticker = tickers.find(t => t.symbol === pos.symbol);
    const currentPrice = ticker?.price || 0;
    const positionValue = pos.entry_price * pos.quantity;
    
    const unrealizedPnL = pos.side === "long"
      ? (currentPrice - pos.entry_price) * pos.quantity
      : (pos.entry_price - currentPrice) * pos.quantity;
    const pnlPct = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;

    // Risk to SL
    let riskToSL = null;
    if (pos.stop_loss) {
      riskToSL = pos.side === "long"
        ? ((pos.stop_loss - pos.entry_price) / pos.entry_price) * 100
        : ((pos.entry_price - pos.stop_loss) / pos.entry_price) * 100;
    }

    // Reward to TP
    let rewardToTP = null;
    if (pos.take_profit) {
      rewardToTP = pos.side === "long"
        ? ((pos.take_profit - pos.entry_price) / pos.entry_price) * 100
        : ((pos.entry_price - pos.take_profit) / pos.entry_price) * 100;
    }

    // Risk/Reward ratio
    const rrRatio = (riskToSL && rewardToTP && riskToSL !== 0) ? Math.abs(rewardToTP / riskToSL) : null;

    // Distance to SL/TP from current price
    let distToSL = null;
    let distToTP = null;
    if (pos.stop_loss && currentPrice > 0) {
      distToSL = ((currentPrice - pos.stop_loss) / currentPrice) * 100;
      if (pos.side === "short") distToSL = -distToSL;
    }
    if (pos.take_profit && currentPrice > 0) {
      distToTP = ((pos.take_profit - currentPrice) / currentPrice) * 100;
      if (pos.side === "short") distToTP = -distToTP;
    }

    return { currentPrice, unrealizedPnL, pnlPct, riskToSL, rewardToTP, rrRatio, distToSL, distToTP, positionValue };
  };

  return (
    <div className="glass-panel rounded-sm p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Portfolio
        </h3>
        <button onClick={() => setShowAdd(!showAdd)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors text-muted-foreground hover:text-primary">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-secondary/50 rounded-sm p-2">
          <span className="text-[9px] text-muted-foreground uppercase">Unrealized</span>
          <p className={`text-xs sm:text-sm font-mono font-semibold ${totalUnrealizedPnL >= 0 ? "text-success" : "text-destructive"}`}>
            {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-sm p-2">
          <span className="text-[9px] text-muted-foreground uppercase">Realized</span>
          <p className={`text-xs sm:text-sm font-mono font-semibold ${totalRealizedPnL >= 0 ? "text-success" : "text-destructive"}`}>
            {totalRealizedPnL >= 0 ? "+" : ""}${totalRealizedPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-sm p-2">
          <span className="text-[9px] text-muted-foreground uppercase">Invested</span>
          <p className="text-xs sm:text-sm font-mono font-semibold text-foreground">
            ${totalInvested.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["open", "closed"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[11px] font-mono uppercase rounded-sm transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
            {tab} ({tab === "open" ? openPositions.length : closedPositions.length})
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="border border-border rounded-sm p-3 mb-3 space-y-2.5 animate-in fade-in duration-200">
          <select value={form.symbol} onChange={(e) => setForm(f => ({ ...f, symbol: e.target.value }))}
            className={inputClass}>
            {Object.entries(SYMBOL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1.5">
            {(["long", "short"] as const).map(s => (
              <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
                className={`py-2 text-xs font-mono rounded-sm transition-colors ${form.side === s ? (s === "long" ? "bg-success/20 text-success border border-success/30" : "bg-destructive/20 text-destructive border border-destructive/30") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Entry Price" value={form.entry_price} onChange={(e) => setForm(f => ({ ...f, entry_price: e.target.value }))} className={inputClass} />
            <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Stop Loss" value={form.stop_loss} onChange={(e) => setForm(f => ({ ...f, stop_loss: e.target.value }))} className={inputClass} />
            <input type="number" placeholder="Take Profit" value={form.take_profit} onChange={(e) => setForm(f => ({ ...f, take_profit: e.target.value }))} className={inputClass} />
          </div>
          <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} />
          <button onClick={addPosition} className="w-full py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors">
            Add Position
          </button>
        </div>
      )}

      {/* Open positions */}
      {activeTab === "open" && (
        openPositions.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {openPositions.map((pos) => {
              const risk = getRiskInfo(pos);
              const isEditing = editingId === pos.id;

              return (
                <div key={pos.id} className="rounded-sm bg-secondary/30 hover:bg-secondary/40 transition-colors overflow-hidden">
                  {/* Header row */}
                  <div className="p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-semibold ${pos.side === "long" ? "text-success" : "text-destructive"}`}>
                          {pos.side === "long" ? <TrendingUp className="w-3.5 h-3.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 inline" />}
                        </span>
                        <span className="text-xs font-mono font-medium text-foreground">{SYMBOL_LABELS[pos.symbol as CryptoSymbol] || pos.symbol}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded-sm font-mono ${pos.side === "long" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {pos.side.toUpperCase()}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${risk.unrealizedPnL >= 0 ? "text-success neon-green" : "text-destructive neon-red"}`}>
                        {risk.unrealizedPnL >= 0 ? "+" : ""}${risk.unrealizedPnL.toFixed(2)}
                        <span className="text-[10px] opacity-75 ml-0.5">({risk.pnlPct >= 0 ? "+" : ""}{risk.pnlPct.toFixed(1)}%)</span>
                      </span>
                    </div>

                    {/* Position details */}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mb-2">
                      <span>Qty: <span className="text-foreground">{pos.quantity}</span></span>
                      <span>Entry: <span className="text-foreground">{pos.entry_price}</span></span>
                      <span>Now: <span className="text-foreground">{risk.currentPrice < 1 ? risk.currentPrice.toFixed(4) : risk.currentPrice.toFixed(2)}</span></span>
                    </div>

                    {/* SL/TP + Risk info */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className="bg-background/50 rounded-sm px-2 py-1.5">
                        <span className="text-[9px] text-destructive uppercase">Stop Loss</span>
                        <p className="text-[11px] font-mono text-foreground">
                          {pos.stop_loss ? pos.stop_loss : "—"}
                          {risk.distToSL !== null && (
                            <span className="text-[9px] text-muted-foreground ml-1">({risk.distToSL.toFixed(1)}%)</span>
                          )}
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-sm px-2 py-1.5">
                        <span className="text-[9px] text-success uppercase">Take Profit</span>
                        <p className="text-[11px] font-mono text-foreground">
                          {pos.take_profit ? pos.take_profit : "—"}
                          {risk.distToTP !== null && (
                            <span className="text-[9px] text-muted-foreground ml-1">({risk.distToTP.toFixed(1)}%)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Risk metrics row */}
                    <div className="flex items-center gap-2 text-[10px] font-mono mb-2">
                      {risk.rrRatio !== null && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 rounded-sm">
                          <Shield className="w-2.5 h-2.5 text-accent" />
                          R:R <span className={`font-semibold ${risk.rrRatio >= 2 ? "text-success" : risk.rrRatio >= 1 ? "text-warning" : "text-destructive"}`}>1:{risk.rrRatio.toFixed(1)}</span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-secondary rounded-sm text-muted-foreground">
                        Value: <span className="text-foreground">${risk.positionValue.toFixed(0)}</span>
                      </span>
                      {risk.riskToSL !== null && Math.abs(risk.riskToSL) > 5 && (
                        <span className="flex items-center gap-0.5 text-warning">
                          <AlertTriangle className="w-2.5 h-2.5" /> High risk
                        </span>
                      )}
                    </div>

                    {/* Edit SL/TP */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <input type="number" placeholder="SL" value={editSL} onChange={(e) => setEditSL(e.target.value)}
                          className="flex-1 bg-background border border-destructive/30 rounded-sm px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-destructive" />
                        <input type="number" placeholder="TP" value={editTP} onChange={(e) => setEditTP(e.target.value)}
                          className="flex-1 bg-background border border-success/30 rounded-sm px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-success" />
                        <button onClick={() => updateSLTP(pos)} className="p-1.5 bg-primary rounded-sm text-primary-foreground hover:bg-primary/90">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-secondary rounded-sm text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditingId(pos.id); setEditSL(pos.stop_loss?.toString() || ""); setEditTP(pos.take_profit?.toString() || ""); }}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 bg-secondary text-muted-foreground rounded-sm hover:text-foreground transition-colors">
                          <Edit3 className="w-3 h-3" /> Modify SL/TP
                        </button>
                        <button onClick={() => closePosition(pos)}
                          className="flex-1 text-[10px] py-1.5 bg-warning/20 text-warning rounded-sm hover:bg-warning/30 transition-colors font-medium">
                          Close Position
                        </button>
                        <button onClick={() => deletePosition(pos.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono text-center py-6">No open positions — add one above</p>
        )
      )}

      {/* Closed positions */}
      {activeTab === "closed" && (
        closedPositions.length > 0 ? (
          <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
            {closedPositions.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between py-2 px-2.5 rounded-sm bg-secondary/20 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className={pos.side === "long" ? "text-success" : "text-destructive"}>
                    {pos.side === "long" ? "▲" : "▼"}
                  </span>
                  <span className="text-foreground">{SYMBOL_LABELS[pos.symbol as CryptoSymbol] || pos.symbol}</span>
                  <span className="text-[10px] text-muted-foreground">{pos.quantity} @ {pos.entry_price}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={pos.pnl && pos.pnl >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {pos.pnl && pos.pnl >= 0 ? "+" : ""}${(pos.pnl || 0).toFixed(2)}
                  </span>
                  <button onClick={() => deletePosition(pos.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono text-center py-6">No closed positions yet</p>
        )
      )}
    </div>
  );
}
