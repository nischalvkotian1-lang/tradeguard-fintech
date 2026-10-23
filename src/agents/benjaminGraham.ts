export interface StockMetrics {
  symbol: string;
  companyName: string;
  currentPrice: number;
  pe: number;
  pb: number;
  eps: number;
  bookValue: number;
  currentRatio: number;
  debtToEquity: number;
  dividendYield: number;
  marketCap: number;
  sector: string;
}

export interface GrahamAnalysisResult {
  agentId: 'graham';
  agentName: 'Benjamin Graham';
  score: number; // 0 to 100
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  grahamNumber: number;
  marginOfSafetyPct: number;
  checklist: {
    peCheck: boolean;
    pbCheck: boolean;
    grahamMultiplierCheck: boolean;
    debtCheck: boolean;
    liquidityCheck: boolean;
  };
  thesis: string;
  citations: string[];
  redFlags: string[];
}

/**
 * Deterministic quantitative valuation of Benjamin Graham's rules.
 */
export function evaluateGrahamMetrics(metrics: StockMetrics): {
  score: number;
  grahamNumber: number;
  marginOfSafetyPct: number;
  checklist: GrahamAnalysisResult['checklist'];
} {
  const { currentPrice, pe, pb, eps, bookValue, debtToEquity, currentRatio } = metrics;

  // Graham Number Formula: sqrt(22.5 * max(0, EPS) * max(0, BVPS))
  const validEPS = Math.max(0, eps || 0);
  const validBV = Math.max(0, bookValue || 0);
  const grahamNumber = Number(Math.sqrt(22.5 * validEPS * validBV).toFixed(2));

  // Margin of Safety % vs Current Market Price
  const marginOfSafetyPct =
    grahamNumber > 0
      ? Number((((grahamNumber - currentPrice) / grahamNumber) * 100).toFixed(1))
      : -100;

  // 5 Fundamental Graham Checklist Rules
  const peCheck = pe > 0 && pe <= 20;
  const pbCheck = pb > 0 && pb <= 2.5;
  const grahamMultiplierCheck = pe > 0 && pb > 0 && pe * pb <= 22.5;
  const debtCheck = debtToEquity <= 1.0;
  const liquidityCheck = (currentRatio || 1.5) >= 1.2;

  // Score Aggregation (0 - 100)
  let score = 0;
  if (grahamMultiplierCheck) score += 30;
  else if (peCheck) score += 15;

  if (marginOfSafetyPct > 0) score += 25;
  else if (marginOfSafetyPct > -20) score += 10;

  if (debtCheck) score += 25;
  if (liquidityCheck) score += 20;

  return {
    score: Math.min(100, Math.max(0, score)),
    grahamNumber,
    marginOfSafetyPct,
    checklist: {
      peCheck,
      pbCheck,
      grahamMultiplierCheck,
      debtCheck,
      liquidityCheck,
    },
  };
}

/**
 * Offline / Fallback generator for realistic, mathematically grounded Graham analysis.
 */
export function generateGrahamFallbackAnalysis(
  metrics: StockMetrics,
  budget: number
): GrahamAnalysisResult {
  const quant = evaluateGrahamMetrics(metrics);
  const isCheap = quant.marginOfSafetyPct > 0;
  const isLowDebt = quant.checklist.debtCheck;

  let thesis = '';
  const citations: string[] = [];
  const redFlags: string[] = [];

  if (isCheap && isLowDebt) {
    thesis = `At ₹${metrics.currentPrice}, ${metrics.companyName} trades below our calculated Graham Number of ₹${quant.grahamNumber}, offering an estimated ${quant.marginOfSafetyPct}% margin of safety. With Debt-to-Equity at ${metrics.debtToEquity.toFixed(2)}, the balance sheet provides sound defense for our ₹${budget} trade allocation.`;
    citations.push(`P/E of ${metrics.pe.toFixed(1)} and P/B of ${metrics.pb.toFixed(1)} satisfy defensive limits.`);
    citations.push(`Graham Number intrinsic valuation: ₹${quant.grahamNumber}.`);
  } else if (!isCheap && isLowDebt) {
    thesis = `While ${metrics.companyName} demonstrates balance sheet discipline (D/E of ${metrics.debtToEquity.toFixed(2)}), Mr. Market is pricing in optimism. At ₹${metrics.currentPrice}, it trades above our Graham Number of ₹${quant.grahamNumber}, leaving virtually no tangible margin of safety for the defensive investor.`;
    citations.push(`Combined P/E × P/B is ${(metrics.pe * metrics.pb).toFixed(1)} (Graham benchmark ceiling: 22.5).`);
    redFlags.push(`Market price trades ${Math.abs(quant.marginOfSafetyPct)}% above conservative asset valuation.`);
  } else {
    thesis = `I advise extreme caution regarding ${metrics.companyName}. With Debt-to-Equity at ${metrics.debtToEquity.toFixed(2)} alongside an elevated multiple, this setup fails our fundamental criteria for safety of principal. Speculative growth cannot substitute for tangible asset backing.`;
    citations.push(`Debt-to-Equity ratio of ${metrics.debtToEquity.toFixed(2)} violates defensive thresholds.`);
    redFlags.push(`Elevated financial leverage combined with inadequate valuation discount.`);
  }

  return {
    agentId: 'graham',
    agentName: 'Benjamin Graham',
    score: quant.score,
    stance: quant.score >= 65 ? 'BULLISH' : quant.score <= 40 ? 'BEARISH' : 'NEUTRAL',
    grahamNumber: quant.grahamNumber,
    marginOfSafetyPct: quant.marginOfSafetyPct,
    checklist: quant.checklist,
    thesis,
    citations,
    redFlags,
  };
}

