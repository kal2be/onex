import { useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
  status: "filled" | "pending";
}

interface OrderEntryPanelProps {
  currentPrice: number;
  symbol: string;
}

export function OrderEntryPanel({ currentPrice, symbol }: OrderEntryPanelProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("0.01");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error("Invalid quantity");
      return;
    }
    const price = orderType === "market" ? currentPrice : parseFloat(limitPrice);
    if (!price || price <= 0) {
      toast.error("Invalid price");
      return;
    }

    const order: Order = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      side,
      type: orderType,
      price,
      quantity: qty,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      timestamp: Date.now(),
      status: orderType === "market" ? "filled" : "pending",
    };

    setOrders((prev) => [order, ...prev].slice(0, 20));
    toast.success(
      `${side.toUpperCase()} ${qty} ${symbol} @ ${price.toFixed(2)}`,
      { description: `Order ${order.id} ${order.status}` }
    );
  };

  const total = (parseFloat(quantity) || 0) * (orderType === "market" ? currentPrice : parseFloat(limitPrice) || 0);

  return (
    <div className="space-y-3">
      {/* Order entry */}
      <div className="card-sharp rounded-sm p-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Order Entry
        </h3>

        {/* Buy/Sell toggle */}
        <div className="grid grid-cols-2 gap-1 mb-3">
          <button
            onClick={() => setSide("buy")}
            className={`flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-sm transition-colors ${
              side === "buy"
                ? "bg-success text-success-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            BUY
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-sm transition-colors ${
              side === "sell"
                ? "bg-destructive text-destructive-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            SELL
          </button>
        </div>

        {/* Order type */}
        <div className="flex gap-1 mb-3">
          {(["market", "limit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-xs font-mono rounded-sm transition-colors ${
                orderType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Price (limit only) */}
        {orderType === "limit" && (
          <div className="mb-2">
            <label className="text-xs text-muted-foreground mb-1 block">Price</label>
            <input
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={currentPrice.toFixed(2)}
              className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Quantity */}
        <div className="mb-2">
          <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {/* Quick buttons */}
          <div className="flex gap-1 mt-1">
            {["0.001", "0.01", "0.1", "1"].map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className="flex-1 py-1 text-[10px] font-mono bg-secondary text-muted-foreground rounded-sm hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stop Loss</label>
            <input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Take Profit</label>
            <input
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
              className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between text-xs font-mono mb-3 py-1.5 px-2 bg-secondary rounded-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="text-foreground">${total.toFixed(2)}</span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className={`w-full py-2.5 text-xs font-semibold rounded-sm transition-colors ${
            side === "buy"
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {side === "buy" ? "BUY" : "SELL"} {symbol.replace("USDT", "")}
        </button>
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="card-sharp rounded-sm p-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Recent Orders
          </h3>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-sm bg-secondary/50"
              >
                <span className={`font-semibold ${o.side === "buy" ? "text-success" : "text-destructive"}`}>
                  {o.side === "buy" ? "▲" : "▼"} {o.quantity}
                </span>
                <span className="text-foreground">{o.price.toFixed(2)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                  o.status === "filled" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                }`}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
