export function classifyHMM(features) {

  const { trend, volatility, liquidity, momentum } = features;

  if (volatility > 0.02 && liquidity < 0.7) {
    return "Liquidity Crisis";
  }

  if (volatility > 0.015 && Math.abs(trend) < 0.002) {
    return "Volatility Shock";
  }

  if (trend > 0.01 && momentum > 0) {
    return "Momentum Breakout";
  }

  if (Math.abs(trend) > 0.008) {
    return "Trend";
  }

  return "Mean Reversion";
}