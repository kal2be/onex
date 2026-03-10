import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { Candle, Signal } from "@/lib/tradingEngine";
import { ChevronDown, X, Settings2 } from "lucide-react";
import { useLiveData } from "@/contexts/LiveDataContext";

interface TradingViewChartProps {
  candles: Candle[];
  signals: Signal[];
  height?: number;
}

interface ViewState {
  startIndex: number;
  visibleCount: number;
}

type DrawingTool = "none" | "hline" | "vline" | "trendline" | "triangle" | "rectangle" | "fibonacci";

interface Drawing {
  id: string;
  tool: DrawingTool;
  points: { x: number; y: number; candleIdx?: number; price?: number }[];
  color: string;
}

// ---- Indicator definitions ----
type IndicatorId = "ema9" | "ema21" | "sma50" | "sma200" | "bollinger" | "vwap" | "macd" | "rsi" | "stochastic" | "atr";

interface IndicatorParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

interface IndicatorDef {
  id: IndicatorId;
  name: string;
  category: "Overlay" | "Oscillator";
  description: string;
  color: string;
  defaultEnabled: boolean;
  params: IndicatorParam[];
}

const INDICATORS: IndicatorDef[] = [
  { id: "ema9", name: "EMA 9", category: "Overlay", description: "Exponential Moving Average", color: "rgba(59, 130, 246, 0.7)", defaultEnabled: true, params: [{ key: "period", label: "Period", min: 2, max: 200, step: 1, defaultValue: 9 }] },
  { id: "ema21", name: "EMA 21", category: "Overlay", description: "Exponential Moving Average", color: "rgba(168, 85, 247, 0.7)", defaultEnabled: true, params: [{ key: "period", label: "Period", min: 2, max: 200, step: 1, defaultValue: 21 }] },
  { id: "sma50", name: "SMA 50", category: "Overlay", description: "Simple Moving Average", color: "rgba(234, 179, 8, 0.5)", defaultEnabled: true, params: [{ key: "period", label: "Period", min: 2, max: 500, step: 1, defaultValue: 50 }] },
  { id: "sma200", name: "SMA 200", category: "Overlay", description: "Simple Moving Average", color: "rgba(236, 72, 153, 0.5)", defaultEnabled: false, params: [{ key: "period", label: "Period", min: 2, max: 500, step: 1, defaultValue: 200 }] },
  { id: "bollinger", name: "Bollinger Bands", category: "Overlay", description: "Bands with std deviations", color: "rgba(34, 197, 94, 0.4)", defaultEnabled: false, params: [{ key: "period", label: "Period", min: 5, max: 100, step: 1, defaultValue: 20 }, { key: "mult", label: "Std Dev", min: 0.5, max: 5, step: 0.5, defaultValue: 2 }] },
  { id: "vwap", name: "VWAP", category: "Overlay", description: "Volume-Weighted Average Price", color: "rgba(251, 146, 60, 0.7)", defaultEnabled: false, params: [] },
  { id: "macd", name: "MACD", category: "Oscillator", description: "Moving Average Convergence Divergence", color: "rgba(59, 130, 246, 0.8)", defaultEnabled: false, params: [{ key: "fast", label: "Fast", min: 2, max: 50, step: 1, defaultValue: 12 }, { key: "slow", label: "Slow", min: 2, max: 100, step: 1, defaultValue: 26 }, { key: "signal", label: "Signal", min: 2, max: 50, step: 1, defaultValue: 9 }] },
  { id: "rsi", name: "RSI", category: "Oscillator", description: "Relative Strength Index", color: "rgba(168, 85, 247, 0.8)", defaultEnabled: false, params: [{ key: "period", label: "Period", min: 2, max: 100, step: 1, defaultValue: 14 }, { key: "overbought", label: "Overbought", min: 50, max: 95, step: 5, defaultValue: 70 }, { key: "oversold", label: "Oversold", min: 5, max: 50, step: 5, defaultValue: 30 }] },
  { id: "stochastic", name: "Stochastic", category: "Oscillator", description: "Stochastic Oscillator", color: "rgba(34, 197, 94, 0.8)", defaultEnabled: false, params: [{ key: "kPeriod", label: "K Period", min: 2, max: 100, step: 1, defaultValue: 14 }, { key: "dPeriod", label: "D Period", min: 2, max: 50, step: 1, defaultValue: 3 }] },
  { id: "atr", name: "ATR", category: "Oscillator", description: "Average True Range", color: "rgba(234, 179, 8, 0.8)", defaultEnabled: false, params: [{ key: "period", label: "Period", min: 2, max: 100, step: 1, defaultValue: 14 }] },
];

type IndicatorParams = Record<IndicatorId, Record<string, number>>;

const INDICATOR_STORAGE_KEY = "falconx_indicators";
const INDICATOR_PARAMS_KEY = "falconx_indicator_params";

function getDefaultParams(): IndicatorParams {
  const p = {} as IndicatorParams;
  INDICATORS.forEach(ind => {
    p[ind.id] = {};
    ind.params.forEach(param => { p[ind.id][param.key] = param.defaultValue; });
  });
  return p;
}

