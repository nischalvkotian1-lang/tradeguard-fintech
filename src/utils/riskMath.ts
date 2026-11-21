/**
 * TradeGuard Financial Mathematics Engine
 * Pure mathematical functions for NSE equities risk management, valuation,
 * solvency analysis, and deterministic whole-share position sizing.
 *
 * Implements the 4-Pillar Committee Methodology:
 * 1. Benjamin Graham (Valuation & Margin of Safety)
 * 2. Warren Buffett (Economic Moats & Compounding Return on Equity)
 * 3. Charlie Munger (Inversion, Solvency & Interest Coverage)
 * 4. Paul Tudor Jones (Capital Preservation, Asymmetry & Whole-Share Risk Sizing)
 */

/**
 * Calculates the Graham Number intrinsic valuation benchmark.
 * Formula: sqrt(22.5 * max(0, EPS) * max(0, BVPS))
 *
 * @param eps - Earnings Per Share (in ₹)
 * @param bookValue - Book Value Per Share (in ₹)
 * @returns Intrinsic value rounded to 2 decimal places, or 0 if inputs are invalid.
 */
export function calculateGrahamNumber(eps: number, bookValue: number): number {
  if (!Number.isFinite(eps) || !Number.isFinite(bookValue) || eps <= 0 || bookValue <= 0) {
    return 0;
  }
  return Number(Math.sqrt(22.5 * eps * bookValue).toFixed(2));
}

/**
 * Calculates the percentage Margin of Safety between intrinsic value and current market price.
 * Formula: ((intrinsicValue - currentPrice) / intrinsicValue) * 100
 *
 * @param currentPrice - Current market price of the stock
 * @param intrinsicValue - Calculated intrinsic value (e.g., Graham Number)
 * @returns Margin of safety percentage rounded to 1 decimal place (-100 if invalid/negative margin).
 */
export function calculateMarginOfSafety(currentPrice: number, intrinsicValue: number): number {
  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(intrinsicValue) ||
    intrinsicValue <= 0 ||
    currentPrice <= 0
  ) {
    return -100;
  }
  return Number((((intrinsicValue - currentPrice) / intrinsicValue) * 100).toFixed(1));
}

/**
 * Checks Benjamin Graham's defensive valuation multiplier benchmark: P/E * P/B <= 22.5.
 *
 * @param pe - Price-to-Earnings ratio
 * @param pb - Price-to-Book ratio
 * @returns True if both multiples are positive and their product is <= 22.5.
 */
export function checkGrahamMultiplier(pe: number, pb: number): boolean {
  if (!Number.isFinite(pe) || !Number.isFinite(pb) || pe <= 0 || pb <= 0) {
    return false;
  }
  return pe * pb <= 22.5;
}

/**
 * Evaluates Warren Buffett's Return on Equity (ROE) compounding threshold.
 * Requires ROE >= 15.0% for high-conviction economic compounders.
 *
 * @param roe - Return on Equity percentage (e.g., 15.0 for 15%)
 * @returns True if ROE is at or above the 15.0% boundary.
 */
export function checkBuffettRoe(roe: number): boolean {
  if (!Number.isFinite(roe)) {
    return false;
  }
  return roe >= 15.0;
}

/**
 * Evaluates Warren Buffett's sustainable operating margin threshold.
 * Requires sustainable operating margins >= 14.0%.
 *
 * @param margin - Operating margin percentage (e.g., 14.0 for 14%)
 * @returns True if operating margin is >= 14.0%.
 */
export function checkBuffettOperatingMargin(margin: number): boolean {
  if (!Number.isFinite(margin)) {
    return false;
  }
  return margin >= 14.0;
}

/**
 * Evaluates Charlie Munger's Interest Coverage Ratio (ICR) threshold.
 * Minimum required threshold is ICR >= 3.0x to ensure debt obligations can be safely serviced.
 *
 * @param icr - Interest Coverage Ratio (EBIT / Interest Expense)
 * @returns True if ICR is at or above the 3.0 threshold.
 */
export function checkMungerInterestCoverage(icr: number): boolean {
  if (!Number.isFinite(icr) || icr < 0) {
    return false;
  }
  return icr >= 3.0;
}

