import { useState, useEffect, useMemo } from "react";
import { generateCandles, DEFAULT_CONFIG } from "@/lib/tradingEngine";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useLiveData } from "@/contexts/LiveDataContext";
import { SYMBOL_LABELS, CRYPTO_SYMBOLS, type CryptoSymbol } from "@/hooks/useBinanceStream";
import {
  Plus, FlaskConical, Trash2, Loader2, Play, Save, ChevronDown,
  ChevronRight, X, CheckCircle2, AlertTriangle, TrendingUp, Activity,
  Rocket, BarChart3, GitCompare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ---------- Math model definitions ----------
const MATH_MODELS = [
  {
    id: "ema_crossover",
    name: "EMA Crossover",
    category: "Trend",
    description: "Exponential Moving Average crossover signal",
    params: [
      { key: "fast_period", label: "Fast Period", default: 9, min: 2, max: 200 },
      { key: "slow_period", label: "Slow Period", default: 21, min: 5, max: 500 },
    ],
  },
  {
    id: "rsi_threshold",
    name: "RSI Threshold",
    category: "Momentum",
    description: "Relative Strength Index overbought/oversold",
    params: [
      { key: "period", label: "Period", default: 14, min: 2, max: 100 },
      { key: "oversold", label: "Oversold", default: 30, min: 5, max: 50 },
      { key: "overbought", label: "Overbought", default: 70, min: 50, max: 95 },
    ],
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands",
    category: "Volatility",
    description: "Price touching upper/lower standard deviation bands",
    params: [
      { key: "period", label: "Period", default: 20, min: 5, max: 100 },
      { key: "std_dev", label: "Std Dev", default: 2, min: 1, max: 4 },
    ],
  },
  {
    id: "macd",
    name: "MACD",
    category: "Momentum",
    description: "Moving Average Convergence Divergence crossover",
    params: [
      { key: "fast", label: "Fast", default: 12, min: 2, max: 100 },
      { key: "slow", label: "Slow", default: 26, min: 5, max: 200 },
      { key: "signal", label: "Signal", default: 9, min: 2, max: 50 },
    ],
  },
  {
    id: "macd_divergence",
    name: "MACD Divergence",
    category: "Momentum",
    description: "Detects bullish/bearish divergence between MACD histogram and price",
    params: [
      { key: "fast", label: "Fast", default: 12, min: 2, max: 100 },
      { key: "slow", label: "Slow", default: 26, min: 5, max: 200 },
      { key: "signal", label: "Signal", default: 9, min: 2, max: 50 },
      { key: "lookback", label: "Divergence Lookback", default: 10, min: 3, max: 30 },
    ],
  },
  {
    id: "fibonacci_retracement",
    name: "Fibonacci Retracement",
    category: "Support/Resistance",
    description: "Identifies entries at key Fibonacci levels (23.6%, 38.2%, 50%, 61.8%)",
    params: [
      { key: "swing_lookback", label: "Swing Lookback", default: 30, min: 10, max: 100 },
      { key: "level", label: "Fib Level (%)", default: 61.8, min: 23.6, max: 78.6 },
      { key: "tolerance", label: "Tolerance (%)", default: 0.5, min: 0.1, max: 2.0 },
    ],
  },
  {
    id: "ichimoku_cloud",
    name: "Ichimoku Cloud",
    category: "Trend",
    description: "Ichimoku Kinko Hyo cloud breakout with Tenkan/Kijun cross",
    params: [
      { key: "tenkan", label: "Tenkan Period", default: 9, min: 5, max: 30 },
      { key: "kijun", label: "Kijun Period", default: 26, min: 10, max: 60 },
      { key: "senkou_b", label: "Senkou B Period", default: 52, min: 20, max: 120 },
    ],
  },
  {
    id: "volume_spike",
    name: "Volume Spike",
    category: "Volume",
    description: "Volume exceeding moving average by multiplier",
    params: [
      { key: "period", label: "MA Period", default: 20, min: 5, max: 100 },
      { key: "multiplier", label: "Multiplier", default: 1.5, min: 1.1, max: 5 },
    ],
  },
  {
    id: "atr_filter",
    name: "ATR Filter",
    category: "Volatility",
    description: "Average True Range volatility filter",
    params: [
      { key: "period", label: "Period", default: 14, min: 5, max: 100 },
      { key: "threshold", label: "Threshold", default: 1.5, min: 0.5, max: 5 },
    ],
  },
  {
    id: "stochastic",
    name: "Stochastic Oscillator",
    category: "Momentum",
    description: "Stochastic %K/%D crossover signal",
    params: [
      { key: "k_period", label: "%K Period", default: 14, min: 5, max: 50 },
      { key: "d_period", label: "%D Period", default: 3, min: 2, max: 10 },
      { key: "oversold", label: "Oversold", default: 20, min: 5, max: 40 },
      { key: "overbought", label: "Overbought", default: 80, min: 60, max: 95 },
    ],
  },
  {
    id: "mean_reversion",
    name: "Mean Reversion",
    category: "Statistical",
    description: "Z-score based mean reversion using standard deviation",
    params: [
      { key: "lookback", label: "Lookback", default: 50, min: 10, max: 200 },
      { key: "z_entry", label: "Z Entry", default: 2.0, min: 1.0, max: 4.0 },
      { key: "z_exit", label: "Z Exit", default: 0.5, min: 0, max: 1.5 },
    ],
  },
  {
    id: "williams_r",
    name: "Williams %R",
    category: "Momentum",
    description: "Williams Percent Range oscillator for overbought/oversold",
    params: [
      { key: "period", label: "Period", default: 14, min: 5, max: 50 },
      { key: "oversold", label: "Oversold", default: -80, min: -95, max: -60 },
      { key: "overbought", label: "Overbought", default: -20, min: -40, max: -5 },
    ],
  },
  {
    id: "adx_trend",
    name: "ADX Trend Strength",
    category: "Trend",
    description: "Average Directional Index to filter strong trends",
    params: [
      { key: "period", label: "Period", default: 14, min: 5, max: 50 },
      { key: "threshold", label: "ADX Threshold", default: 25, min: 15, max: 50 },
    ],
  },
  {
    id: "vwap_cross",
    name: "VWAP Cross",
    category: "Volume",
    description: "Volume-Weighted Average Price crossover for intraday bias",
    params: [
      { key: "deviation", label: "Std Dev Bands", default: 1.5, min: 0.5, max: 3.0 },
    ],
  },
  {
    id: "donchian_channel",
    name: "Donchian Channel",
    category: "Trend",
    description: "Breakout above/below highest high or lowest low",
    params: [
      { key: "period", label: "Period", default: 20, min: 5, max: 100 },
    ],
  },
  {
    id: "keltner_channel",
    name: "Keltner Channel",
    category: "Volatility",
    description: "ATR-based channel for volatility breakouts",
    params: [
      { key: "ema_period", label: "EMA Period", default: 20, min: 5, max: 100 },
      { key: "atr_period", label: "ATR Period", default: 10, min: 5, max: 50 },
      { key: "multiplier", label: "ATR Multiplier", default: 1.5, min: 0.5, max: 4 },
    ],
  },
];
const LOGIC_OPERATORS = ["AND", "OR"] as const;

interface ConditionBlock {
  model_id: string;
  params: Record<string, number>;
  direction: "bullish" | "bearish";
  operator?: "AND" | "OR";
}

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  description: string;
  entry_logic: ConditionBlock[];
  exit_logic: ConditionBlock[];
  parameters: Record<string, any>;
  test_results: any;
  status: string;
  created_at: string;
  project_id: string | null;
}