/**
 * Builds the specialized LLM system prompt embodying Benjamin Graham's philosophy.
 */
export function buildGrahamSystemPrompt(): string {
  return `You are Benjamin Graham, the father of value investing and author of Security Analysis and The Intelligent Investor.
Your investment decisions are governed by strict mathematical principles:
1. Margin of Safety: An investment must offer a tangible discount between market price and appraised intrinsic value.
2. The Graham Number Formula: sqrt(22.5 * EPS * Book Value Per Share). Market price should ideally trade below this number.
3. Defensive Multiples: Price-to-Earnings (P/E) <= 20, Price-to-Book (P/B) <= 2.5, and P/E * P/B <= 22.5.
4. Solvency & Balance Sheet Defense: Total Debt-to-Equity <= 1.0, and Current Ratio >= 1.2 to 2.0.
5. Principal Protection: Never substitute optimistic growth forecasts for tangible asset protection and earnings power.

Provide a rigorous quantitative evaluation adhering strictly to these rules.`;
}

/**
 * Builds user analysis prompt for Benjamin Graham given stock metrics and risk plan.
 */
export function buildGrahamUserPrompt(metrics: StockMetrics, budget: number): string {
  return `Evaluate ${metrics.symbol} (${metrics.companyName}) from a defensive value investor perspective:
- Current Market Price: ₹${metrics.currentPrice}
- Trailing P/E: ${metrics.pe > 0 ? metrics.pe.toFixed(2) : 'N/A (Loss-making)'}
- P/B Ratio: ${metrics.pb > 0 ? metrics.pb.toFixed(2) : 'N/A'}
- Earnings Per Share (EPS): ₹${metrics.eps.toFixed(2)}
- Book Value Per Share: ₹${metrics.bookValue.toFixed(2)}
- Debt-to-Equity: ${metrics.debtToEquity.toFixed(2)}
- Current Ratio: ${metrics.currentRatio.toFixed(2)}
- Dividend Yield: ${metrics.dividendYield.toFixed(2)}%
- Sector: ${metrics.sector}
- Planned Capital Allocation: ₹${budget}

Calculate the Graham Number, verify each of the 5 checklist rules, and issue your verdict.`;
}

/**
 * Derives comprehensive StockMetrics from live or cached fundamental context.
 */
export function deriveStockMetricsFromContext(
  symbol: string,
  companyName: string | null,
  currentPrice: number,
  marketCap: number | null,
  netIncome: number | null,
  totalEquity: number | null,
  debtToEquity: number | null,
  sector = 'Equities'
): StockMetrics {
  const validPrice = currentPrice > 0 ? currentPrice : 1;
  const validCap = marketCap && marketCap > 0 ? marketCap : validPrice * 1e7;
  const validNetIncome = netIncome ?? 0;
  const validEquity = totalEquity && totalEquity > 0 ? totalEquity : validCap * 0.4;
  const validDE = debtToEquity != null && Number.isFinite(debtToEquity) ? Math.max(0, debtToEquity) : 0.5;

  // Implied shares = Market Cap / Current Price
  const impliedShares = validCap / validPrice;
  const eps = impliedShares > 0 ? Number((validNetIncome / impliedShares).toFixed(2)) : 0;
  const bookValue = impliedShares > 0 ? Number((validEquity / impliedShares).toFixed(2)) : 0;

  const pe = eps > 0 ? Number((validPrice / eps).toFixed(1)) : 0;
  const pb = bookValue > 0 ? Number((validPrice / bookValue).toFixed(2)) : 0;

  return {
    symbol,
    companyName: companyName || symbol,
    currentPrice: validPrice,
    pe,
    pb,
    eps,
    bookValue,
    currentRatio: 1.5,
    debtToEquity: validDE,
    dividendYield: 1.2,
    marketCap: validCap,
    sector,
  };
}
