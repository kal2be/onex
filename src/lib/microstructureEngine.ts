import type { Candle } from "@/lib/tradingEngine";

export function detectMicrostructure(candles: Candle[]) {

  if (candles.length < 50) return "Loading";

  const last = candles.length - 1;
  const current = candles[last];

  const prevHigh = Math.max(...candles.slice(last - 20, last).map(c => c.high));
  const prevLow = Math.min(...candles.slice(last - 20, last).map(c => c.low));

  const avgVolume =
    candles.slice(last - 20, last).reduce((a, b) => a + b.volume, 0) / 20;

  const avgRange =
    candles.slice(last - 20, last).reduce((a, b) => a + (b.high - b.low), 0) / 20;

  const range = current.high - current.low;

  const volumeSpike = current.volume / avgVolume;

  // Liquidity sweep (wick above highs then close back)
  if (current.high > prevHigh && current.close < prevHigh) {
    return "Liquidity Sweep";
  }

  // Stop hunt (wick below lows then close back)
  if (current.low < prevLow && current.close > prevLow) {
    return "Stop Hunt";
  }

  // Breakout compression (small ranges)
  if (range < avgRange * 0.5) {
    return "Breakout Compression";
  }

  // Volatility expansion
  if (range > avgRange * 2) {
    return "Volatility Expansion";
  }

  // Order flow imbalance (volume spike)
  if (volumeSpike > 2) {
    return "Order Flow Imbalance";
  }

  return "Neutral Structure";
}