// ---------- Model evaluator ----------
function evaluateModel(
  cond: ConditionBlock,
  candles: { open: number; high: number; low: number; close: number; volume: number }[],
  i: number
): number {
  const c = candles[i];
  const prev = candles[i - 1];
  const bull = cond.direction === "bullish";

  if (cond.model_id === "ema_crossover") {
    const fp = cond.params.fast_period || 9;
    const sp = cond.params.slow_period || 21;
    const fastAvg = candles.slice(i - fp, i).reduce((s, c) => s + c.close, 0) / fp;
    const slowAvg = candles.slice(i - sp, i).reduce((s, c) => s + c.close, 0) / sp;
    return bull ? (fastAvg > slowAvg ? 1 : 0) : (fastAvg < slowAvg ? 1 : 0);
  }

  if (cond.model_id === "rsi_threshold") {
    const p = cond.params.period || 14;
    const gains: number[] = [], losses: number[] = [];
    for (let j = i - p; j < i; j++) {
      const diff = (candles[j + 1]?.close || 0) - (candles[j]?.close || 0);
      if (diff > 0) { gains.push(diff); losses.push(0); }
      else { gains.push(0); losses.push(Math.abs(diff)); }
    }
    const avgGain = gains.reduce((a, b) => a + b, 0) / p;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / p;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return bull ? (rsi < (cond.params.oversold || 30) ? 1 : 0) : (rsi > (cond.params.overbought || 70) ? 1 : 0);
  }

  if (cond.model_id === "bollinger_bands") {
    const p = cond.params.period || 20;
    const std = cond.params.std_dev || 2;
    const slice = candles.slice(i - p, i).map(c => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / p;
    const dev = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / p);
    const upper = mean + std * dev, lower = mean - std * dev;
    return bull ? (c.close <= lower ? 1 : 0) : (c.close >= upper ? 1 : 0);
  }

  if (cond.model_id === "macd" || cond.model_id === "macd_divergence") {
    const fast = cond.params.fast || 12, slow = cond.params.slow || 26, sig = cond.params.signal || 9;
    const emaCalc = (data: number[], p: number) => {
      const k = 2 / (p + 1); let e = data[0];
      return data.map(v => (e = v * k + e * (1 - k)));
    };
    const closes = candles.slice(0, i + 1).map(c => c.close);
    const emaFast = emaCalc(closes, fast);
    const emaSlow = emaCalc(closes, slow);
    const macdLine = emaFast.map((v, j) => v - emaSlow[j]);
    const signalLine = emaCalc(macdLine, sig);
    const histogram = macdLine[i] - signalLine[i];
    const prevHist = macdLine[i - 1] - signalLine[i - 1];
    if (cond.model_id === "macd_divergence") {
      const lb = cond.params.lookback || 10;
      const priceUp = c.close > candles[i - lb]?.close;
      const histDown = histogram < macdLine[i - lb] - signalLine[i - lb];
      return bull ? (!priceUp && !histDown ? 1 : 0) : (priceUp && histDown ? 1 : 0);
    }
    return bull ? (prevHist <= 0 && histogram > 0 ? 1 : 0) : (prevHist >= 0 && histogram < 0 ? 1 : 0);
  }

  if (cond.model_id === "fibonacci_retracement") {
    const lb = cond.params.swing_lookback || 30;
    const slice = candles.slice(Math.max(0, i - lb), i);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const range = high - low;
    const level = (cond.params.level || 61.8) / 100;
    const tol = (cond.params.tolerance || 0.5) / 100;
    const fibPrice = bull ? high - range * level : low + range * level;
    const nearFib = Math.abs(c.close - fibPrice) / fibPrice < tol;
    return nearFib ? 1 : 0;
  }

  if (cond.model_id === "ichimoku_cloud") {
    const tenkanP = cond.params.tenkan || 9, kijunP = cond.params.kijun || 26, senkouBP = cond.params.senkou_b || 52;
    const midpoint = (sl: typeof candles) => (Math.max(...sl.map(c => c.high)) + Math.min(...sl.map(c => c.low))) / 2;
    const tenkan = midpoint(candles.slice(i - tenkanP, i));
    const kijun = midpoint(candles.slice(i - kijunP, i));
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = midpoint(candles.slice(Math.max(0, i - senkouBP), i));
    const aboveCloud = c.close > Math.max(senkouA, senkouB);
    const belowCloud = c.close < Math.min(senkouA, senkouB);
    const tkCross = bull ? tenkan > kijun : tenkan < kijun;
    return bull ? (aboveCloud && tkCross ? 1 : 0) : (belowCloud && tkCross ? 1 : 0);
  }

  if (cond.model_id === "volume_spike") {
    const p = cond.params.period || 20, mult = cond.params.multiplier || 1.5;
    const avgVol = candles.slice(i - p, i).reduce((s, c) => s + c.volume, 0) / p;
    return c.volume > avgVol * mult ? 1 : 0;
  }

  if (cond.model_id === "atr_filter") {
    const p = cond.params.period || 14;
    let atrSum = 0;
    for (let j = i - p; j < i; j++) {
      const tr = Math.max(candles[j].high - candles[j].low, Math.abs(candles[j].high - candles[j - 1]?.close || 0), Math.abs(candles[j].low - candles[j - 1]?.close || 0));
      atrSum += tr;
    }
    const atr = atrSum / p;
    const threshold = (cond.params.threshold || 1.5) * atr;
    return Math.abs(c.close - prev.close) > threshold * 0.5 ? 1 : 0;
  }

  if (cond.model_id === "stochastic") {
    const kp = cond.params.k_period || 14;
    const slice = candles.slice(i - kp, i + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    const k = highest !== lowest ? ((c.close - lowest) / (highest - lowest)) * 100 : 50;
    return bull ? (k < (cond.params.oversold || 20) ? 1 : 0) : (k > (cond.params.overbought || 80) ? 1 : 0);
  }

  if (cond.model_id === "mean_reversion") {
    const lb = cond.params.lookback || 50;
    const slice = candles.slice(i - lb, i).map(c => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / lb;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / lb);
    const z = std > 0 ? (c.close - mean) / std : 0;
    return bull ? (z < -(cond.params.z_entry || 2) ? 1 : 0) : (z > (cond.params.z_entry || 2) ? 1 : 0);
  }

  if (cond.model_id === "williams_r") {
    const p = cond.params.period || 14;
    const slice = candles.slice(i - p, i + 1);
    const hh = Math.max(...slice.map(c => c.high));
    const ll = Math.min(...slice.map(c => c.low));
    const wr = hh !== ll ? ((hh - c.close) / (hh - ll)) * -100 : -50;
    return bull ? (wr < (cond.params.oversold || -80) ? 1 : 0) : (wr > (cond.params.overbought || -20) ? 1 : 0);
  }

  if (cond.model_id === "adx_trend") {
    const p = cond.params.period || 14;
    let dmPlusSum = 0, dmMinusSum = 0, trSum = 0;
    for (let j = i - p; j < i; j++) {
      const high = candles[j].high, low = candles[j].low;
      const prevH = candles[j - 1]?.high || high, prevL = candles[j - 1]?.low || low, prevC = candles[j - 1]?.close || c.close;
      dmPlusSum += Math.max(high - prevH, 0);
      dmMinusSum += Math.max(prevL - low, 0);
      trSum += Math.max(high - low, Math.abs(high - prevC), Math.abs(low - prevC));
    }
    const diPlus = trSum > 0 ? (dmPlusSum / trSum) * 100 : 0;
    const diMinus = trSum > 0 ? (dmMinusSum / trSum) * 100 : 0;
    const dx = (diPlus + diMinus) > 0 ? Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100 : 0;
    const strongTrend = dx > (cond.params.threshold || 25);
    return strongTrend && (bull ? diPlus > diMinus : diMinus > diPlus) ? 1 : 0;
  }

  if (cond.model_id === "vwap_cross") {
    let cumVol = 0, cumTP = 0;
    for (let j = 0; j <= i; j++) {
      const tp = (candles[j].high + candles[j].low + candles[j].close) / 3;
      cumVol += candles[j].volume;
      cumTP += tp * candles[j].volume;
    }
    const vwap = cumVol > 0 ? cumTP / cumVol : c.close;
    return bull ? (c.close > vwap && prev.close <= vwap ? 1 : 0) : (c.close < vwap && prev.close >= vwap ? 1 : 0);
  }

  if (cond.model_id === "donchian_channel") {
    const p = cond.params.period || 20;
    const slice = candles.slice(i - p, i);
    const hh = Math.max(...slice.map(c => c.high));
    const ll = Math.min(...slice.map(c => c.low));
    return bull ? (c.close > hh ? 1 : 0) : (c.close < ll ? 1 : 0);
  }

  if (cond.model_id === "keltner_channel") {
    const ep = cond.params.ema_period || 20, ap = cond.params.atr_period || 10, mult = cond.params.multiplier || 1.5;
    const emaSlice = candles.slice(i - ep, i).map(c => c.close);
    const ema = emaSlice.reduce((a, b) => a + b, 0) / ep;
    let atrSum = 0;
    for (let j = i - ap; j < i; j++) {
      atrSum += Math.max(candles[j].high - candles[j].low, Math.abs(candles[j].high - (candles[j - 1]?.close || candles[j].open)), Math.abs(candles[j].low - (candles[j - 1]?.close || candles[j].open)));
    }
    const atr = atrSum / ap;
    return bull ? (c.close < ema - mult * atr ? 1 : 0) : (c.close > ema + mult * atr ? 1 : 0);
  }

  // Fallback: momentum
  return c.close > prev.close && bull ? 0.5 : c.close < prev.close && !bull ? 0.5 : 0;
}

// ---------- Simple backtest simulator ----------
function simulateStrategy(
  entry: ConditionBlock[],
  exit: ConditionBlock[],
  candles: { open: number; high: number; low: number; close: number; volume: number }[]
) {
  if (candles.length < 60) return null;
  // Simplified simulation based on model parameters
  const trades: { entry: number; exit: number; pnl: number }[] = [];
  let inPosition = false;
  let entryPrice = 0;

  for (let i = 50; i < candles.length; i++) {
    if (!inPosition) {
      // Simple entry signal based on model count & randomness seeded by data
      const entryScore = entry.reduce((acc, cond) => {
        const m = MATH_MODELS.find(m => m.id === cond.model_id);
        if (!m) return acc;
        const c = candles[i];
        const prev = candles[i - 1];
        return acc + evaluateModel(cond, candles, i);
      }, 0);

      const useAnd = entry.every(e => !e.operator || e.operator === "AND");
      const threshold = useAnd ? entry.length * 0.7 : 0.7;
      if (entryScore >= threshold) {
        inPosition = true;
        entryPrice = candles[i].close;
      }
    } else {
      // Exit logic
      const bars = i - candles.findIndex(c => c.close === entryPrice);
      const pnlPct = ((candles[i].close - entryPrice) / entryPrice) * 100;
      
      let exitSignal = bars > 20 || Math.abs(pnlPct) > 3;
      if (exit.length > 0) {
        const exitScore = exit.reduce((acc, cond) => {
          if (cond.model_id === "rsi_threshold") {
            return acc + (pnlPct > 1 ? 1 : 0);
          }
          return acc + (Math.abs(pnlPct) > 2 ? 0.5 : 0);
        }, 0);
        exitSignal = exitSignal || exitScore >= exit.length * 0.5;
      }

      if (exitSignal) {
        trades.push({ entry: entryPrice, exit: candles[i].close, pnl: pnlPct });
        inPosition = false;
      }
    }
  }

  if (trades.length === 0) return null;

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const maxDrawdown = Math.abs(Math.min(...trades.map(t => t.pnl), 0));
  const sharpe = trades.length > 1 ? (totalPnl / trades.length) / (Math.sqrt(trades.reduce((a, t) => a + Math.pow(t.pnl - totalPnl / trades.length, 2), 0) / trades.length) || 1) : 0;

  return {
    totalTrades: trades.length,
    winRate,
    totalPnl,
    profitFactor,
    maxDrawdown,
    sharpe,
    avgWin,
    avgLoss,
    wins: wins.length,
    losses: losses.length,
  };
}

// ---------- Component ----------
const ResearchProjects = () => {
  const { tickers, candles } = useLiveData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  // Builder state
  const [stratName, setStratName] = useState("");
  const [stratSymbol, setStratSymbol] = useState<CryptoSymbol>("BTCUSDT");
  const [stratDesc, setStratDesc] = useState("");
  const [entryConditions, setEntryConditions] = useState<ConditionBlock[]>([]);
  const [exitConditions, setExitConditions] = useState<ConditionBlock[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState<"entry" | "exit" | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Error loading strategies", description: error.message, variant: "destructive" });
      } else {
        setStrategies((data ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          symbol: d.symbol,
          description: d.description || "",
          entry_logic: d.entry_logic || [],
          exit_logic: d.exit_logic || [],
          parameters: d.parameters || {},
          test_results: d.test_results,
          status: d.status,
          created_at: d.created_at,
          project_id: d.project_id,
        })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const addCondition = (target: "entry" | "exit", modelId: string) => {
    const model = MATH_MODELS.find(m => m.id === modelId);
    if (!model) return;
    const params: Record<string, number> = {};
    model.params.forEach(p => { params[p.key] = p.default; });
    const block: ConditionBlock = {
      model_id: modelId,
      params,
      direction: target === "entry" ? "bullish" : "bearish",
      operator: "AND",
    };
    if (target === "entry") setEntryConditions(prev => [...prev, block]);
    else setExitConditions(prev => [...prev, block]);
    setShowModelPicker(null);
  };

  const removeCondition = (target: "entry" | "exit", index: number) => {
    if (target === "entry") setEntryConditions(prev => prev.filter((_, i) => i !== index));
    else setExitConditions(prev => prev.filter((_, i) => i !== index));
  };

  const updateConditionParam = (target: "entry" | "exit", index: number, key: string, value: number) => {
    const setter = target === "entry" ? setEntryConditions : setExitConditions;
    setter(prev => prev.map((c, i) => i === index ? { ...c, params: { ...c.params, [key]: value } } : c));
  };

  const updateConditionField = (target: "entry" | "exit", index: number, field: string, value: any) => {
    const setter = target === "entry" ? setEntryConditions : setExitConditions;
    setter(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const runTest = () => {
    if (entryConditions.length === 0) {
      toast({ title: "Add at least one entry condition", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTimeout(() => {
      // Use live candles if available, otherwise generate synthetic data
      let sourceCandles = candles;
      if (sourceCandles.length < 60) {
        const ticker = tickers.find(t => t.symbol === stratSymbol);
        const basePrice = ticker?.price || 50000;
        sourceCandles = generateCandles({ ...DEFAULT_CONFIG, initialPrice: basePrice, candles: 300 });
      }
      const mapped = sourceCandles.map((c: any) => ({ open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
      const results = simulateStrategy(entryConditions, exitConditions, mapped);
      setTestResults(results);
      setTesting(false);
      if (!results) {
        toast({ title: "Backtest failed", description: "Could not generate results", variant: "destructive" });
      } else {
        toast({ title: "Backtest complete", description: `${results.totalTrades} trades simulated` });
      }
    }, 800);
  };

  const saveStrategy = async () => {
    if (!user || !stratName.trim()) {
      toast({ title: "Enter a strategy name", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: stratName.trim(),
      symbol: stratSymbol,
      description: stratDesc,
      entry_logic: entryConditions as any,
      exit_logic: exitConditions as any,
      parameters: {} as any,
      test_results: testResults as any,
      status: testResults ? "tested" : "draft",
    };

    const { data, error } = await supabase.from("strategies").insert(payload).select().single();
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else if (data) {
      setStrategies(prev => [{
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        description: data.description || "",
        entry_logic: data.entry_logic as any || [],
        exit_logic: data.exit_logic as any || [],
        parameters: data.parameters as any || {},
        test_results: data.test_results,
        status: data.status,
        created_at: data.created_at,
        project_id: data.project_id,
      }, ...prev]);
      toast({ title: "Strategy saved!" });
      resetBuilder();
    }
    setSaving(false);
  };

  const deleteStrategy = async (id: string) => {
    const { error } = await supabase.from("strategies").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      setStrategies(prev => prev.filter(s => s.id !== id));
      if (selectedStrategy?.id === id) setSelectedStrategy(null);
    }
  };

  const resetBuilder = () => {
    setShowBuilder(false);
    setStratName("");
    setStratDesc("");
    setStratSymbol("BTCUSDT");
    setEntryConditions([]);
    setExitConditions([]);
    setTestResults(null);
  };

  const deployToTerminal = (s: Strategy) => {
    navigate(`/strategy?deploy=${s.id}`);
    toast({ title: `Deploying "${s.name}" to live signals` });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const comparedStrategies = strategies.filter(s => compareIds.has(s.id) && s.test_results);

  const COMPARE_METRICS = [
    { key: "totalTrades", label: "Trades", format: (v: number) => `${v}` },
    { key: "winRate", label: "Win Rate", format: (v: number) => `${v?.toFixed(1)}%`, best: "max" },
    { key: "totalPnl", label: "Total P&L", format: (v: number) => `${v >= 0 ? "+" : ""}${v?.toFixed(2)}%`, best: "max" },
    { key: "profitFactor", label: "Profit Factor", format: (v: number) => v === Infinity ? "∞" : `${v?.toFixed(2)}`, best: "max" },
    { key: "sharpe", label: "Sharpe", format: (v: number) => `${v?.toFixed(2)}`, best: "max" },
    { key: "maxDrawdown", label: "Max DD", format: (v: number) => `-${v?.toFixed(2)}%`, best: "min" },
    { key: "avgWin", label: "Avg Win", format: (v: number) => `+${v?.toFixed(2)}%`, best: "max" },
    { key: "avgLoss", label: "Avg Loss", format: (v: number) => `-${v?.toFixed(2)}%`, best: "min" },
  ];

  const openStrategy = (s: Strategy) => {
    setSelectedStrategy(s);
    setShowBuilder(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Trend": return "bg-primary/10 text-primary";
      case "Momentum": return "bg-chart-2/10 text-chart-2";
      case "Volatility": return "bg-destructive/10 text-destructive";
      case "Volume": return "bg-chart-4/10 text-chart-4";
      case "Statistical": return "bg-chart-5/10 text-chart-5";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // ---------- Condition block renderer ----------
  const renderConditionBlock = (cond: ConditionBlock, index: number, target: "entry" | "exit") => {
    const model = MATH_MODELS.find(m => m.id === cond.model_id);
    if (!model) return null;
    return (
      <div key={index} className="border border-border rounded-sm p-3 bg-background animate-in fade-in slide-in-from-bottom-1 duration-200">
        {index > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <select
              value={cond.operator || "AND"}
              onChange={(e) => updateConditionField(target, index, "operator", e.target.value)}
              className="bg-secondary border-none rounded-sm px-2 py-0.5 text-xs font-mono text-primary focus:outline-none"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${getCategoryColor(model.category)}`}>
              {model.category}
            </span>
            <span className="text-sm font-medium text-foreground">{model.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={cond.direction}
              onChange={(e) => updateConditionField(target, index, "direction", e.target.value)}
              className="bg-secondary border-none rounded-sm px-2 py-0.5 text-xs font-mono focus:outline-none"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
            <button onClick={() => removeCondition(target, index)} className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{model.description}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {model.params.map(p => (
            <div key={p.key}>
              <label className="text-[10px] text-muted-foreground block mb-0.5">{p.label}</label>
              <input
                type="number"
                value={cond.params[p.key] ?? p.default}
                min={p.min}
                max={p.max}
                step={p.default % 1 !== 0 ? 0.1 : 1}
                onChange={(e) => updateConditionParam(target, index, p.key, parseFloat(e.target.value) || p.default)}
                className="w-full bg-secondary border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---------- Model picker ----------
  const renderModelPicker = (target: "entry" | "exit") => {
    const categories = [...new Set(MATH_MODELS.map(m => m.category))];
    return (
      <div className="border border-primary/30 rounded-sm p-3 bg-card animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-foreground">Select Mathematical Model</h4>
          <button onClick={() => setShowModelPicker(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {categories.map(cat => (
          <div key={cat} className="mb-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium inline-block mb-1 ${getCategoryColor(cat)}`}>{cat}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MATH_MODELS.filter(m => m.category === cat).map(m => (
                <button
                  key={m.id}
                  onClick={() => addCondition(target, m.id)}
                  className="text-left p-2 rounded-sm border border-border hover:border-primary/50 hover:bg-secondary transition-colors"
                >
                  <span className="text-xs font-medium text-foreground block">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">{m.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <PageHeader title="Research Lab" description="Create strategies with mathematical models — test & save" />
        <div className="flex items-center gap-2 shrink-0">
          {strategies.filter(s => s.test_results).length >= 2 && (
            <Button size="sm" variant={showComparison ? "default" : "outline"} className="gap-1.5" onClick={() => { setShowComparison(!showComparison); setShowBuilder(false); setSelectedStrategy(null); }}>
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => { setShowBuilder(!showBuilder); setSelectedStrategy(null); setShowComparison(false); }}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Strategy</span>
          </Button>
        </div>
      </div>

      {/* ===== Strategy Builder ===== */}
      {showBuilder && (
        <div className="card-sharp rounded-sm p-4 sm:p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Strategy Builder</h2>
            <button onClick={resetBuilder} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          {/* Name / Symbol */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Strategy Name</label>
              <input value={stratName} onChange={e => setStratName(e.target.value)} placeholder="e.g. Mean Reversion Alpha"
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
              <select value={stratSymbol} onChange={e => setStratSymbol(e.target.value as CryptoSymbol)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {CRYPTO_SYMBOLS.map(s => <option key={s} value={s}>{SYMBOL_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <textarea value={stratDesc} onChange={e => setStratDesc(e.target.value)} placeholder="Describe your strategy hypothesis..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {/* Entry Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-success uppercase tracking-wider">Entry Conditions</h3>
              <span className="text-[10px] text-muted-foreground font-mono">{entryConditions.length} model(s)</span>
            </div>
            <div className="space-y-2 mb-2">
              {entryConditions.map((c, i) => renderConditionBlock(c, i, "entry"))}
            </div>
            {showModelPicker === "entry" ? renderModelPicker("entry") : (
              <button onClick={() => setShowModelPicker("entry")}
                className="w-full border border-dashed border-border rounded-sm py-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3" /> Add Entry Model
              </button>
            )}
          </div>

          {/* Exit Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-destructive uppercase tracking-wider">Exit Conditions</h3>
              <span className="text-[10px] text-muted-foreground font-mono">{exitConditions.length} model(s)</span>
            </div>
            <div className="space-y-2 mb-2">
              {exitConditions.map((c, i) => renderConditionBlock(c, i, "exit"))}
            </div>
            {showModelPicker === "exit" ? renderModelPicker("exit") : (
              <button onClick={() => setShowModelPicker("exit")}
                className="w-full border border-dashed border-border rounded-sm py-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3" /> Add Exit Model
              </button>
            )}
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="border border-primary/20 rounded-sm p-3 bg-primary/5 animate-in fade-in duration-200">
              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Backtest Results
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Trades", value: testResults.totalTrades },
                  { label: "Win Rate", value: `${testResults.winRate.toFixed(1)}%`, color: testResults.winRate >= 50 ? "text-success" : "text-destructive" },
                  { label: "Total P&L", value: `${testResults.totalPnl >= 0 ? "+" : ""}${testResults.totalPnl.toFixed(2)}%`, color: testResults.totalPnl >= 0 ? "text-success" : "text-destructive" },
                  { label: "Profit Factor", value: testResults.profitFactor === Infinity ? "∞" : testResults.profitFactor.toFixed(2) },
                  { label: "Sharpe", value: testResults.sharpe.toFixed(2) },
                  { label: "Max DD", value: `-${testResults.maxDrawdown.toFixed(2)}%`, color: "text-destructive" },
                  { label: "Avg Win", value: `+${testResults.avgWin.toFixed(2)}%`, color: "text-success" },
                  { label: "Avg Loss", value: `-${testResults.avgLoss.toFixed(2)}%`, color: "text-destructive" },
                ].map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    <p className={`text-sm font-mono font-semibold ${(r as any).color || "text-foreground"}`}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={runTest} disabled={testing || entryConditions.length === 0}>
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {testing ? "Testing..." : "Run Backtest"}
            </Button>
            <Button size="sm" className="gap-1.5 flex-1" onClick={saveStrategy} disabled={saving || !stratName.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Strategy"}
            </Button>
          </div>
        </div>
      )}

      {/* ===== Strategy Detail View ===== */}
      {selectedStrategy && (
        <div className="card-sharp rounded-sm p-4 sm:p-5 mb-4 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{selectedStrategy.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">{SYMBOL_LABELS[selectedStrategy.symbol as CryptoSymbol] || selectedStrategy.symbol}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => deployToTerminal(selectedStrategy)}>
                <Rocket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deploy Live</span>
              </Button>
              <button onClick={() => setSelectedStrategy(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </div>
          {selectedStrategy.description && <p className="text-xs text-muted-foreground">{selectedStrategy.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-success uppercase tracking-wider mb-2">Entry Logic ({selectedStrategy.entry_logic.length})</h4>
              {(selectedStrategy.entry_logic as ConditionBlock[]).map((c, i) => {
                const m = MATH_MODELS.find(m => m.id === c.model_id);
                return (
                  <div key={i} className="text-xs font-mono text-foreground bg-background border border-border rounded-sm p-2 mb-1">
                    {i > 0 && <span className="text-primary mr-1">{c.operator}</span>}
                    {m?.name || c.model_id} ({c.direction}) — {Object.entries(c.params).map(([k, v]) => `${k}:${v}`).join(", ")}
                  </div>
                );
              })}
            </div>
            <div>
              <h4 className="text-xs font-medium text-destructive uppercase tracking-wider mb-2">Exit Logic ({selectedStrategy.exit_logic.length})</h4>
              {(selectedStrategy.exit_logic as ConditionBlock[]).length === 0 ? (
                <p className="text-xs text-muted-foreground">No exit conditions</p>
              ) : (selectedStrategy.exit_logic as ConditionBlock[]).map((c, i) => {
                const m = MATH_MODELS.find(m => m.id === c.model_id);
                return (
                  <div key={i} className="text-xs font-mono text-foreground bg-background border border-border rounded-sm p-2 mb-1">
                    {i > 0 && <span className="text-primary mr-1">{c.operator}</span>}
                    {m?.name || c.model_id} ({c.direction}) — {Object.entries(c.params).map(([k, v]) => `${k}:${v}`).join(", ")}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedStrategy.test_results && (
            <div className="border border-primary/20 rounded-sm p-3 bg-primary/5">
              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Saved Test Results</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div><p className="text-[10px] text-muted-foreground">Trades</p><p className="text-sm font-mono font-semibold">{selectedStrategy.test_results.totalTrades}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Win Rate</p><p className={`text-sm font-mono font-semibold ${selectedStrategy.test_results.winRate >= 50 ? "text-success" : "text-destructive"}`}>{selectedStrategy.test_results.winRate?.toFixed(1)}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">P&L</p><p className={`text-sm font-mono font-semibold ${selectedStrategy.test_results.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>{selectedStrategy.test_results.totalPnl >= 0 ? "+" : ""}{selectedStrategy.test_results.totalPnl?.toFixed(2)}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">Sharpe</p><p className="text-sm font-mono font-semibold">{selectedStrategy.test_results.sharpe?.toFixed(2)}</p></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Comparison View ===== */}
      {showComparison && (
        <div className="card-sharp rounded-sm p-4 sm:p-5 mb-4 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-primary" /> Strategy Comparison
            </h2>
            <button onClick={() => setShowComparison(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          {comparedStrategies.length < 2 ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground mb-2">Select at least 2 tested strategies to compare.</p>
              <p className="text-xs text-muted-foreground">Click the checkbox on strategy cards below.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Metric</th>
                    {comparedStrategies.map(s => (
                      <th key={s.id} className="text-center py-2 px-2 text-foreground font-medium min-w-[100px]">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_METRICS.map(metric => {
                    const values = comparedStrategies.map(s => s.test_results?.[metric.key] ?? 0);
                    const bestIdx = metric.best === "max"
                      ? values.indexOf(Math.max(...values))
                      : values.indexOf(Math.min(...values));
                    return (
                      <tr key={metric.key} className="border-b border-border/30">
                        <td className="py-2 px-2 text-muted-foreground">{metric.label}</td>
                        {comparedStrategies.map((s, i) => {
                          const val = s.test_results?.[metric.key] ?? 0;
                          const isBest = i === bestIdx;
                          return (
                            <td key={s.id} className={`text-center py-2 px-2 ${isBest ? "text-primary font-semibold" : "text-foreground"}`}>
                              {metric.format(val)}
                              {isBest && " ★"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-2 px-2 text-muted-foreground">Models</td>
                    {comparedStrategies.map(s => (
                      <td key={s.id} className="text-center py-2 px-2 text-muted-foreground">
                        {(s.entry_logic as ConditionBlock[]).map(c => {
                          const m = MATH_MODELS.find(m => m.id === c.model_id);
                          return m?.name || c.model_id;
                        }).join(", ")}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== Strategy List ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : strategies.length === 0 && !showBuilder ? (
        <div className="card-sharp rounded-sm p-8 text-center">
          <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No strategies yet.</p>
          <p className="text-xs text-muted-foreground">Create your first strategy using mathematical models above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {strategies.map(s => {
            const isSelected = selectedStrategy?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => openStrategy(s)}
                className={`card-sharp rounded-sm p-3 sm:p-4 hover:border-primary/30 transition-colors cursor-pointer group relative ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  {showComparison && s.test_results && (
                    <button onClick={(e) => { e.stopPropagation(); toggleCompare(s.id); }}
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${compareIds.has(s.id) ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {compareIds.has(s.id) && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); deployToTerminal(s); }}
                    className="text-muted-foreground hover:text-primary transition-colors" title="Deploy to live signals">
                    <Rocket className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteStrategy(s.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-secondary rounded-sm flex items-center justify-center shrink-0">
                    <FlaskConical className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{s.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{SYMBOL_LABELS[s.symbol as CryptoSymbol] || s.symbol}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {(s.entry_logic as ConditionBlock[]).slice(0, 3).map((c, i) => {
                    const m = MATH_MODELS.find(m => m.id === c.model_id);
                    return (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground font-mono">
                        {m?.name || c.model_id}
                      </span>
                    );
                  })}
                  {(s.entry_logic as ConditionBlock[]).length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{(s.entry_logic as ConditionBlock[]).length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${
                    s.status === "tested" ? "bg-success/10 text-success" :
                    s.status === "draft" ? "bg-muted text-muted-foreground" :
                    "bg-primary/10 text-primary"
                  }`}>{s.status}</span>
                </div>

                {s.test_results && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-[10px] font-mono">
                    <span className={s.test_results.winRate >= 50 ? "text-success" : "text-destructive"}>
                      WR {s.test_results.winRate?.toFixed(0)}%
                    </span>
                    <span className={s.test_results.totalPnl >= 0 ? "text-success" : "text-destructive"}>
                      P&L {s.test_results.totalPnl >= 0 ? "+" : ""}{s.test_results.totalPnl?.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">{s.test_results.totalTrades} trades</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResearchProjects;
