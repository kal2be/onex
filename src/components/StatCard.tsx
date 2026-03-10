import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, subValue, icon, trend }: StatCardProps) {
  const glowClass = trend === "up" ? "glow-success" : trend === "down" ? "glow-destructive" : "";

  return (
    <div className={`glass-panel rounded-sm p-3 sm:p-4 transition-all hover:border-primary/30 ${glowClass}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg sm:text-2xl font-semibold font-mono ${
          trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-foreground"
        }`}>{value}</span>
        {subValue && (
          <span
            className={`text-[10px] sm:text-xs font-mono ${
              trend === "up" ? "text-success/70" : trend === "down" ? "text-destructive/70" : "text-muted-foreground"
            }`}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
