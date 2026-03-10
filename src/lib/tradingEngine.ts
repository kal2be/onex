// Probability-Based Trading Engine
// Generates realistic OHLCV data and computes signals using statistical models

export interface Candle {
  time: number; // unix timestamp ms
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  index: number;
  type: "buy" | "sell";
  price: number;
  probability: number;
  reason: string;
}

export interface EngineConfig {
  initialPrice: number;
  candles: number;
  timeframeMinutes: number;
  volatility: number; // annualized vol %
  drift: number; // annualized drift %
  meanReversionStrength: number;
  trendStrength: number;
  volumeBase: number;
}

export interface EngineResult {
  candles: Candle[];
  signals: Signal[];
  stats: EngineStats;
}

export interface EngineStats {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  avgProbability: number;
  winRate: number;
  profitFactor: number;
  netPnL: number;
  sharpe: number;
  maxDrawdown: number;
  totalTrades: number;
}

// Gaussian random using Box-Muller
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simple Moving Average
function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

// Exponential Moving Average
function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else {
      const prev = result[i - 1] ?? data[i];
      result.push(data[i] * k + prev * (1 - k));
    }
  }
  return result;
}

// RSI
function rsi(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
      continue;
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

// Bollinger Bands
function bollingerBands(closes: number[], period: number = 20, mult: number = 2) {
  const mid = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const stdDev = Math.sqrt(slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period);
    upper.push(mean + mult * stdDev);
    lower.push(mean - mult * stdDev);
  }

  return { upper, mid, lower };
}

// VWAP approximation
function vwap(candles: Candle[]): number[] {
  let cumVol = 0;
  let cumTP = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    cumVol += c.volume;
    cumTP += tp * c.volume;
    return cumVol > 0 ? cumTP / cumVol : tp;
  });
}

// Generate realistic OHLCV data using GBM with regime switching
export function generateCandles(config: EngineConfig): Candle[] {
  const {
    initialPrice,
    candles: count,
    timeframeMinutes,
    volatility,
    drift,
    meanReversionStrength,
    volumeBase,
  } = config;

  const dt = timeframeMinutes / (252 * 6.5 * 60); // fraction of trading year
  const dailyVol = (volatility / 100) * Math.sqrt(dt);
  const dailyDrift = (drift / 100) * dt;

  const result: Candle[] = [];
  let price = initialPrice;
  let regime: "trending" | "ranging" | "volatile" = "trending";
  let regimeCounter = 0;
  const startTime = Date.now() - count * timeframeMinutes * 60000;

  for (let i = 0; i < count; i++) {
    // Regime switching
    regimeCounter++;
    if (regimeCounter > 20 + Math.random() * 40) {
      const r = Math.random();
      regime = r < 0.4 ? "trending" : r < 0.75 ? "ranging" : "volatile";
      regimeCounter = 0;
    }

    let volMult = 1;
    let driftMult = 1;
    if (regime === "volatile") { volMult = 1.8; driftMult = 0.3; }
    if (regime === "ranging") { volMult = 0.6; driftMult = 0.1; }

    // Mean reversion component
    const meanPrice = initialPrice;
    const reversionPull = meanReversionStrength * (meanPrice - price) / meanPrice * dt;

    // GBM step
    const shock = gaussianRandom() * dailyVol * volMult;
    const returnVal = dailyDrift * driftMult + reversionPull + shock;

    const open = price;
    const close = open * (1 + returnVal);

    // Intrabar volatility for wicks
    const intraVol = Math.abs(close - open) * (0.3 + Math.random() * 0.8);
    const high = Math.max(open, close) + Math.abs(gaussianRandom()) * intraVol;
    const low = Math.min(open, close) - Math.abs(gaussianRandom()) * intraVol;

    // Volume with regime-dependent clustering
    const volBase = volumeBase * (regime === "volatile" ? 1.5 : regime === "ranging" ? 0.7 : 1);
    const volume = Math.floor(volBase * (0.5 + Math.random() * 1.0 + Math.abs(returnVal) * 20));

    const time = startTime + i * timeframeMinutes * 60000;
    const d = new Date(time);
    const date = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    result.push({
      time,
      date,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    price = close;
  }

  return result;
}

// Probability-based signal generator
export function computeSignals(candles: Candle[]): Signal[] {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const sma50 = sma(closes, 50);
  const rsiValues = rsi(closes, 14);
  const bb = bollingerBands(closes, 20, 2);
  const vwapValues = vwap(candles);
  const volSma = sma(volumes, 20);

  const signals: Signal[] = [];

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i];
    const e9 = ema9[i]!;
    const e21 = ema21[i]!;
    const s50 = sma50[i]!;
    const r = rsiValues[i];
    const bbU = bb.upper[i];
    const bbL = bb.lower[i];
    const v = vwapValues[i];
    const avgVol = volSma[i];

    if (!r || !bbU || !bbL || !avgVol) continue;

    // Compute buy probability
    let buyProb = 0;
    let sellProb = 0;
    const reasons: string[] = [];

    // EMA crossover
    const prevE9 = ema9[i - 1]!;
    const prevE21 = ema21[i - 1]!;
    if (prevE9 <= prevE21 && e9 > e21) { buyProb += 0.25; reasons.push("EMA9×21↑"); }
    if (prevE9 >= prevE21 && e9 < e21) { sellProb += 0.25; reasons.push("EMA9×21↓"); }

    // Trend alignment
    if (c.close > s50) buyProb += 0.1;
    else sellProb += 0.1;

    // RSI
    if (r < 30) { buyProb += 0.2; reasons.push(`RSI=${r.toFixed(0)}`); }
    else if (r > 70) { sellProb += 0.2; reasons.push(`RSI=${r.toFixed(0)}`); }

    // Bollinger bounce
    if (c.close <= bbL) { buyProb += 0.2; reasons.push("BB↓touch"); }
    if (c.close >= bbU) { sellProb += 0.2; reasons.push("BB↑touch"); }

    // VWAP
    if (c.close > v && c.close < v * 1.002) buyProb += 0.1;
    if (c.close < v && c.close > v * 0.998) sellProb += 0.1;

    // Volume confirmation
    if (c.volume > avgVol * 1.5) {
      buyProb *= 1.3;
      sellProb *= 1.3;
      reasons.push("HighVol");
    }

    // Only generate signal above threshold
    const threshold = 0.45;
    if (buyProb >= threshold && buyProb > sellProb) {
      signals.push({
        index: i,
        type: "buy",
        price: c.close,
        probability: Math.min(buyProb, 0.99),
        reason: reasons.join(" + "),
      });
    } else if (sellProb >= threshold && sellProb > buyProb) {
      signals.push({
        index: i,
        type: "sell",
        price: c.close,
        probability: Math.min(sellProb, 0.99),
        reason: reasons.join(" + "),
      });
    }
  }

  return signals;
}

