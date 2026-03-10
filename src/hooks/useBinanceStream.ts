import { useState, useEffect, useRef, useCallback } from "react";
import type { Candle } from "@/lib/tradingEngine";

export type CryptoSymbol = 
  | "BTCUSDT" | "ETHUSDT" | "XRPUSDT" | "SOLUSDT" | "BNBUSDT" | "DOGEUSDT" | "ADAUSDT" | "AVAXUSDT"
  | "DOTUSDT" | "MATICUSDT" | "LINKUSDT" | "UNIUSDT" | "ATOMUSDT" | "LTCUSDT" | "ETCUSDT" | "FILUSDT"
  | "AAVEUSDT" | "NEARUSDT" | "APTUSDT" | "ARBUSDT" | "OPUSDT" | "SHIBUSDT" | "TRXUSDT" | "XLMUSDT"
  | "ALGOUSDT" | "VETUSDT" | "ICPUSDT" | "HBARUSDT" | "FTMUSDT" | "SANDUSDT" | "MANAUSDT" | "GALAUSDT"
  | "AXSUSDT" | "THETAUSDT" | "EGLDUSDT" | "FLOWUSDT" | "CHZUSDT" | "APEUSDT" | "LDOUSDT" | "CRVUSDT"
  | "MKRUSDT" | "SNXUSDT" | "COMPUSDT" | "INJUSDT" | "SUIUSDT" | "SEIUSDT" | "TIAUSDT" | "JUPUSDT"
  | "WIFUSDT" | "PEPEUSDT" | "FETUSDT" | "RENDERUSDT" | "STXUSDT" | "IMXUSDT" | "RUNEUSDT" | "ENAUSDT";

export type BinanceInterval = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1d";

export const SYMBOL_LABELS: Record<CryptoSymbol, string> = {
  BTCUSDT: "BTC/USDT", ETHUSDT: "ETH/USDT", XRPUSDT: "XRP/USDT", SOLUSDT: "SOL/USDT",
  BNBUSDT: "BNB/USDT", DOGEUSDT: "DOGE/USDT", ADAUSDT: "ADA/USDT", AVAXUSDT: "AVAX/USDT",
  DOTUSDT: "DOT/USDT", MATICUSDT: "MATIC/USDT", LINKUSDT: "LINK/USDT", UNIUSDT: "UNI/USDT",
  ATOMUSDT: "ATOM/USDT", LTCUSDT: "LTC/USDT", ETCUSDT: "ETC/USDT", FILUSDT: "FIL/USDT",
  AAVEUSDT: "AAVE/USDT", NEARUSDT: "NEAR/USDT", APTUSDT: "APT/USDT", ARBUSDT: "ARB/USDT",
  OPUSDT: "OP/USDT", SHIBUSDT: "SHIB/USDT", TRXUSDT: "TRX/USDT", XLMUSDT: "XLM/USDT",
  ALGOUSDT: "ALGO/USDT", VETUSDT: "VET/USDT", ICPUSDT: "ICP/USDT", HBARUSDT: "HBAR/USDT",
  FTMUSDT: "FTM/USDT", SANDUSDT: "SAND/USDT", MANAUSDT: "MANA/USDT", GALAUSDT: "GALA/USDT",
  AXSUSDT: "AXS/USDT", THETAUSDT: "THETA/USDT", EGLDUSDT: "EGLD/USDT", FLOWUSDT: "FLOW/USDT",
  CHZUSDT: "CHZ/USDT", APEUSDT: "APE/USDT", LDOUSDT: "LDO/USDT", CRVUSDT: "CRV/USDT",
  MKRUSDT: "MKR/USDT", SNXUSDT: "SNX/USDT", COMPUSDT: "COMP/USDT", INJUSDT: "INJ/USDT",
  SUIUSDT: "SUI/USDT", SEIUSDT: "SEI/USDT", TIAUSDT: "TIA/USDT", JUPUSDT: "JUP/USDT",
  WIFUSDT: "WIF/USDT", PEPEUSDT: "PEPE/USDT", FETUSDT: "FET/USDT", RENDERUSDT: "RENDER/USDT",
  STXUSDT: "STX/USDT", IMXUSDT: "IMX/USDT", RUNEUSDT: "RUNE/USDT", ENAUSDT: "ENA/USDT",
};