/**
 * Calculates Interest Coverage Ratio from EBIT and Interest Expense.
 * Formula: EBIT / Interest Expense
 *
 * @param ebit - Operating profit (Earnings Before Interest and Taxes)
 * @param interestExpense - Total interest charges
 * @returns Ratio rounded to 2 decimal places, or 0 if inputs are invalid.
 */
export function calculateInterestCoverageRatio(ebit: number, interestExpense: number): number {
  if (
    !Number.isFinite(ebit) ||
    !Number.isFinite(interestExpense) ||
    interestExpense <= 0 ||
    ebit <= 0
  ) {
    return 0;
  }
  return Number((ebit / interestExpense).toFixed(2));
}

/**
 * Evaluates Charlie Munger's solvency status based on Debt-to-Equity leverage.
 * Pristine: D/E <= 0.50
 * Adequate: D/E <= 1.00
 * Overleveraged: D/E > 1.00 or negative equity
 *
 * @param debtToEquity - Debt to Equity ratio
 * @returns 'PRISTINE' | 'ADEQUATE' | 'OVERLEVERAGED'
 */
export function checkMungerSolvency(debtToEquity: number): 'PRISTINE' | 'ADEQUATE' | 'OVERLEVERAGED' {
  if (!Number.isFinite(debtToEquity) || debtToEquity < 0 || debtToEquity > 1.0) {
    return 'OVERLEVERAGED';
  }
  if (debtToEquity <= 0.5) {
    return 'PRISTINE';
  }
  return 'ADEQUATE';
}

/**
 * Calculates Tudor Jones whole-share position sizing for cash delivery equities.
 * Strict Indian market constraint: NSE does not permit fractional share purchases.
 * Formula: Math.floor(budget / currentPrice)
 *
 * @param budget - Total investment capital / trade budget in ₹
 * @param currentPrice - Current market price per share in ₹
 * @returns Number of whole shares (0 if budget < currentPrice or inputs invalid).
 */
export function calculateWholeShares(budget: number, currentPrice: number): number {
  if (
    !Number.isFinite(budget) ||
    !Number.isFinite(currentPrice) ||
    budget <= 0 ||
    currentPrice <= 0 ||
    budget < currentPrice
  ) {
    return 0;
  }
  return Math.floor(budget / currentPrice);
}

/**
 * Calculates the planned protective stop-loss price level.
 * Formula: Number((currentPrice * (1 - normalizedStopLossPct)).toFixed(2))
 *
 * @param currentPrice - Current stock price in ₹
 * @param stopLossPct - Stop loss percentage (supports both decimal 0.06 or whole 6 for 6%)
 * @returns Trigger price in ₹ rounded to 2 decimal places (0 if inputs invalid).
 */
export function calculateStopLossPrice(currentPrice: number, stopLossPct: number): number {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return 0;
  }
  if (!Number.isFinite(stopLossPct) || stopLossPct <= 0) {
    return currentPrice;
  }
  // Normalize percentage: if passed as 6, treat as 0.06; if 0.06, keep as 0.06
  const normalizedPct = stopLossPct > 1 ? stopLossPct / 100 : stopLossPct;
  if (normalizedPct >= 1.0) {
    return 0;
  }
  return Number((currentPrice * (1 - normalizedPct)).toFixed(2));
}

/**
 * Calculates maximum rupee downside capital at risk if the stop-loss order is triggered.
 * Formula: recommendedShares * (currentPrice - stopLossPrice)
 *
 * @param recommendedShares - Number of whole shares purchased
 * @param currentPrice - Entry price per share in ₹
 * @param stopLossPrice - Stop-loss trigger price in ₹
 * @returns Maximum rupee loss rounded to 2 decimal places.
 */
export function calculateMaxRupeeDownside(
  recommendedShares: number,
  currentPrice: number,
  stopLossPrice: number
): number {
  if (
    !Number.isFinite(recommendedShares) ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(stopLossPrice) ||
    recommendedShares <= 0 ||
    currentPrice <= 0
  ) {
    return 0;
  }
  const downsidePerShare = Math.max(0, currentPrice - stopLossPrice);
  return Number((recommendedShares * downsidePerShare).toFixed(2));
}

