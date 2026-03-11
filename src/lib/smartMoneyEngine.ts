import type { Candle } from "@/lib/tradingEngine";

export interface SmartMoneyLevel {
  type: "OrderBlock" | "FVG" | "LiquidityVoid" | "MSB";
  priceTop: number;
  priceBottom: number;
  index: number;
}

export function detectSmartMoney(candles: Candle[]): SmartMoneyLevel[] {

  if (candles.length < 20) return [];

  const levels: SmartMoneyLevel[] = [];

  for (let i = 2; i < candles.length - 2; i++) {

    const prev = candles[i - 1];
    const cur = candles[i];
    const next = candles[i + 1];

    // -------------------------
    // Fair Value Gap
    // -------------------------
    if (prev.high < next.low) {
      levels.push({
        type: "FVG",
        priceTop: next.low,
        priceBottom: prev.high,
        index: i
      });
    }

    if (prev.low > next.high) {
      levels.push({
        type: "FVG",
        priceTop: prev.low,
        priceBottom: next.high,
        index: i
      });
    }

    // -------------------------
    // Liquidity Void
    // -------------------------
    const range = cur.high - cur.low;
    const avgRange =
      (prev.high - prev.low + next.high - next.low) / 2;

    if (range > avgRange * 2.5) {
      levels.push({
        type: "LiquidityVoid",
        priceTop: cur.high,
        priceBottom: cur.low,
        index: i
      });
    }

    // -------------------------
    // Order Block
    // -------------------------
    const bullishBreak = cur.close > prev.high;
    const bearishBreak = cur.close < prev.low;

    if (bullishBreak) {
      levels.push({
        type: "OrderBlock",
        priceTop: prev.high,
        priceBottom: prev.low,
        index: i
      });
    }

    if (bearishBreak) {
      levels.push({
        type: "OrderBlock",
        priceTop: prev.high,
        priceBottom: prev.low,
        index: i
      });
    }

    // -------------------------
    // Market Structure Break
    // -------------------------
    const prevHigh = Math.max(...candles.slice(i - 5, i).map(c => c.high));
    const prevLow = Math.min(...candles.slice(i - 5, i).map(c => c.low));

    if (cur.close > prevHigh || cur.close < prevLow) {
      levels.push({
        type: "MSB",
        priceTop: cur.high,
        priceBottom: cur.low,
        index: i
      });
    }
  }

  return levels;
}