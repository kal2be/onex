import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useBinanceStream, type CryptoSymbol, type BinanceInterval, SYMBOL_LABELS, CRYPTO_SYMBOLS } from "@/hooks/useBinanceStream";
import { computeSignals, type Candle, type Signal } from "@/lib/tradingEngine";
import { extractFeatures } from "@/lib/marketFeatures"
import { classifyHMM } from "@/lib/regimeHMM"
import { detectMicrostructure } from "@/lib/microstructureEngine";
import { detectLiquidityLevels } from "@/lib/liquidityEngine";

// Fetch historical klines for any symbol (REST only, for multi-symbol)
const REST_ENDPOINTS = [
  "https://api.binance.com/api/v3/klines",
  "https://data-api.binance.vision/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function fetchKlines(symbol: string, interval: string, limit = 500): Promise<Candle[]> {
  for (const base of REST_ENDPOINTS) {
    try {
      const url = `${base}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      return data.map((k: any[]) => ({
        time: k[0],
        date: formatDate(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch {
      continue;
    }
  }
  return [];
}

// 24hr ticker for all symbols
export interface TickerData {
  symbol: CryptoSymbol;
  price: number;
  change24h: number;
  changePct24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

// Only fetch top coins for the ticker strip (not all 56)
const TICKER_SYMBOLS: CryptoSymbol[] = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "SOLUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];

async function fetch24hrTickers(): Promise<TickerData[]> {
  const symbols = TICKER_SYMBOLS;
  for (const base of REST_ENDPOINTS.map(e => e.replace("/klines", "/ticker/24hr"))) {
    try {
      const url = `${base}?symbols=${JSON.stringify(symbols)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      return data.map((t: any) => ({
        symbol: t.symbol as CryptoSymbol,
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChange),
        changePct24h: parseFloat(t.priceChangePercent),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        volume24h: parseFloat(t.volume),
        quoteVolume24h: parseFloat(t.quoteVolume),
      }));
    } catch {
      continue;
    }
  }
  return [];
}

export interface LiveDataContextType {
  // Primary symbol streaming
    hmmRegime: string,
    microstructure: string;
    liquidityLevels: { price: number; type: string; strength: number }[];
  activeSymbol: CryptoSymbol;
  setActiveSymbol: (s: CryptoSymbol) => void;
  activeInterval: BinanceInterval;
  setActiveInterval: (i: BinanceInterval) => void;
  candles: Candle[];
  signals: Signal[];
  currentPrice: number;
  isConnected: boolean;
  error: string | null;

  // Multi-symbol tickers
  tickers: TickerData[];
  tickersLoading: boolean;

  // Fetch candles for any symbol (one-off)
  fetchSymbolCandles: (symbol: CryptoSymbol, interval: BinanceInterval, limit?: number) => Promise<Candle[]>;

  // Computed analytics from live candles
  volatilityData: { date: string; volatility: number; volume: number }[];
  regimeData: { name: string; value: number; fill: string }[];
  regimePerformance: { regime: string; trades: number; winRate: string; avgReturn: string; sharpe: number }[];
  equityCurve: { date: string; equity: number; benchmark: number }[];
  drawdownData: { date: string; drawdown: number }[];
  tradeList: { id: number; date: string; side: string; entry: number; exit: number; pnl: string; duration: string }[];
}

const LiveDataContext = createContext<LiveDataContextType | null>(null);
export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error("useLiveData must be used within LiveDataProvider");
  return ctx;
}

// Compute realized volatility from candles
function computeVolatility(candles: Candle[], window = 20): { date: string; volatility: number; volume: number }[] {
  const result: { date: string; volatility: number; volume: number }[] = [];
  for (let i = window; i < candles.length; i += Math.max(1, Math.floor(candles.length / 40))) {
    const slice = candles.slice(i - window, i);
    const returns = slice.slice(1).map((c, j) => Math.log(c.close / slice[j].close));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const vol = Math.sqrt(variance) * Math.sqrt(252) * 100; // annualized
    result.push({
      date: candles[i].date,
      volatility: +vol.toFixed(2),
      volume: candles[i].volume,
    });
  }
  return result;
}

function EMA(values: number[], period: number) {
  const k = 2 / (period + 1);
  let ema = values[0];
  const result = [ema];

  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }

  return result;
}

