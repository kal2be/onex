import type { Candle } from "@/lib/tradingEngine";

export function detectLiquidityLevels(candles: Candle[]) {

  if (candles.length < 50) return [];

  const levels: any[] = [];

  const lookback = 40;

  for (let i = candles.length - lookback; i < candles.length - 1; i++) {

    const c = candles[i];

    const prev = candles.slice(i - 5, i);
    if (prev.length < 5) continue;

    const prevHigh = Math.max(...prev.map(p => p.high));
    const prevLow = Math.min(...prev.map(p => p.low));

    // Liquidity pool (equal highs)
    if (Math.abs(c.high - prevHigh) / prevHigh < 0.001) {
      levels.push({
        price: c.high,
        type: "Liquidity Pool",
        strength: 2
      });
    }

    // Stop cluster (equal lows)
    if (Math.abs(c.low - prevLow) / prevLow < 0.001) {
      levels.push({
        price: c.low,
        type: "Stop Cluster",
        strength: 2
      });
    }

    // Breakout trap
    if (c.high > prevHigh && c.close < prevHigh) {
      levels.push({
        price: prevHigh,
        type: "Breakout Trap",
        strength: 3
      });
    }

    // Institutional footprint (large candle)
    const range = c.high - c.low;
    const avgRange =
      prev.reduce((s,p)=>s+(p.high-p.low),0)/prev.length;

    if (range > avgRange * 2) {
      levels.push({
        price: (c.high + c.low) / 2,
        type: "Institutional Footprint",
        strength: 4
      });
    }
  }

  return levels;
}