// Simulate trades from signals
export function simulateTrades(candles: Candle[], signals: Signal[]): EngineStats {
  let position: "long" | "short" | null = null;
  let entryPrice = 0;
  const pnls: number[] = [];
  let equity = 100000;
  let peak = equity;
  let maxDD = 0;

  for (const sig of signals) {
    if (sig.type === "buy" && position !== "long") {
      if (position === "short") {
        const pnl = entryPrice - sig.price;
        pnls.push(pnl);
        equity += pnl * 10;
      }
      position = "long";
      entryPrice = sig.price;
    } else if (sig.type === "sell" && position !== "short") {
      if (position === "long") {
        const pnl = sig.price - entryPrice;
        pnls.push(pnl);
        equity += pnl * 10;
      }
      position = "short";
      entryPrice = sig.price;
    }

    peak = Math.max(peak, equity);
    const dd = (peak - equity) / peak;
    maxDD = Math.max(maxDD, dd);
  }

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const avgReturn = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const stdReturn = pnls.length > 1
    ? Math.sqrt(pnls.reduce((sum, p) => sum + (p - avgReturn) ** 2, 0) / (pnls.length - 1))
    : 1;

  return {
    totalSignals: signals.length,
    buySignals: signals.filter((s) => s.type === "buy").length,
    sellSignals: signals.filter((s) => s.type === "sell").length,
    avgProbability: signals.length > 0
      ? signals.reduce((s, sig) => s + sig.probability, 0) / signals.length
      : 0,
    winRate: pnls.length > 0 ? (wins.length / pnls.length) * 100 : 0,
    profitFactor: losses.length > 0
      ? Math.abs(wins.reduce((a, b) => a + b, 0)) / Math.abs(losses.reduce((a, b) => a + b, 0))
      : wins.length > 0 ? Infinity : 0,
    netPnL: equity - 100000,
    sharpe: stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0,
    maxDrawdown: maxDD * 100,
    totalTrades: pnls.length,
  };
}

export const DEFAULT_CONFIG: EngineConfig = {
  initialPrice: 4500,
  candles: 300,
  timeframeMinutes: 15,
  volatility: 18,
  drift: 8,
  meanReversionStrength: 0.5,
  trendStrength: 0.3,
  volumeBase: 50000,
};

export function runEngine(config: EngineConfig = DEFAULT_CONFIG): EngineResult {
  const candles = generateCandles(config);
  const signals = computeSignals(candles);
  const stats = simulateTrades(candles, signals);
  return { candles, signals, stats };
}