function classifyRegime(candles: Candle[]) {
  if (candles.length < 120) {
    return [
      { name: "Bull Trend", value: 20, fill: "hsl(var(--primary))" },
      { name: "Bear Trend", value: 20, fill: "hsl(var(--destructive))" },
      { name: "Accumulation", value: 20, fill: "hsl(var(--accent))" },
      { name: "Distribution", value: 20, fill: "hsl(var(--muted))" },
      { name: "Volatility Expansion", value: 20, fill: "hsl(var(--warning))" }
    ];
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const ema20 = EMA(closes, 20);
  const ema100 = EMA(closes, 100);

  let bull = 0;
  let bear = 0;
  let accumulation = 0;
  let distribution = 0;
  let volExpansion = 0;

  const window = 20;

  for (let i = window; i < candles.length; i++) {

    const trend = (closes[i] - closes[i - window]) / closes[i - window];

    const range = (candles[i].high - candles[i].low) / candles[i].close;

    const avgVolume =
      volumes.slice(i - window, i).reduce((a, b) => a + b, 0) / window;

    const volumeRatio = volumes[i] / avgVolume;

    const bullishStructure = ema20[i] > ema100[i];
    const bearishStructure = ema20[i] < ema100[i];

    if (range > 0.015) {
      volExpansion++;
    }
    else if (bullishStructure && trend > 0.01) {
      bull++;
    }
    else if (bearishStructure && trend < -0.01) {
      bear++;
    }
    else if (volumeRatio > 1.3 && trend >= -0.005 && trend <= 0.005) {
      accumulation++;
    }
    else {
      distribution++;
    }
  }

  const total = bull + bear + accumulation + distribution + volExpansion || 1;

  return [
    { name: "Bull Trend", value: Math.round((bull / total) * 100), fill: "hsl(var(--primary))" },
    { name: "Bear Trend", value: Math.round((bear / total) * 100), fill: "hsl(var(--destructive))" },
    { name: "Accumulation", value: Math.round((accumulation / total) * 100), fill: "hsl(var(--accent))" },
    { name: "Distribution", value: Math.round((distribution / total) * 100), fill: "hsl(var(--muted))" },
    { name: "Volatility Expansion", value: Math.round((volExpansion / total) * 100), fill: "hsl(var(--warning))" }
  ];
}

// Compute regime-based performance from signals
function computeRegimePerformance(candles: Candle[], signals: Signal[]) {
  const regimes = ["Bull Trend", "Bear Trend", "Mean Reverting", "High Volatility"];
  const window = 20;

  return regimes.map((regime) => {
    // Filter signals by regime at their index
    const regimeSignals = signals.filter((s) => {
      if (s.index < window || s.index >= candles.length) return false;
      const slice = candles.slice(s.index - window, s.index);
      const returns = slice.slice(1).map((c, j) => Math.log(c.close / slice[j].close));
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
      const vol = Math.sqrt(variance);

      if (regime === "High Volatility") return vol > 0.03;
      if (regime === "Bull Trend") return vol <= 0.03 && mean > 0.001;
      if (regime === "Bear Trend") return vol <= 0.03 && mean < -0.001;
      return vol <= 0.03 && mean >= -0.001 && mean <= 0.001;
    });

    // Simulate trades for this regime
    let wins = 0, losses = 0, totalReturn = 0;
    const pnls: number[] = [];
    for (let i = 1; i < regimeSignals.length; i++) {
      const prev = regimeSignals[i - 1];
      const curr = regimeSignals[i];
      if (prev.type === "buy") {
        const pnl = ((curr.price - prev.price) / prev.price) * 100;
        pnls.push(pnl);
        totalReturn += pnl;
        if (pnl > 0) wins++; else losses++;
      } else {
        const pnl = ((prev.price - curr.price) / prev.price) * 100;
        pnls.push(pnl);
        totalReturn += pnl;
        if (pnl > 0) wins++; else losses++;
      }
    }

    const trades = wins + losses;
    const avgReturn = trades > 0 ? totalReturn / trades : 0;
    const mean = avgReturn;
    const stdDev = pnls.length > 1
      ? Math.sqrt(pnls.reduce((sum, p) => sum + (p - mean) ** 2, 0) / (pnls.length - 1))
      : 1;
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

    return {
      regime,
      trades,
      winRate: trades > 0 ? `${((wins / trades) * 100).toFixed(0)}%` : "0%",
      avgReturn: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`,
      sharpe: +sharpe.toFixed(1),
    };
  });
}

// Build equity curve from signals
function buildEquityCurve(candles: Candle[], signals: Signal[]) {
  if (candles.length === 0) return [];

  let equity = 100000;
  let position: "long" | "short" | null = null;
  let entryPrice = 0;
  let signalIdx = 0;

  const step = Math.max(1, Math.floor(candles.length / 60));
  const result: { date: string; equity: number; benchmark: number }[] = [];
  const startPrice = candles[0].close;

  for (let i = 0; i < candles.length; i += step) {
    // Process any signals up to this candle
    while (signalIdx < signals.length && signals[signalIdx].index <= i) {
      const sig = signals[signalIdx];
      if (sig.type === "buy" && position !== "long") {
        if (position === "short") {
          equity += (entryPrice - sig.price) * (100000 / entryPrice);
        }
        position = "long";
        entryPrice = sig.price;
      } else if (sig.type === "sell" && position !== "short") {
        if (position === "long") {
          equity += (sig.price - entryPrice) * (100000 / entryPrice);
        }
        position = "short";
        entryPrice = sig.price;
      }
      signalIdx++;
    }

    // Mark-to-market
    let mtm = equity;
    if (position === "long" && entryPrice > 0) {
      mtm = equity + (candles[i].close - entryPrice) * (100000 / entryPrice);
    } else if (position === "short" && entryPrice > 0) {
      mtm = equity + (entryPrice - candles[i].close) * (100000 / entryPrice);
    }

    const benchmark = 100000 * (candles[i].close / startPrice);
    result.push({
      date: candles[i].date,
      equity: +mtm.toFixed(0),
      benchmark: +benchmark.toFixed(0),
    });
  }

  return result;
}

// Build trade list from signals
function buildTradeList(signals: Signal[]): { id: number; date: string; side: string; entry: number; exit: number; pnl: string; duration: string }[] {
  const trades: any[] = [];
  for (let i = 1; i < signals.length && trades.length < 20; i++) {
    const prev = signals[i - 1];
    const curr = signals[i];
    const pnl = prev.type === "buy"
      ? curr.price - prev.price
      : prev.price - curr.price;
    const pnlDollar = pnl * 10; // 10 units per trade
    const bars = curr.index - prev.index;
    trades.push({
      id: i,
      date: new Date(Date.now() - (signals.length - i) * 3600000).toISOString().split("T")[0],
      side: prev.type === "buy" ? "LONG" : "SHORT",
      entry: prev.price,
      exit: curr.price,
      pnl: `${pnlDollar >= 0 ? "+" : ""}$${pnlDollar.toFixed(0)}`,
      duration: `${Math.floor(bars * 15 / 60)}h ${(bars * 15) % 60}m`,
    });
  }
  return trades.reverse();
}

// Compute drawdown from equity curve
function computeDrawdown(equityCurve: { date: string; equity: number }[]) {
  let peak = 0;
  return equityCurve.map((d) => {
    peak = Math.max(peak, d.equity);
    return { date: d.date, drawdown: peak > 0 ? ((d.equity - peak) / peak) * 100 : 0 };
  });
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [activeSymbol, setActiveSymbol] = useState<CryptoSymbol>("BTCUSDT");
  const [activeInterval, setActiveInterval] = useState<BinanceInterval>("15m");
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [tickersLoading, setTickersLoading] = useState(true);

  // Primary stream
  const { candles, currentPrice, isConnected, error } = useBinanceStream(activeSymbol, activeInterval);

  // Compute signals from live candles
  const signals = useMemo(() => computeSignals(candles), [candles]);

  // Fetch tickers every 10s
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await fetch24hrTickers();
      if (mounted && data.length > 0) {
        setTickers(data);
        setTickersLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  // Computed analytics
  const volatilityData = useMemo(() => computeVolatility(candles), [candles]);
  const regimeData = useMemo(() => classifyRegime(candles), [candles]);
  const marketFeatures = useMemo(() => extractFeatures(candles),[candles]);
const microstructure = useMemo(() => detectMicrostructure(candles),[candles]);
const hmmRegime = useMemo(() => marketFeatures ? classifyHMM(marketFeatures) : "Loading",[marketFeatures]);
  const regimePerformance = useMemo(() => computeRegimePerformance(candles, signals), [candles, signals]);
  const equityCurve = useMemo(() => buildEquityCurve(candles, signals), [candles, signals]);
  const drawdownData = useMemo(() => computeDrawdown(equityCurve), [equityCurve]);
  const tradeList = useMemo(() => buildTradeList(signals), [signals]);
const liquidityLevels = useMemo(
  () => detectLiquidityLevels(candles),
  [candles]
);
  const fetchSymbolCandles = useCallback(
    (symbol: CryptoSymbol, interval: BinanceInterval, limit = 500) =>
      fetchKlines(symbol, interval, limit),
    []
  );

  const value: LiveDataContextType = {
    activeSymbol, setActiveSymbol,
    activeInterval, setActiveInterval,
    candles, signals, currentPrice, isConnected, error,
    tickers, tickersLoading,
    fetchSymbolCandles,
    volatilityData, regimeData, regimePerformance,
    equityCurve, drawdownData, tradeList,
    hmmRegime,
    microstructure,
    liquidityLevels,
  };

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}