export const CRYPTO_SYMBOLS: CryptoSymbol[] = Object.keys(SYMBOL_LABELS) as CryptoSymbol[];
export const INTERVALS: BinanceInterval[] = ["1m", "3m", "5m", "15m", "1h", "4h", "1d"];

// Multiple WebSocket endpoints for fallback
const WS_ENDPOINTS = [
  "wss://stream.binance.com:443/ws",
  "wss://stream.binance.com:9443/ws",
  "wss://data-stream.binance.vision/ws",
];

// Multiple REST endpoints for fallback
const REST_ENDPOINTS = [
  "https://api.binance.com/api/v3/klines",
  "https://data-api.binance.vision/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
  "https://api2.binance.com/api/v3/klines",
  "https://api3.binance.com/api/v3/klines",
  "https://api4.binance.com/api/v3/klines",
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function useBinanceStream(symbol: CryptoSymbol, interval: BinanceInterval) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const wsEndpointIdx = useRef(0);
  const mountedRef = useRef(true);

  // Fetch historical klines via REST with fallback
  const fetchHistory = useCallback(async () => {
    for (const base of REST_ENDPOINTS) {
      try {
        const url = `${base}?symbol=${symbol}&interval=${interval}&limit=1500`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) continue;
        const data = await res.json();
        const hist: Candle[] = data.map((k: any[]) => ({
          time: k[0],
          date: formatDate(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        if (mountedRef.current) {
          setCandles(hist);
          if (hist.length > 0) setCurrentPrice(hist[hist.length - 1].close);
          setError(null);
        }
        return; // success
      } catch {
        continue; // try next endpoint
      }
    }
    if (mountedRef.current) {
      setError("Could not load history from any Binance endpoint. Check network/ad-blocker.");
    }
  }, [symbol, interval]);

  // WebSocket streaming with fallback endpoints
  useEffect(() => {
    mountedRef.current = true;
    fetchHistory();

    const connect = () => {
      if (!mountedRef.current) return;

      const endpoint = WS_ENDPOINTS[wsEndpointIdx.current % WS_ENDPOINTS.length];
      const stream = `${symbol.toLowerCase()}@kline_${interval}`;
      const wsUrl = `${endpoint}/${stream}`;

      console.log(`[Binance WS] Connecting to ${endpoint}...`);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (mountedRef.current) {
            setIsConnected(true);
            setError(null);
            console.log(`[Binance WS] Connected via ${endpoint}`);
          }
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.e !== "kline") return;
            const k = msg.k;
            const candle: Candle = {
              time: k.t,
              date: formatDate(k.t),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
            };
            if (!mountedRef.current) return;
            setCurrentPrice(candle.close);

            setCandles((prev) => {
              if (prev.length === 0) return [candle];
              const last = prev[prev.length - 1];
              if (last.time === candle.time) {
                return [...prev.slice(0, -1), candle];
              } else if (candle.time > last.time) {
                return [...prev.slice(-1499), candle];
              }
              return prev;
            });
          } catch {}
        };

        ws.onerror = () => {
          console.warn(`[Binance WS] Error on ${endpoint}`);
        };

        ws.onclose = (ev) => {
          if (!mountedRef.current) return;
          setIsConnected(false);

          // Try next endpoint on failure
          if (ev.code !== 1000) {
            wsEndpointIdx.current++;
            console.log(`[Binance WS] Switching to next endpoint (attempt ${wsEndpointIdx.current})`);
          }

          // Reconnect with backoff
          const delay = Math.min(3000 * (1 + (wsEndpointIdx.current % WS_ENDPOINTS.length)), 10000);
          reconnectTimer.current = window.setTimeout(connect, delay);
        };
      } catch {
        if (mountedRef.current) {
          setError("WebSocket not available");
          reconnectTimer.current = window.setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [symbol, interval, fetchHistory]);

  return { candles, currentPrice, isConnected, error };
}
