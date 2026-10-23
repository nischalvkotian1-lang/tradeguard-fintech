import { StockMetrics } from './benjaminGraham';

export interface BuffettAnalysisResult {
  agentId: 'buffett';
  agentName: 'Warren Buffett';
  score: number; // 0 to 100
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  moatStrength: 'WIDE' | 'NARROW' | 'NONE';
  pricingPowerScore: number; // 0 to 100
  checklist: {
    roeCheck: boolean; // ROE >= 15%
    operatingMarginCheck: boolean; // Sustainable operating margins >= 14%
    conservativeDebtCheck: boolean; // D/E <= 0.80
    fcfPositiveCheck: boolean; // Positive free cash generation
    valuationSanityCheck: boolean; // P/E <= 32 for quality compounders
  };
  thesis: string;
  citations: string[];
  redFlags: string[];
}

/**
 * Deterministic quantitative valuation of Warren Buffett's Economic Moat & Compounding rules.
 */
export function evaluateBuffettMetrics(
  metrics: StockMetrics & { roe?: number; operatingMargin?: number }
): {
  score: number;
  moatStrength: BuffettAnalysisResult['moatStrength'];
  pricingPowerScore: number;
  checklist: BuffettAnalysisResult['checklist'];
} {
  const { pe, debtToEquity } = metrics;
  const roe = metrics.roe ?? 16.5; // Fallback to estimated ROE if unpopulated
  const operatingMargin = metrics.operatingMargin ?? 18.0;

  // 1. Five Fundamental Buffett Quality & Moat Checks
  const roeCheck = roe >= 15.0;
  const operatingMarginCheck = operatingMargin >= 14.0;
  const conservativeDebtCheck = debtToEquity <= 0.8;
  const fcfPositiveCheck = debtToEquity < 1.2; // proxy for cash-generative stability
  const valuationSanityCheck = pe > 0 && pe <= 32.0;

  // 2. Moat Strength Assessment
  let moatScore = 0;
  if (roeCheck) moatScore += 40;
  if (operatingMarginCheck) moatScore += 30;
  if (conservativeDebtCheck) moatScore += 30;

  const moatStrength: BuffettAnalysisResult['moatStrength'] =
    moatScore >= 70 ? 'WIDE' : moatScore >= 40 ? 'NARROW' : 'NONE';

  const pricingPowerScore = Math.min(100, Math.round((operatingMargin / 25) * 100));

  // 3. Quantitative Score (0 to 100)
  let score = 0;
  if (roeCheck) score += 30;
  if (operatingMarginCheck) score += 20;
  if (conservativeDebtCheck) score += 25;
  if (valuationSanityCheck) score += 15;
  if (fcfPositiveCheck) score += 10;

  return {
    score: Math.min(100, Math.max(0, score)),
    moatStrength,
    pricingPowerScore,
    checklist: {
      roeCheck,
      operatingMarginCheck,
      conservativeDebtCheck,
      fcfPositiveCheck,
      valuationSanityCheck,
    },
  };
}

/**
 * Offline / Fallback generator for realistic, metric-backed Buffett commentary.
 */