/**
 * Calculates total capital deployed into whole shares.
 * Formula: recommendedShares * currentPrice
 *
 * @param recommendedShares - Number of whole shares
 * @param currentPrice - Market price per share
 * @returns Capital allocated in ₹ rounded to 2 decimal places.
 */
export function calculateCapitalAllocated(recommendedShares: number, currentPrice: number): number {
  if (
    !Number.isFinite(recommendedShares) ||
    !Number.isFinite(currentPrice) ||
    recommendedShares <= 0 ||
    currentPrice <= 0
  ) {
    return 0;
  }
  return Number((recommendedShares * currentPrice).toFixed(2));
}

/**
 * Calculates uninvested cash remainder resulting from whole-share quantization.
 * Formula: Math.max(0, budget - capitalAllocated)
 *
 * @param budget - Total investment capital in ₹
 * @param capitalAllocated - Capital deployed into whole shares in ₹
 * @returns Unallocated cash remainder in ₹ rounded to 2 decimal places.
 */
export function calculateUnallocatedBuffer(budget: number, capitalAllocated: number): number {
  if (!Number.isFinite(budget) || budget <= 0) {
    return 0;
  }
  const safeAllocated = Number.isFinite(capitalAllocated) ? capitalAllocated : 0;
  return Number(Math.max(0, budget - safeAllocated).toFixed(2));
}

/**
 * Calculates the Risk-to-Reward ratio based on planned stop-loss and target price.
 *
 * @param currentPrice - Entry price
 * @param stopLossPrice - Planned stop-loss price
 * @param targetPrice - Target exit price
 * @returns Object with numeric ratio and formatted string (e.g., "1 : 2.0")
 */
export function calculateRiskRewardRatio(
  currentPrice: number,
  stopLossPrice: number,
  targetPrice: number
): { ratio: number; formatted: string } {
  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(stopLossPrice) ||
    !Number.isFinite(targetPrice) ||
    currentPrice <= 0
  ) {
    return { ratio: 0, formatted: '1 : 0' };
  }
  const riskPerShare = Math.max(0.01, currentPrice - stopLossPrice);
  const rewardPerShare = Math.max(0, targetPrice - currentPrice);
  const ratio = Number((rewardPerShare / riskPerShare).toFixed(1));
  return { ratio, formatted: `1 : ${ratio}` };
}

/**
 * Evaluates Paul Tudor Jones's binding risk controller verdict.
 * Checks whole-share capacity, debt limits, and asymmetric risk-reward ratio.
 *
 * @param params - Configuration parameters
 * @returns 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'VETOED'
 */
export function evaluateTudorJonesVerdict(params: {
  budget: number;
  currentPrice: number;
  recommendedShares: number;
  debtToEquity?: number | null;
  maxPlannedLoss?: number;
  targetPrice?: number;
  stopLossPrice?: number;
}): 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'VETOED' {
  const { budget, currentPrice, recommendedShares, debtToEquity, targetPrice, stopLossPrice } =
    params;

  // 1. Mandatory whole-share capacity check
  if (
    !Number.isFinite(budget) ||
    !Number.isFinite(currentPrice) ||
    budget < currentPrice ||
    recommendedShares <= 0
  ) {
    return 'VETOED';
  }

  // 2. High-leverage catastrophic risk veto
  if (debtToEquity != null && Number.isFinite(debtToEquity) && debtToEquity > 2.5) {
    return 'VETOED';
  }

  // 3. Asymmetric risk-to-reward check
  if (targetPrice != null && stopLossPrice != null && targetPrice > currentPrice) {
    const { ratio } = calculateRiskRewardRatio(currentPrice, stopLossPrice, targetPrice);
    if (ratio < 1.5) {
      return 'CONDITIONAL_APPROVAL';
    }
  }

  // 4. Moderate leverage warning
  if (debtToEquity != null && Number.isFinite(debtToEquity) && debtToEquity > 1.2) {
    return 'CONDITIONAL_APPROVAL';
  }

  return 'APPROVED';
}
