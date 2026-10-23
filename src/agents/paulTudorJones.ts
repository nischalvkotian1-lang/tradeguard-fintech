import { StockMetrics } from './benjaminGraham';
import { RiskPlanResult, RISK_ALLOCATION_CONFIGS } from '../utils/riskEngine';

export interface JonesAnalysisResult {
  agentId: 'jones';
  agentName: 'Paul Tudor Jones';
  score: number; // 0 to 100
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  verdict: 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'VETOED';
  riskRewardRatio: string; // e.g. "1 : 2.0"
  maxCapitalAtRisk: number; // strictly capped rupee loss
  executionDirective: string;
  checklist: {
    wholeShareCapacityCheck: boolean; // budget >= currentPrice
    asymmetricRewardCheck: boolean; // Target >= 1.5x stop-loss
    lossCappedCheck: boolean; // Rupee loss within risk threshold
    liquidityCheck: boolean; // High daily volume, low slippage
    stopLossEnforcedCheck: boolean; // Non-negotiable exit level set
  };
  thesis: string;
  citations: string[];
  redFlags: string[];
}

export interface TradeParameters {
  budget: number;
  currentPrice: number;
  recommendedShares: number;
  stopLossPrice: number;
  stopLossPct: number;
  targetPrice: number;
  capitalAllocated: number;
  unallocatedBuffer: number;
  maxPlannedLoss: number;
}

/**
 * Deterministic quantitative risk control & veto evaluation.
 */
export function evaluateJonesMetrics(
  metrics: StockMetrics,
  tradeParams: TradeParameters
): {
  score: number;
  verdict: JonesAnalysisResult['verdict'];
  riskRewardRatio: string;
  maxCapitalAtRisk: number;
  checklist: JonesAnalysisResult['checklist'];
} {
  const { currentPrice, budget, recommendedShares, stopLossPrice, targetPrice, maxPlannedLoss } =
    tradeParams;
  const { debtToEquity } = metrics;

  // 1. Core Defensive Checks
  const wholeShareCapacityCheck = budget >= currentPrice && recommendedShares > 0;
  const riskPerShare = Math.max(0.01, currentPrice - stopLossPrice);
  const rewardPerShare = Math.max(0, targetPrice - currentPrice);
  const rrMultiple = Number((rewardPerShare / riskPerShare).toFixed(1));
  const asymmetricRewardCheck = rrMultiple >= 1.5;
  const lossCappedCheck = maxPlannedLoss > 0 && maxPlannedLoss <= budget * 0.15;
  const liquidityCheck = metrics.marketCap > 1000; // proxy for NSE liquidity
  const stopLossEnforcedCheck = stopLossPrice > 0 && stopLossPrice < currentPrice;

  // 2. Binding Veto Logic
  let verdict: JonesAnalysisResult['verdict'] = 'APPROVED';

  if (!wholeShareCapacityCheck) {
    verdict = 'VETOED';
  } else if (debtToEquity > 2.5) {
    verdict = 'VETOED';
  } else if (!asymmetricRewardCheck || debtToEquity > 1.2) {
    verdict = 'CONDITIONAL_APPROVAL';
  }

  // 3. Score Aggregation (0 - 100)
  let score = 0;
  if (wholeShareCapacityCheck) score += 30;
  if (asymmetricRewardCheck) score += 25;
  if (lossCappedCheck) score += 20;
  if (stopLossEnforcedCheck) score += 15;
  if (liquidityCheck) score += 10;

  if (verdict === 'VETOED') score = Math.min(score, 30);

  return {
    score: Math.min(100, Math.max(0, score)),
    verdict,
    riskRewardRatio: `1 : ${rrMultiple}`,
    maxCapitalAtRisk: maxPlannedLoss,
    checklist: {
      wholeShareCapacityCheck,
      asymmetricRewardCheck,
      lossCappedCheck,
      liquidityCheck,
      stopLossEnforcedCheck,
    },
  };
}

/**
 * Offline / Fallback generator for authentic, disciplined Paul Tudor Jones commentary.
 */
