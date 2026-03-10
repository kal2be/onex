import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Cell,
} from "recharts";

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  signal?: "buy" | "sell" | null;
}

interface CandlestickChartProps {
  data: OHLCData[];
  height?: number;
}

// Custom candlestick shape
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)";
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);

  // Scale calculations
  const chartTop = y;
  const chartBottom = y + Math.abs(height);
  const dataRange = high - low || 1;

  const scaleY = (val: number) => {
    // height is negative for upward bars
    const absHeight = Math.abs(height);
    const baseY = height < 0 ? y : y;
    return baseY + ((high - val) / dataRange) * absHeight;
  };

  const wickX = x + width / 2;
  const bodyY = scaleY(Math.max(open, close));
  const bodyH = Math.max(1, Math.abs(scaleY(open) - scaleY(close)));

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={wickX}
        y1={scaleY(high)}
        x2={wickX}
        y2={scaleY(Math.max(open, close))}
        stroke={color}
        strokeWidth={1}
      />
      {/* Lower wick */}
      <line
        x1={wickX}
        y1={scaleY(Math.min(open, close))}
        x2={wickX}
        y2={scaleY(low)}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + 1}
        y={bodyY}
        width={Math.max(width - 2, 2)}
        height={bodyH}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={0.5}
        opacity={isUp ? 0.9 : 0.9}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-card border border-border rounded-sm p-2.5 text-xs font-mono shadow-lg">
      <div className="text-muted-foreground mb-1">{d.date}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">O</span>
        <span className="text-foreground">{d.open.toFixed(2)}</span>
        <span className="text-muted-foreground">H</span>
        <span className="text-foreground">{d.high.toFixed(2)}</span>
        <span className="text-muted-foreground">L</span>
        <span className="text-foreground">{d.low.toFixed(2)}</span>
        <span className="text-muted-foreground">C</span>
        <span className={d.close >= d.open ? "text-success" : "text-destructive"}>
          {d.close.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Vol</span>
        <span className="text-foreground">{d.volume.toLocaleString()}</span>
      </div>
      {d.signal && (
        <div className={`mt-1 font-semibold ${d.signal === "buy" ? "text-success" : "text-destructive"}`}>
          ▶ {d.signal.toUpperCase()} SIGNAL
        </div>
      )}
    </div>
  );
};

export function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
  const processedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      // For the bar: we use range as the visual bar height
      range: [Math.min(d.open, d.close), Math.max(d.open, d.close)] as [number, number],
      fullRange: d.high - d.low,
    }));
  }, [data]);

  const [yMin, yMax] = useMemo(() => {
    const lows = data.map((d) => d.low);
    const highs = data.map((d) => d.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = (max - min) * 0.05;
    return [min - pad, max + pad];
  }, [data]);

  const buySignals = processedData.filter((d) => d.signal === "buy");
  const sellSignals = processedData.filter((d) => d.signal === "sell");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={processedData} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: "hsl(218 11% 65%)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 9, fill: "hsl(218 11% 65%)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(0)}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          dataKey="fullRange"
          shape={<CandlestickShape />}
          isAnimationActive={false}
        >
          {processedData.map((entry, idx) => (
            <Cell key={idx} />
          ))}
        </Bar>
        {buySignals.map((d, i) => (
          <ReferenceDot
            key={`buy-${i}`}
            x={d.date}
            y={d.low - (yMax - yMin) * 0.02}
            r={5}
            fill="hsl(142 71% 45%)"
            stroke="hsl(142 71% 35%)"
            strokeWidth={1}
          />
        ))}
        {sellSignals.map((d, i) => (
          <ReferenceDot
            key={`sell-${i}`}
            x={d.date}
            y={d.high + (yMax - yMin) * 0.02}
            r={5}
            fill="hsl(0 84% 60%)"
            stroke="hsl(0 84% 50%)"
            strokeWidth={1}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