export function generateBuffettFallbackAnalysis(
  metrics: StockMetrics & { roe?: number; operatingMargin?: number },
  budget: number
): BuffettAnalysisResult {
  const quant = evaluateBuffettMetrics(metrics);
  const isHighQuality = quant.checklist.roeCheck && quant.checklist.conservativeDebtCheck;
  const isFairPrice = quant.checklist.valuationSanityCheck;

  let thesis = '';
  const citations: string[] = [];
  const redFlags: string[] = [];

  if (isHighQuality && isFairPrice) {
    thesis = `At ₹${metrics.currentPrice}, ${metrics.companyName} resembles a wonderful business at a sensible price. With solid capital returns and a manageable debt-to-equity ratio of ${metrics.debtToEquity.toFixed(2)}, the company exhibits durable competitive advantages capable of compounding our ₹${budget} allocation over a multi-year horizon.`;
    citations.push(`Demonstrates sustainable economic moat with ${quant.moatStrength} moat classification.`);
    citations.push(`P/E multiple of ${metrics.pe.toFixed(1)} remains reasonable for this caliber of compounding efficiency.`);
  } else if (isHighQuality && !isFairPrice) {
    thesis = `There is no question ${metrics.companyName} is an outstanding enterprise with disciplined management and a sturdy balance sheet. However, the price you pay determines your ultimate rate of return. At a P/E of ${metrics.pe.toFixed(1)}, the market has priced in several years of flawless execution. We will keep this on our watchlist for a market stumble.`;
    citations.push(`Strong franchise quality and clean balance sheet (D/E of ${metrics.debtToEquity.toFixed(2)}).`);
    redFlags.push(`Price leaves inadequate cushion; multiple of ${metrics.pe.toFixed(1)}x tests the ceiling for long-term compounders.`);
  } else {
    thesis = `We look for businesses with enduring moats that can be run by almost anyone, because eventually someone will. With Debt-to-Equity at ${metrics.debtToEquity.toFixed(2)}, ${metrics.companyName} depends too heavily on external debt financing rather than retained earnings. This falls into my "Too Hard" pile.`;
    citations.push(`Elevated debt structure of ${metrics.debtToEquity.toFixed(2)} weakens the company's financial moat.`);
    redFlags.push(`Fails return-on-capital and leverage criteria; lacks pricing power insulation.`);
  }

  return {
    agentId: 'buffett',
    agentName: 'Warren Buffett',
    score: quant.score,
    stance: quant.score >= 65 ? 'BULLISH' : quant.score <= 40 ? 'BEARISH' : 'NEUTRAL',
    moatStrength: quant.moatStrength,
    pricingPowerScore: quant.pricingPowerScore,
    checklist: quant.checklist,
    thesis,
    citations,
    redFlags,
  };
}

/**
 * Builds the specialized LLM system prompt embodying Warren Buffett's philosophy.
 */
export function buildBuffettSystemPrompt(): string {
  return `You are Warren Buffett, Chairman and CEO of Berkshire Hathaway.
Your investment decisions follow core tenets:
1. Economic Moats: Seek companies with durable competitive advantages (pricing power, high customer switching costs, brand moats).
2. Wonderful Businesses at Fair Prices: A good business at a fair price is vastly superior to a mediocre business at a bargain price.
3. High Return on Capital: Demand Return on Equity (ROE) >= 15% without excessive leverage.
4. Capital Allocation & Solvency: Debt-to-Equity <= 0.80, self-funding operations via retained free cash flow.
5. Pricing Power: Can the business raise prices in an inflationary environment without losing customers to competitors?

Speak with clarity, folksy wisdom, and an unwavering commitment to compounding capital safely.`;
}

/**
 * Builds user analysis prompt for Warren Buffett given stock metrics and risk plan.
 */
export function buildBuffettUserPrompt(
  metrics: StockMetrics & { roe?: number; operatingMargin?: number },
  budget: number
): string {
  return `Evaluate ${metrics.symbol} (${metrics.companyName}) as a long-term compounder:
- Current Price: ₹${metrics.currentPrice}
- P/E Ratio: ${metrics.pe > 0 ? metrics.pe.toFixed(2) : 'N/A'}
- Estimated ROE: ${metrics.roe != null ? metrics.roe.toFixed(1) : '16.5'}%
- Operating Margin: ${metrics.operatingMargin != null ? metrics.operatingMargin.toFixed(1) : '18.0'}%
- Debt-to-Equity: ${metrics.debtToEquity.toFixed(2)}
- Sector: ${metrics.sector}
- Trade Capital Allocation: ₹${budget}

Determine moat strength (WIDE / NARROW / NONE), evaluate pricing power, and state whether this is a "wonderful company at a fair price" or belongs in the "Too Hard" pile.`;
}

/**
 * Derives Buffett-specific quality metrics (ROE, Operating Margin) from fundamental context.
 */
export function deriveBuffettMetrics(
  baseMetrics: StockMetrics,
  netIncome: number | null,
  totalEquity: number | null
): StockMetrics & { roe: number; operatingMargin: number } {
  // Compute ROE if netIncome and totalEquity are available
  let roe = 16.5;
  if (netIncome != null && totalEquity != null && totalEquity > 0) {
    roe = Number(((netIncome / totalEquity) * 100).toFixed(1));
    if (roe > 50) roe = 50; // Cap outliers
    if (roe < -50) roe = -50;
  } else if (netIncome != null && netIncome <= 0) {
    roe = -5.0;
  }

  // Operating margin proxy: healthy profitable companies average 15-22%
  const operatingMargin = netIncome && netIncome > 0 ? 18.5 : 5.0;

  return {
    ...baseMetrics,
    roe,
    operatingMargin,
  };
}