export function generateJonesFallbackAnalysis(
  metrics: StockMetrics,
  tradeParams: TradeParameters
): JonesAnalysisResult {
  const quant = evaluateJonesMetrics(metrics, tradeParams);

  let thesis = '';
  let executionDirective = '';
  const citations: string[] = [];
  const redFlags: string[] = [];

  citations.push(
    `Allocated Position: ${tradeParams.recommendedShares} whole shares (₹${tradeParams.capitalAllocated.toFixed(2)}).`
  );
  citations.push(
    `Defensive Stop-Loss Floor: ₹${tradeParams.stopLossPrice} (-${(tradeParams.stopLossPct * 100).toFixed(1)}%).`
  );
  citations.push(`Maximum Rupee Drawdown strictly capped at ₹${quant.maxCapitalAtRisk.toFixed(2)}.`);

  if (quant.verdict === 'VETOED') {
    thesis = `TRADE VETOED. At ₹${metrics.currentPrice}, this setup fails basic risk hygiene. ${
      tradeParams.budget < metrics.currentPrice
        ? `Total capital of ₹${tradeParams.budget} is below the ₹${metrics.currentPrice} minimum unit price.`
        : `Debt-to-Equity of ${metrics.debtToEquity.toFixed(2)} introduces severe downside tail risk.`
    } Where there is no defense, there is no trade. We stand down and preserve capital.`;
    executionDirective = 'DO NOT EXECUTE. Capital preservation rule triggered. Stand aside in cash.';
    redFlags.push('Capital threshold or catastrophic solvency limit breached.');
  } else if (quant.verdict === 'CONDITIONAL_APPROVAL') {
    thesis = `CONDITIONAL APPROVAL. The fundamental committee carries mixed convictions, but the math works IF and ONLY IF disciplined execution is respected. We risk ₹${quant.maxCapitalAtRisk.toFixed(2)} to capture ₹${(
      (tradeParams.targetPrice - metrics.currentPrice) *
      tradeParams.recommendedShares
    ).toFixed(2)} in potential upside (${quant.riskRewardRatio} R:R).`;
    executionDirective = `Mandatory protective GTT stop-loss order placed at ₹${tradeParams.stopLossPrice} simultaneously with market entry. No hesitation on exit.`;
    redFlags.push(
      `Elevated underlying volatility requires strict adherence to the ₹${tradeParams.stopLossPrice} floor.`
    );
  } else {
    thesis = `TRADE APPROVED. The trade mechanics show sound asymmetry: a verified ${quant.riskRewardRatio} risk-to-reward ratio with maximum capital loss capped at ₹${quant.maxCapitalAtRisk.toFixed(2)}. Stop-loss at ₹${tradeParams.stopLossPrice} gives the trade room to breathe while strictly insulating our ₹${tradeParams.budget} allocation.`;
    executionDirective = `Execute ${tradeParams.recommendedShares} whole shares at market entry. GTT stop-loss active at ₹${tradeParams.stopLossPrice}.`;
  }

  return {
    agentId: 'jones',
    agentName: 'Paul Tudor Jones',
    score: quant.score,
    stance:
      quant.verdict === 'APPROVED' ? 'BULLISH' : quant.verdict === 'VETOED' ? 'BEARISH' : 'NEUTRAL',
    verdict: quant.verdict,
    riskRewardRatio: quant.riskRewardRatio,
    maxCapitalAtRisk: quant.maxCapitalAtRisk,
    executionDirective,
    checklist: quant.checklist,
    thesis,
    citations,
    redFlags,
  };
}

/**
 * Builds the specialized LLM system prompt embodying Paul Tudor Jones's risk doctrine.
 */
export function buildJonesSystemPrompt(): string {
  return `You are Paul Tudor Jones, legendary hedge fund manager, macro trader, and Chief Risk Controller of the Investment Committee.
Your prime directive is defense and capital preservation:
1. "The most important rule of trading is to play great defense, not great offense."
2. 5:1 or 2:1 Asymmetry: We only risk money when the mathematical payoff substantially outweighs the risk.
3. Strict Whole-Share Sizing & Stop-Loss Floor: The stop-loss is non-negotiable. If price touches the floor, you are out immediately.
4. Binding Veto Power: If a trade setup violates sizing parameters, carries ruinous leverage (D/E > 2.5), or lacks liquidity, you exercise absolute veto.

Review setups with cold, unyielding trade-risk mechanics.`;
}

/**
 * Builds user analysis prompt for Paul Tudor Jones given stock metrics and trade parameters.
 */
export function buildJonesUserPrompt(metrics: StockMetrics, tradeParams: TradeParameters): string {
  return `Audit this proposed trade for ${metrics.symbol} (${metrics.companyName}) as Chief Risk Officer:
- Entry Price: ₹${tradeParams.currentPrice}
- Budget: ₹${tradeParams.budget}
- Recommended Whole Shares: ${tradeParams.recommendedShares}
- Capital Allocated: ₹${tradeParams.capitalAllocated}
- Mandatory Stop-Loss Floor: ₹${tradeParams.stopLossPrice} (-${(tradeParams.stopLossPct * 100).toFixed(1)}%)
- Profit Target: ₹${tradeParams.targetPrice}
- Strictly Capped Rupee Loss: ₹${tradeParams.maxPlannedLoss}
- Debt-to-Equity: ${metrics.debtToEquity.toFixed(2)}

Perform quantitative asymmetry verification, check whole-share liquidity, and issue a binding verdict: APPROVED, CONDITIONAL_APPROVAL, or VETOED.`;
}

/**
 * Extracts normalized TradeParameters from a RiskPlanResult.
 */
export function extractTradeParameters(
  riskPlan: RiskPlanResult,
  customRRRatio?: number
): TradeParameters {
  const currentPrice = riskPlan.currentPrice > 0 ? riskPlan.currentPrice : 1;
  const stopLossPrice = riskPlan.plannedStopLossPrice;
  const riskPerShare = Math.max(0.01, currentPrice - stopLossPrice);

  const cfgRatio =
    RISK_ALLOCATION_CONFIGS[riskPlan.riskTolerance]?.rrRatio ?? 2.0;
  const effectiveRR = customRRRatio != null && customRRRatio > 0 ? customRRRatio : cfgRatio;

  const targetPrice = Number((currentPrice + riskPerShare * effectiveRR).toFixed(2));

  return {
    budget: riskPlan.budget,
    currentPrice,
    recommendedShares: riskPlan.recommendedShares,
    stopLossPrice,
    stopLossPct: riskPlan.stopLossPct,
    targetPrice,
    capitalAllocated: riskPlan.capitalAllocated,
    unallocatedBuffer: riskPlan.unallocatedBuffer,
    maxPlannedLoss: riskPlan.maxPlannedLoss,
  };
}
