export function extractFeatures(candles) {
  if (candles.length < 50) return null;

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const last = closes.length - 1;

  const trend = (closes[last] - closes[last - 20]) / closes[last - 20];

  const returns = [];
  for (let i = last - 20; i < last; i++) {
    returns.push(Math.log(closes[i + 1] / closes[i]));
  }

  const mean = returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance = returns.reduce((s,r)=>s+(r-mean)**2,0)/returns.length;
  const volatility = Math.sqrt(variance);

  const avgVolume =
    volumes.slice(last-20,last).reduce((a,b)=>a+b,0)/20;

  const liquidity = volumes[last] / avgVolume;

  const momentum = closes[last] - closes[last-5];

  return {
    trend,
    volatility,
    liquidity,
    momentum
  };
}