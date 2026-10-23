import { StockMetrics } from './benjaminGraham';

export interface MungerAnalysisResult {
  agentId: 'munger';
  agentName: 'Charlie Munger';
  score: number; // 0 to 100
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  fragilityRating: 'LOW' | 'MODERATE' | 'CRITICAL';
  solvencyStatus: 'PRISTINE' | 'ADEQUATE' | 'OVERLEVERAGED';
  checklist: {
    noExcessiveDebtCheck: boolean; // D/E <= 0.70
    interestCoverageCheck: boolean; // Proxied via clean leverage profile
    capitalDisciplineCheck: boolean; // Management not destroying capital
    inversionTestPassed: boolean; // Stock passes "How could this company go broke?"
    valuationRationalityCheck: boolean; // P/E <= 35
  };
  thesis: string;
  citations: string[];
  redFlags: string[];
}

/**
 * Deterministic quantitative evaluation of Charlie Munger's Inversion & Solvency rules.
 */
export function evaluateMungerMetrics(metrics: StockMetrics): {
  score: number;
  fragilityRating: MungerAnalysisResult['fragilityRating'];
  solvencyStatus: MungerAnalysisResult['solvencyStatus'];
  checklist: MungerAnalysisResult['checklist'];
} {
  const { pe, debtToEquity, currentRatio } = metrics;

  // 1. Inversion & Forensic Solvency Checks
  const noExcessiveDebtCheck = debtToEquity <= 0.7;
  const solvencyStatus: MungerAnalysisResult['solvencyStatus'] =
    debtToEquity <= 0.5 ? 'PRISTINE' : debtToEquity <= 1.0 ? 'ADEQUATE' : 'OVERLEVERAGED';

  const interestCoverageCheck = debtToEquity <= 0.9 && (currentRatio || 1.4) >= 1.2;
  const capitalDisciplineCheck = debtToEquity <= 1.1;
  const valuationRationalityCheck = pe > 0 && pe <= 35.0;
  const inversionTestPassed = noExcessiveDebtCheck && (currentRatio || 1.3) >= 1.1;

  // 2. Fragility Assessment (Inverted Thinking)
  let fragilityScore = 0;
  if (!noExcessiveDebtCheck) fragilityScore += 45;
  if (pe > 40) fragilityScore += 25;
  if ((currentRatio || 1.5) < 1.1) fragilityScore += 30;

  const fragilityRating: MungerAnalysisResult['fragilityRating'] =
    fragilityScore >= 50 ? 'CRITICAL' : fragilityScore >= 25 ? 'MODERATE' : 'LOW';

  // 3. Quantitative Score (0 to 100)
  let score = 0;
  if (noExcessiveDebtCheck) score += 35;
  else if (debtToEquity <= 1.0) score += 15;

  if (inversionTestPassed) score += 30;
  if (valuationRationalityCheck) score += 20;
  if (capitalDisciplineCheck) score += 15;

  return {
    score: Math.min(100, Math.max(0, score)),
    fragilityRating,
    solvencyStatus,
    checklist: {
      noExcessiveDebtCheck,
      interestCoverageCheck,
      capitalDisciplineCheck,
      inversionTestPassed,
      valuationRationalityCheck,
    },
  };
}

/**
 * Offline / Fallback generator for authentic, blunt Munger commentary.
 */