function loadEnabledIndicators(): Set<IndicatorId> {
  try {
    const stored = localStorage.getItem(INDICATOR_STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set(INDICATORS.filter(i => i.defaultEnabled).map(i => i.id));
}

function loadIndicatorParams(): IndicatorParams {
  try {
    const stored = localStorage.getItem(INDICATOR_PARAMS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultParams();
      // Merge with defaults to handle new params
      for (const id of Object.keys(defaults) as IndicatorId[]) {
        parsed[id] = { ...defaults[id], ...(parsed[id] || {}) };
      }
      return parsed;
    }
  } catch {}
  return getDefaultParams();
}

const COLORS = {
  bg: "#0F172A",
  gridLine: "rgba(148, 163, 184, 0.06)",
  gridText: "rgba(148, 163, 184, 0.5)",
  bullBody: "#22C55E",
  bullWick: "#22C55E",
  bearBody: "#EF4444",
  bearWick: "#EF4444",
  volumeBull: "rgba(34, 197, 94, 0.18)",
  volumeBear: "rgba(239, 68, 68, 0.18)",
  crosshair: "rgba(148, 163, 184, 0.3)",
  crosshairLabel: "#1E293B",
  crosshairText: "#E2E8F0",
  buySignal: "#22C55E",
  sellSignal: "#EF4444",
  drawing: "#3B82F6",
  fibLevels: ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6"],
  bbFill: "rgba(34, 197, 94, 0.06)",
  bbLine: "rgba(34, 197, 94, 0.35)",
  vwap: "rgba(251, 146, 60, 0.7)",
  macdLine: "rgba(59, 130, 246, 0.8)",
  macdSignal: "rgba(239, 68, 68, 0.7)",
  macdHistUp: "rgba(34, 197, 94, 0.5)",
  macdHistDown: "rgba(239, 68, 68, 0.5)",
  rsiLine: "rgba(168, 85, 247, 0.8)",
  rsiOverbought: "rgba(239, 68, 68, 0.2)",
  rsiOversold: "rgba(34, 197, 94, 0.2)",
  stochK: "rgba(59, 130, 246, 0.8)",
  stochD: "rgba(239, 68, 68, 0.7)",
  atrLine: "rgba(234, 179, 8, 0.8)",
  subPanelBg: "rgba(15, 23, 42, 0.95)",
  subPanelBorder: "rgba(148, 163, 184, 0.1)",
};

const DRAWING_TOOLS: { id: DrawingTool; label: string; icon: string }[] = [
  { id: "none", label: "Cursor", icon: "↖" },
  { id: "hline", label: "H-Line", icon: "─" },
  { id: "vline", label: "V-Line", icon: "│" },
  { id: "trendline", label: "Trend", icon: "╱" },
  { id: "triangle", label: "Triangle", icon: "△" },
  { id: "rectangle", label: "Rect", icon: "▭" },
  { id: "fibonacci", label: "Fib", icon: "⊟" },
];

// ---- Calculation helpers ----
function emaCalc(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) result.push(data[0]);
    else result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function smaCalc(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function bollingerCalc(closes: number[], period = 20, mult = 2) {
  const mid = smaCalc(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }
  return { upper, mid, lower };
}

function vwapCalc(candles: Candle[]): number[] {
  let cumVol = 0, cumTP = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumVol += c.volume; cumTP += tp * c.volume;
    return cumVol > 0 ? cumTP / cumVol : tp;
  });
}

function macdCalc(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = emaCalc(closes, fast);
  const emaSlow = emaCalc(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = emaCalc(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

function rsiCalc(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  const gains: number[] = [], losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    if (i < period) { result.push(null); continue; }
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function stochasticCalc(candles: Candle[], kPeriod = 14, dPeriod = 3) {
  const k: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...slice.map(c => c.high));
    const ll = Math.min(...slice.map(c => c.low));
    k.push(hh !== ll ? ((candles[i].close - ll) / (hh - ll)) * 100 : 50);
  }
  const d = smaCalc(k.map(v => v ?? 0), dPeriod);
  return { k, d };
}

function atrCalc(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { result.push(null); continue; }
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (i < period) { result.push(null); continue; }
    const slice = [];
    for (let j = i - period + 1; j <= i; j++) {
      const t = Math.max(
        candles[j].high - candles[j].low,
        Math.abs(candles[j].high - (candles[j - 1]?.close || candles[j].open)),
        Math.abs(candles[j].low - (candles[j - 1]?.close || candles[j].open))
      );
      slice.push(t);
    }
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function TradingViewChart({ candles, signals, height = 500 }: TradingViewChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [view, setView] = useState<ViewState>({
    startIndex: Math.max(0, candles.length - 80),
    visibleCount: 80,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<DrawingTool>("none");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [enabledIndicators, setEnabledIndicators] = useState<Set<IndicatorId>>(loadEnabledIndicators);
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParams>(loadIndicatorParams);
  const [showIndicatorPicker, setShowIndicatorPicker] = useState(true);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorId | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Persist indicator selection & params
  useEffect(() => {
    localStorage.setItem(INDICATOR_STORAGE_KEY, JSON.stringify([...enabledIndicators]));
  }, [enabledIndicators]);
  useEffect(() => {
    localStorage.setItem(INDICATOR_PARAMS_KEY, JSON.stringify(indicatorParams));
  }, [indicatorParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowIndicatorPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleIndicator = (id: IndicatorId) => {
    setEnabledIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const has = (id: IndicatorId) => enabledIndicators.has(id);
  const p = indicatorParams;

  const updateParam = (id: IndicatorId, key: string, value: number) => {
    setIndicatorParams(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  // Computed indicator data (using custom params)
  const closes = useMemo(() => candles.map(c => c.close), [candles]);
  const ema9Data = useMemo(() => has("ema9") ? emaCalc(closes, p.ema9.period) : [], [closes, enabledIndicators, p.ema9]);
  const ema21Data = useMemo(() => has("ema21") ? emaCalc(closes, p.ema21.period) : [], [closes, enabledIndicators, p.ema21]);
  const sma50Data = useMemo(() => has("sma50") ? smaCalc(closes, p.sma50.period) : [], [closes, enabledIndicators, p.sma50]);
  const sma200Data = useMemo(() => has("sma200") ? smaCalc(closes, p.sma200.period) : [], [closes, enabledIndicators, p.sma200]);
  const bbData = useMemo(() => has("bollinger") ? bollingerCalc(closes, p.bollinger.period, p.bollinger.mult) : null, [closes, enabledIndicators, p.bollinger]);
  const vwapData = useMemo(() => has("vwap") ? vwapCalc(candles) : [], [candles, enabledIndicators]);
  const macdData = useMemo(() => has("macd") ? macdCalc(closes, p.macd.fast, p.macd.slow, p.macd.signal) : null, [closes, enabledIndicators, p.macd]);
  const rsiData = useMemo(() => has("rsi") ? rsiCalc(closes, p.rsi.period) : [], [closes, enabledIndicators, p.rsi]);
  const stochData = useMemo(() => has("stochastic") ? stochasticCalc(candles, p.stochastic.kPeriod, p.stochastic.dPeriod) : null, [candles, enabledIndicators, p.stochastic]);
  const atrData = useMemo(() => has("atr") ? atrCalc(candles, p.atr.period) : [], [candles, enabledIndicators, p.atr]);

  const signalMap = useMemo(() => {
    const map = new Map<number, Signal>();
    signals.forEach(s => map.set(s.index, s));
    return map;
  }, [signals]);

  // Count active oscillator sub-panels
  const activeOscillators = useMemo(() => {
    const ids: IndicatorId[] = ["macd", "rsi", "stochastic", "atr"];
    return ids.filter(id => enabledIndicators.has(id));
  }, [enabledIndicators]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height: h } = entries[0].contentRect;
      setDimensions({ width, height: h || height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    if (activeTool !== "none") return;
    const rightPadding = Math.max(5, Math.floor(view.visibleCount * 0.1));
    const targetStart = Math.max(0, candles.length - view.visibleCount + rightPadding);
    setView(prev => ({ ...prev, startIndex: targetStart }));
  }, [candles.length]);

  const clampView = useCallback((start: number, count: number) => {
    const minCount = 20;
    const maxCount = Math.min(candles.length + 20, 1500);
    const c = Math.max(minCount, Math.min(maxCount, count));
    const s = Math.max(0, Math.min(candles.length - c + 20, start));
    return { startIndex: s, visibleCount: c };
  }, [candles.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    setView(prev => {
      const newCount = Math.round(prev.visibleCount * zoomFactor);
      const mouseRatio = (e.nativeEvent.offsetX - 60) / (dimensions.width - 120);
      const candleAtMouse = prev.startIndex + prev.visibleCount * mouseRatio;
      const newStart = Math.round(candleAtMouse - newCount * mouseRatio);
      return clampView(newStart, newCount);
    });
  }, [dimensions.width, clampView]);

  const getLayout = useCallback(() => {
    const w = dimensions.width;
    const h = dimensions.height;
    const marginLeft = 60;
    const marginRight = 60;
    const marginTop = 10;
    const subPanelHeight = activeOscillators.length > 0 ? Math.min(80, (h * 0.35) / activeOscillators.length) : 0;
    const totalSubHeight = subPanelHeight * activeOscillators.length;
    const volumeHeight = h * 0.12;
    const priceBottom = h - volumeHeight - totalSubHeight - 30;
    const priceHeight = priceBottom - marginTop;
    const chartWidth = w - marginLeft - marginRight;
    return { w, h, marginLeft, marginRight, marginTop, volumeHeight, priceBottom, priceHeight, chartWidth, subPanelHeight, totalSubHeight };
  }, [dimensions, activeOscillators.length]);

  const getVisibleRange = useCallback(() => {
    const { startIndex, visibleCount } = view;
    const visible = candles.slice(startIndex, startIndex + visibleCount);
    if (visible.length === 0) return null;
    let pMin = Infinity, pMax = -Infinity, vMax = 0;
    visible.forEach(c => {
      pMin = Math.min(pMin, c.low);
      pMax = Math.max(pMax, c.high);
      vMax = Math.max(vMax, c.volume);
    });
    const pPad = (pMax - pMin) * 0.08;
    pMin -= pPad; pMax += pPad;
    return { visible, pMin, pMax, vMax };
  }, [candles, view]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const layout = getLayout();
    const range = getVisibleRange();
    if (!range) return;
    if (activeTool !== "none") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const candleW = layout.chartWidth / view.visibleCount;
      const candleIdx = Math.floor((mx - layout.marginLeft) / candleW);
      const price = range.pMin + (1 - (my - layout.marginTop) / layout.priceHeight) * (range.pMax - range.pMin);
      const pointsNeeded = activeTool === "triangle" ? 3 : activeTool === "hline" || activeTool === "vline" ? 1 : 2;
      const point = { x: mx, y: my, candleIdx: view.startIndex + candleIdx, price };
      if (!currentDrawing) {
        const newDrawing: Drawing = { id: Math.random().toString(36).slice(2, 8), tool: activeTool, points: [point], color: COLORS.drawing };
        if (pointsNeeded === 1) { setDrawings(prev => [...prev, newDrawing]); setActiveTool("none"); }
        else setCurrentDrawing(newDrawing);
      } else {
        const updated = { ...currentDrawing, points: [...currentDrawing.points, point] };
        if (updated.points.length >= pointsNeeded) { setDrawings(prev => [...prev, updated]); setCurrentDrawing(null); setActiveTool("none"); }
        else setCurrentDrawing(updated);
      }
      return;
    }
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragStartIndex(view.startIndex);
  }, [view.startIndex, activeTool, currentDrawing, getLayout, getVisibleRange, view.visibleCount]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (isDragging && activeTool === "none") {
      const dx = e.clientX - dragStart;
      const candleWidth = (dimensions.width - 120) / view.visibleCount;
      const shift = Math.round(-dx / candleWidth);
      setView(prev => clampView(dragStartIndex + shift, prev.visibleCount));
    }
  }, [isDragging, dragStart, dragStartIndex, dimensions.width, view.visibleCount, clampView, activeTool]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => { setMouse(null); setIsDragging(false); }, []);
  const clearDrawings = () => { setDrawings([]); setCurrentDrawing(null); };

  // ---- Touch gestures for mobile (pinch-to-zoom + drag scroll) ----
  const touchRef = useRef<{ startTouches: { clientX: number; clientY: number }[]; startView: ViewState } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 1) {
      const touches = Array.from(e.touches).map(t => ({ clientX: t.clientX, clientY: t.clientY }));
      touchRef.current = {
        startTouches: touches,
        startView: { ...view },
      };
    }
  }, [view]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchRef.current) return;
    const { startTouches, startView } = touchRef.current;

    if (e.touches.length === 2 && startTouches.length === 2) {
      // Pinch zoom
      const startDist = Math.hypot(
        startTouches[0].clientX - startTouches[1].clientX,
        startTouches[0].clientY - startTouches[1].clientY
      );
      const curDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = startDist / curDist; // zoom out when pinching in
      const newCount = Math.round(startView.visibleCount * scale);
      const midTouch = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const rect = canvasRef.current?.getBoundingClientRect();
      const mouseRatio = rect ? (midTouch - rect.left - 60) / (rect.width - 120) : 0.5;
      const candleAtMid = startView.startIndex + startView.visibleCount * mouseRatio;
      const newStart = Math.round(candleAtMid - newCount * mouseRatio);
      setView(clampView(newStart, newCount));
    } else if (e.touches.length === 1 && startTouches.length === 1) {
      // Single finger drag to scroll
      const dx = e.touches[0].clientX - startTouches[0].clientX;
      const candleWidth = (dimensions.width - 120) / startView.visibleCount;
      const shift = Math.round(-dx / candleWidth);
      setView(clampView(startView.startIndex + shift, startView.visibleCount));
    }
  }, [clampView, dimensions.width]);

  const handleTouchEnd = useCallback(() => {
    touchRef.current = null;
  }, []);

  // ---- Main render ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const layout = getLayout();
    const { w, h, marginLeft, marginRight, marginTop, priceBottom, priceHeight, chartWidth, subPanelHeight, totalSubHeight } = layout;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const range = getVisibleRange();
    if (!range) return;
    const { visible, pMin, pMax, vMax } = range;
    const { startIndex, visibleCount } = view;

    const priceToY = (p: number) => marginTop + (1 - (p - pMin) / (pMax - pMin)) * priceHeight;
    const volToY = (v: number) => priceBottom + 5 + (1 - v / vMax) * (h * 0.12 - 5);
    const candleW = chartWidth / visibleCount;
    const bodyW = Math.max(1, candleW * 0.7);
    const idxToX = (idx: number) => marginLeft + (idx - startIndex) * candleW + candleW / 2;

    // Clear
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = COLORS.gridLine; ctx.lineWidth = 1;
    const priceStep = niceStep(pMin, pMax, 6);
    for (let p = Math.ceil(pMin / priceStep) * priceStep; p <= pMax; p += priceStep) {
      const y = priceToY(p);
      ctx.beginPath(); ctx.moveTo(marginLeft, y); ctx.lineTo(w - marginRight, y); ctx.stroke();
      ctx.fillStyle = COLORS.gridText; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText(p.toFixed(2), w - marginRight + 55, y + 3);
    }

    // Volume
    visible.forEach((c, i) => {
      const x = marginLeft + i * candleW + candleW / 2;
      ctx.fillStyle = c.close >= c.open ? COLORS.volumeBull : COLORS.volumeBear;
      const vY = volToY(c.volume);
      ctx.fillRect(x - bodyW / 2, vY, bodyW, priceBottom + h * 0.12 - 25 - vY);
    });

    // ---- Overlay indicators ----
    const drawOverlayLine = (data: (number | null)[], color: string, lineWidth = 1.2) => {
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCount; i++) {
        const idx = startIndex + i;
        const val = data[idx];
        if (val === null || val === undefined || idx >= candles.length) continue;
        if (val < pMin || val > pMax) { started = false; continue; }
        const x = marginLeft + i * candleW + candleW / 2;
        const y = priceToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (has("ema9")) drawOverlayLine(ema9Data, "rgba(59, 130, 246, 0.7)");
    if (has("ema21")) drawOverlayLine(ema21Data, "rgba(168, 85, 247, 0.7)");
    if (has("sma50")) drawOverlayLine(sma50Data as number[], "rgba(234, 179, 8, 0.5)");
    if (has("sma200")) drawOverlayLine(sma200Data as number[], "rgba(236, 72, 153, 0.5)");

    // Bollinger Bands
    if (has("bollinger") && bbData) {
      drawOverlayLine(bbData.upper as number[], COLORS.bbLine);
      drawOverlayLine(bbData.mid as number[], COLORS.bbLine);
      drawOverlayLine(bbData.lower as number[], COLORS.bbLine);
      // Fill between
      ctx.fillStyle = COLORS.bbFill; ctx.beginPath();
      let started = false;
      const upperPts: { x: number; y: number }[] = [];
      for (let i = 0; i < visibleCount; i++) {
        const idx = startIndex + i;
        const u = bbData.upper[idx]; const l = bbData.lower[idx];
        if (u == null || l == null) continue;
        const x = marginLeft + i * candleW + candleW / 2;
        if (!started) { ctx.moveTo(x, priceToY(u)); started = true; } else ctx.lineTo(x, priceToY(u));
        upperPts.push({ x, y: priceToY(l) });
      }
      for (let i = upperPts.length - 1; i >= 0; i--) ctx.lineTo(upperPts[i].x, upperPts[i].y);
      ctx.closePath(); ctx.fill();
    }

    // VWAP
    if (has("vwap")) drawOverlayLine(vwapData, COLORS.vwap, 1.5);

    // Candlesticks
    visible.forEach((c, i) => {
      const x = marginLeft + i * candleW + candleW / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? COLORS.bullBody : COLORS.bearBody;
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, priceToY(c.high)); ctx.lineTo(x, priceToY(c.low)); ctx.stroke();
      const oY = priceToY(c.open); const cY = priceToY(c.close);
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, Math.min(oY, cY), bodyW, Math.max(1, Math.abs(oY - cY)));
    });

    // Signals
    visible.forEach((_, i) => {
      const idx = startIndex + i;
      const sig = signalMap.get(idx);
      if (!sig) return;
      const x = marginLeft + i * candleW + candleW / 2;
      const c = candles[idx];
      if (sig.type === "buy") drawTriangleMark(ctx, x, priceToY(c.low) + 12, 7, "up", COLORS.buySignal);
      else drawTriangleMark(ctx, x, priceToY(c.high) - 12, 7, "down", COLORS.sellSignal);
    });

    // ---- Sub-panels (oscillators) ----
    const subPanelTop = h - totalSubHeight - 20;
    activeOscillators.forEach((oscId, panelIdx) => {
      const panelY = subPanelTop + panelIdx * subPanelHeight;
      const panelH = subPanelHeight - 2;

      // Panel background & border
      ctx.fillStyle = COLORS.subPanelBg;
      ctx.fillRect(marginLeft, panelY, chartWidth, panelH);
      ctx.strokeStyle = COLORS.subPanelBorder; ctx.lineWidth = 1;
      ctx.strokeRect(marginLeft, panelY, chartWidth, panelH);

      // Label
      ctx.fillStyle = COLORS.gridText; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText(oscId.toUpperCase(), marginLeft + 4, panelY + 10);

      const drawSubLine = (data: (number | null)[], color: string, min: number, max: number) => {
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
        let started = false;
        for (let i = 0; i < visibleCount; i++) {
          const idx = startIndex + i;
          const val = data[idx];
          if (val == null || idx >= data.length) continue;
          const x = marginLeft + i * candleW + candleW / 2;
          const y = panelY + panelH - ((val - min) / (max - min)) * (panelH - 4) - 2;
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      if (oscId === "rsi" && rsiData.length > 0) {
        // Overbought/oversold zones using custom thresholds
        const ob = p.rsi.overbought || 70;
        const os = p.rsi.oversold || 30;
        const yOb = panelY + panelH - ((ob) / 100) * (panelH - 4) - 2;
        const yOs = panelY + panelH - ((os) / 100) * (panelH - 4) - 2;
        ctx.fillStyle = COLORS.rsiOverbought;
        ctx.fillRect(marginLeft, panelY + 2, chartWidth, yOb - panelY - 2);
        ctx.fillStyle = COLORS.rsiOversold;
        ctx.fillRect(marginLeft, yOs, chartWidth, panelY + panelH - yOs - 2);
        ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(148, 163, 184, 0.15)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(marginLeft, yOb); ctx.lineTo(marginLeft + chartWidth, yOb); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(marginLeft, yOs); ctx.lineTo(marginLeft + chartWidth, yOs); ctx.stroke();
        ctx.setLineDash([]);
        drawSubLine(rsiData, COLORS.rsiLine, 0, 100);
      }

      if (oscId === "macd" && macdData) {
        const allVals = macdData.macdLine.slice(startIndex, startIndex + visibleCount)
          .concat(macdData.signalLine.slice(startIndex, startIndex + visibleCount))
          .concat(macdData.histogram.slice(startIndex, startIndex + visibleCount));
        const min = Math.min(...allVals.filter(v => isFinite(v)));
        const max = Math.max(...allVals.filter(v => isFinite(v)));
        // Histogram bars
        for (let i = 0; i < visibleCount; i++) {
          const idx = startIndex + i;
          if (idx >= macdData.histogram.length) continue;
          const val = macdData.histogram[idx];
          const x = marginLeft + i * candleW + candleW / 2;
          const zeroY = panelY + panelH - ((0 - min) / (max - min)) * (panelH - 4) - 2;
          const barY = panelY + panelH - ((val - min) / (max - min)) * (panelH - 4) - 2;
          ctx.fillStyle = val >= 0 ? COLORS.macdHistUp : COLORS.macdHistDown;
          ctx.fillRect(x - bodyW / 2, Math.min(zeroY, barY), bodyW, Math.abs(barY - zeroY));
        }
        drawSubLine(macdData.macdLine, COLORS.macdLine, min, max);
        drawSubLine(macdData.signalLine, COLORS.macdSignal, min, max);
      }

      if (oscId === "stochastic" && stochData) {
        const y80 = panelY + panelH - ((80) / 100) * (panelH - 4) - 2;
        const y20 = panelY + panelH - ((20) / 100) * (panelH - 4) - 2;
        ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(148, 163, 184, 0.15)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(marginLeft, y80); ctx.lineTo(marginLeft + chartWidth, y80); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(marginLeft, y20); ctx.lineTo(marginLeft + chartWidth, y20); ctx.stroke();
        ctx.setLineDash([]);
        drawSubLine(stochData.k, COLORS.stochK, 0, 100);
        drawSubLine(stochData.d as (number | null)[], COLORS.stochD, 0, 100);
      }

      if (oscId === "atr" && atrData.length > 0) {
        const vals = atrData.slice(startIndex, startIndex + visibleCount).filter(v => v != null) as number[];
        if (vals.length > 0) {
          const min = Math.min(...vals) * 0.9;
          const max = Math.max(...vals) * 1.1;
          drawSubLine(atrData, COLORS.atrLine, min, max);
        }
      }
    });

    // Drawings
    const renderDrawing = (d: Drawing) => {
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      if (d.tool === "hline" && d.points[0]?.price != null) {
        const y = priceToY(d.points[0].price);
        ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(marginLeft, y); ctx.lineTo(w - marginRight, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = d.color; ctx.font = "10px monospace"; ctx.textAlign = "left";
        ctx.fillText(d.points[0].price.toFixed(2), marginLeft + 4, y - 4);
      } else if (d.tool === "vline" && d.points[0]?.candleIdx != null) {
        const x = idxToX(d.points[0].candleIdx);
        ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(x, marginTop); ctx.lineTo(x, h - 20); ctx.stroke(); ctx.setLineDash([]);
      } else if (d.tool === "trendline" && d.points.length >= 2) {
        const p1 = d.points[0], p2 = d.points[1];
        if (p1.candleIdx != null && p2.candleIdx != null && p1.price != null && p2.price != null) {
          ctx.beginPath(); ctx.moveTo(idxToX(p1.candleIdx), priceToY(p1.price)); ctx.lineTo(idxToX(p2.candleIdx), priceToY(p2.price)); ctx.stroke();
        }
      } else if (d.tool === "rectangle" && d.points.length >= 2) {
        const p1 = d.points[0], p2 = d.points[1];
        if (p1.candleIdx != null && p2.candleIdx != null && p1.price != null && p2.price != null) {
          const x1 = idxToX(p1.candleIdx), y1 = priceToY(p1.price), x2 = idxToX(p2.candleIdx), y2 = priceToY(p2.price);
          ctx.fillStyle = d.color + "15"; ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        }
      } else if (d.tool === "triangle" && d.points.length >= 3) {
        const pts = d.points.map(p => ({ x: p.candleIdx != null ? idxToX(p.candleIdx) : p.x, y: p.price != null ? priceToY(p.price) : p.y }));
        ctx.fillStyle = d.color + "15"; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (d.tool === "fibonacci" && d.points.length >= 2) {
        const p1 = d.points[0], p2 = d.points[1];
        if (p1.price != null && p2.price != null) {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 1];
          const diff = p2.price - p1.price;
          levels.forEach((lvl, i) => {
            const price = p1.price! + diff * lvl; const y = priceToY(price);
            ctx.strokeStyle = COLORS.fibLevels[i % COLORS.fibLevels.length]; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(marginLeft, y); ctx.lineTo(w - marginRight, y); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = ctx.strokeStyle; ctx.font = "10px monospace"; ctx.textAlign = "left";
            ctx.fillText(`${(lvl * 100).toFixed(1)}% — ${price.toFixed(2)}`, marginLeft + 4, y - 4);
          });
        }
      }
    };
    drawings.forEach(renderDrawing);
    if (currentDrawing && mouse) {
      const candleIdx = Math.floor((mouse.x - layout.marginLeft) / candleW) + startIndex;
      const price = pMin + (1 - (mouse.y - layout.marginTop) / layout.priceHeight) * (pMax - pMin);
      renderDrawing({ ...currentDrawing, points: [...currentDrawing.points, { x: mouse.x, y: mouse.y, candleIdx, price }] });
    }

    // Crosshair
    if (mouse && activeTool === "none" && mouse.x > marginLeft && mouse.x < w - marginRight && mouse.y > marginTop && mouse.y < h - 20) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = COLORS.crosshair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(marginLeft, mouse.y); ctx.lineTo(w - marginRight, mouse.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mouse.x, marginTop); ctx.lineTo(mouse.x, h - 20); ctx.stroke();
      ctx.setLineDash([]);
      if (mouse.y <= priceBottom) {
        const price = pMin + (1 - (mouse.y - marginTop) / priceHeight) * (pMax - pMin);
        ctx.fillStyle = COLORS.crosshairLabel; ctx.fillRect(w - marginRight, mouse.y - 10, 60, 20);
        ctx.fillStyle = COLORS.crosshairText; ctx.font = "10px monospace"; ctx.textAlign = "left";
        ctx.fillText(price.toFixed(2), w - marginRight + 4, mouse.y + 4);
      }
      const ci = Math.floor((mouse.x - marginLeft) / candleW);
      if (ci >= 0 && ci < visible.length) {
        const label = visible[ci].date;
        ctx.fillStyle = COLORS.crosshairLabel;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillRect(mouse.x - tw / 2, h - 20, tw, 18);
        ctx.fillStyle = COLORS.crosshairText; ctx.textAlign = "center";
        ctx.fillText(label, mouse.x, h - 7);
      }
    }

    // Time axis
    ctx.fillStyle = COLORS.gridText; ctx.font = "9px monospace"; ctx.textAlign = "center";
    const labelInterval = Math.max(1, Math.floor(visibleCount / 8));
    for (let i = 0; i < visibleCount; i += labelInterval) {
      if (i >= visible.length) break;
      const x = marginLeft + i * candleW + candleW / 2;
      ctx.fillText(visible[i]?.date ?? "", x, h - 5);
    }

    // MA legend (only enabled overlays)
    ctx.font = "10px monospace";
    const legends: { label: string; color: string }[] = [];
    if (has("ema9")) legends.push({ label: "EMA 9", color: "rgba(59, 130, 246, 0.7)" });
    if (has("ema21")) legends.push({ label: "EMA 21", color: "rgba(168, 85, 247, 0.7)" });
    if (has("sma50")) legends.push({ label: "SMA 50", color: "rgba(234, 179, 8, 0.5)" });
    if (has("sma200")) legends.push({ label: "SMA 200", color: "rgba(236, 72, 153, 0.5)" });
    if (has("bollinger")) legends.push({ label: "BB", color: COLORS.bbLine });
    if (has("vwap")) legends.push({ label: "VWAP", color: COLORS.vwap });
    let lx = marginLeft + 8;
    legends.forEach(({ label, color }) => {
      ctx.fillStyle = color; ctx.fillRect(lx, marginTop + 4, 12, 2);
      ctx.fillStyle = COLORS.gridText; ctx.textAlign = "left";
      ctx.fillText(label, lx + 16, marginTop + 8);
      lx += ctx.measureText(label).width + 28;
    });
  }, [candles, signals, dimensions, view, mouse, ema9Data, ema21Data, sma50Data, sma200Data, bbData, vwapData, macdData, rsiData, stochData, atrData, signalMap, drawings, currentDrawing, getLayout, getVisibleRange, enabledIndicators, activeOscillators]);

  const activeCount = enabledIndicators.size;

  return (
    <div className="w-full relative select-none flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-1 py-1 bg-secondary/50 rounded-sm mb-1 overflow-x-auto scrollbar-none">
        {DRAWING_TOOLS.map((tool) => (
          <button key={tool.id}
            onClick={() => { setActiveTool(tool.id); setCurrentDrawing(null); }}
            className={`px-2 py-1 text-xs font-mono rounded-sm transition-colors whitespace-nowrap ${activeTool === tool.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title={tool.label}>
            <span className="mr-1">{tool.icon}</span>
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-1" />

        {/* Indicator picker */}
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowIndicatorPicker(!showIndicatorPicker)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm transition-colors ${showIndicatorPicker ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            📊 <span className="hidden sm:inline">Indicators</span>
            {activeCount > 0 && (
              <span className="bg-primary/20 text-primary text-[9px] px-1 rounded-sm font-bold">{activeCount}</span>
            )}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {showIndicatorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-sm shadow-xl z-50 w-[320px] py-1 max-h-[450px] overflow-y-auto scrollbar-thin">
              {["Overlay", "Oscillator"].map(cat => (
                <div key={cat}>
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card/95 backdrop-blur-sm">
                    {cat}s
                  </div>
                  {INDICATORS.filter(ind => ind.category === cat).map(ind => {
                    const enabled = enabledIndicators.has(ind.id);
                    const isEditing = editingIndicator === ind.id;
                    const paramLabel = ind.params.length > 0
                      ? `(${ind.params.map(pm => p[ind.id][pm.key]).join(", ")})`
                      : "";
                    return (
                      <div key={ind.id}>
                        <div className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors ${enabled ? "bg-primary/5" : ""}`}>
                          <button
                            onClick={() => toggleIndicator(ind.id)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            <div className="w-3 h-3 rounded-sm border border-border flex items-center justify-center"
                              style={{ backgroundColor: enabled ? ind.color : "transparent" }}>
                              {enabled && <span className="text-[8px] text-white font-bold">✓</span>}
                            </div>
                            <div>
                              <div className={`font-mono text-[11px] ${enabled ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {ind.name} <span className="text-muted-foreground font-normal">{paramLabel}</span>
                              </div>
                              <div className="text-[9px] text-muted-foreground">{ind.description}</div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5">
                            {ind.params.length > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingIndicator(isEditing ? null : ind.id); }}
                                className={`p-0.5 rounded-sm transition-colors ${isEditing ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                <Settings2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                          </div>
                        </div>
                        {isEditing && ind.params.length > 0 && (
                          <div className="px-4 py-2 bg-secondary/50 border-t border-border/50 space-y-2">
                            {ind.params.map(param => (
                              <div key={param.key} className="flex items-center justify-between gap-2">
                                <label className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{param.label}</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min={param.min}
                                    max={param.max}
                                    step={param.step}
                                    value={p[ind.id][param.key]}
                                    onChange={(e) => updateParam(ind.id, param.key, Number(e.target.value))}
                                    className="w-20 h-1 accent-primary cursor-pointer"
                                  />
                                  <input
                                    type="number"
                                    min={param.min}
                                    max={param.max}
                                    step={param.step}
                                    value={p[ind.id][param.key]}
                                    onChange={(e) => updateParam(ind.id, param.key, Number(e.target.value))}
                                    className="w-14 bg-background border border-border rounded-sm px-1.5 py-0.5 text-[10px] font-mono text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const defaults = getDefaultParams();
                                setIndicatorParams(prev => ({ ...prev, [ind.id]: defaults[ind.id] }));
                              }}
                              className="text-[9px] text-muted-foreground hover:text-foreground font-mono"
                            >
                              Reset defaults
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active indicator chips */}
        <div className="hidden sm:flex items-center gap-1 ml-1">
          {[...enabledIndicators].slice(0, 4).map(id => {
            const ind = INDICATORS.find(i => i.id === id);
            if (!ind) return null;
            return (
              <span key={id} className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono bg-secondary rounded-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                {ind.name}{ind.params.length > 0 ? ` (${ind.params.map(pm => p[ind.id][pm.key]).join(",")})` : ""}
                <button onClick={() => toggleIndicator(id)} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          {enabledIndicators.size > 4 && (
            <span className="text-[9px] text-muted-foreground font-mono">+{enabledIndicators.size - 4}</span>
          )}
        </div>

        {drawings.length > 0 && (
          <button onClick={clearDrawings} className="px-2 py-1 text-xs font-mono text-destructive hover:bg-destructive/10 rounded-sm transition-colors ml-auto">
            Clear All
          </button>
        )}
      </div>

      <div ref={containerRef} className="w-full flex-1" style={{ height }}>
        <canvas ref={canvasRef}
          className="w-full h-full rounded-sm cursor-crosshair touch-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    </div>
  );
}

function niceStep(min: number, max: number, targetTicks: number): number {
  const range = max - min;
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / mag;
  let step: number;
  if (normalized <= 1.5) step = 1;
  else if (normalized <= 3) step = 2;
  else if (normalized <= 7) step = 5;
  else step = 10;
  return step * mag;
}

function drawTriangleMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: "up" | "down", color: string) {
  ctx.fillStyle = color; ctx.beginPath();
  if (dir === "up") { ctx.moveTo(x, y - size); ctx.lineTo(x - size * 0.7, y + size * 0.5); ctx.lineTo(x + size * 0.7, y + size * 0.5); }
  else { ctx.moveTo(x, y + size); ctx.lineTo(x - size * 0.7, y - size * 0.5); ctx.lineTo(x + size * 0.7, y - size * 0.5); }
  ctx.closePath(); ctx.fill();
}