export function generateMungerFallbackAnalysis(
  metrics: StockMetrics,
  budget: number
): MungerAnalysisResult {
  const quant = evaluateMungerMetrics(metrics);
  const isPristine = quant.solvencyStatus === 'PRISTINE';
  const isOverleveraged = quant.solvencyStatus === 'OVERLEVERAGED';

  let thesis = '';
  const citations: string[] = [];
  const redFlags: string[] = [];

  if (isPristine && quant.checklist.valuationRationalityCheck) {
    thesis = `Inverting the problem: how does ${metrics.companyName} go bankrupt? It almost certainly does not. With a negligible Debt-to-Equity of ${metrics.debtToEquity.toFixed(2)}, management has built an enduring fortress. We avoid stupidity rather than seeking brilliance, and this ₹${budget} allocation stands on exceptionally solid footing.`;
    citations.push(`Pristine solvency profile with Debt-to-Equity of ${metrics.debtToEquity.toFixed(2)}.`);
    citations.push(`Passes the inversion test: Fragility rating is strictly LOW.`);
  } else if (!isOverleveraged) {
    thesis = `${metrics.companyName} is a respectable enterprise, but remember: the great algorithmic rule of life is to concentrate on what to avoid. At a multiple of ${metrics.pe.toFixed(1)}x, you are paying a full price. Ensure our stop-loss discipline is non-negotiable because multiple compression can be vicious.`;
    citations.push(`Solvency is acceptable (D/E of ${metrics.debtToEquity.toFixed(2)}), but valuation leaves little room for operational hiccups.`);
    redFlags.push(`Multiple of ${metrics.pe.toFixed(1)}x limits the margin for human error.`);
  } else {
    thesis = `The three things that ruin smart people are ladies, liquor, and leverage. ${metrics.companyName} is carrying a Debt-to-Equity ratio of ${metrics.debtToEquity.toFixed(2)}. Adding leverage to an operating business introduces fragility we refuse to underwrite. I would not commit our ₹${budget} here. It is fundamentally uninvestable under our standards.`;
    citations.push(`Critical leverage alert: Debt-to-Equity of ${metrics.debtToEquity.toFixed(2)} creates acute downside fragility.`);
    redFlags.push(`Fails forensic balance sheet audit; excessive debt load violates our risk inversion principles.`);
  }

  return {
    agentId: 'munger',
    agentName: 'Charlie Munger',
    score: quant.score,
    stance: quant.score >= 65 ? 'BULLISH' : quant.score <= 40 ? 'BEARISH' : 'NEUTRAL',
    fragilityRating: quant.fragilityRating,
    solvencyStatus: quant.solvencyStatus,
    checklist: quant.checklist,
    thesis,
    citations,
    redFlags,
  };
}

/**
 * Builds the specialized LLM system prompt embodying Charlie Munger's mental models.
 */
export function buildMungerSystemPrompt(): string {
  return `You are Charlie Munger, Vice Chairman of Berkshire Hathaway and partner to Warren Buffett.
Your analysis is driven by multidisciplinary mental models and inversion:
1. Invert, Always Invert: "All I want to know is where I'm going to die, so I'll never go there." Analyze how this company could fail, experience insolvency, or suffer ruin.
2. The Lethality of Leverage: Debt introduces fragility. Businesses with Debt-to-Equity > 0.70 or unserviceable interest covenants are treated with extreme skepticism.
3. Rationality & Avoiding Stupidity: It is remarkable how much long-term advantage people like us have gotten by trying to be consistently not stupid, instead of trying to be very intelligent.
4. Capital Allocation Integrity: Avoid promoters and management teams that destroy shareholder capital or engage in financial engineering.
5. Valuation Sanity: Even a great business can be a terrible investment if bought at a manic multiple (P/E > 35).

Be characteristically blunt, intellectually candid, and rigorous. Do not mince words.`;
}

/**
 * Builds user analysis prompt for Charlie Munger given stock metrics and risk plan.
 */
export function buildMungerUserPrompt(metrics: StockMetrics, budget: number): string {
  return `Forensically audit ${metrics.symbol} (${metrics.companyName}) using inversion:
- Current Market Price: ₹${metrics.currentPrice}
- P/E Ratio: ${metrics.pe > 0 ? metrics.pe.toFixed(2) : 'Negative / Loss-making'}
- Debt-to-Equity Ratio: ${metrics.debtToEquity.toFixed(2)}
- Current Liquidity Ratio: ${metrics.currentRatio.toFixed(2)}
- Book Value Per Share: ₹${metrics.bookValue.toFixed(2)}
- Sector: ${metrics.sector}
- Proposed Trade Budget: ₹${budget}

Invert the thesis: Identify structural fragility, evaluate solvency status (PRISTINE / ADEQUATE / OVERLEVERAGED), check whether it passes the "how could this go broke" test, and issue an unvarnished audit verdict.`;
}
