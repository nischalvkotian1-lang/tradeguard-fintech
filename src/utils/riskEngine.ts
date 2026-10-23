export type RiskTolerance = 'Low' | 'Medium' | 'High' | 'Custom';

export interface RiskAllocationConfig {
  allocationPct: number;
  stopLossPct: number;
  rrRatio: number;
  label: string;
  description: string;
}

export const RISK_ALLOCATION_CONFIGS: Record<RiskTolerance, RiskAllocationConfig> = {
  Low: {
    allocationPct: 1.00,
    stopLossPct: 0.03,
    rrRatio: 3.0,
    label: 'Low Risk',
    description: 'Conservative • 3% SL • 1:3 R:R',
  },
  Medium: {
    allocationPct: 1.00,
    stopLossPct: 0.06,
    rrRatio: 2.0,
    label: 'Moderate Risk',
    description: 'Balanced • 6% SL • 1:2 R:R',
  },
  High: {
    allocationPct: 1.00,
    stopLossPct: 0.10,
    rrRatio: 1.5,
    label: 'High Risk',
    description: 'Aggressive • 10% SL • 1:1.5 R:R',
  },
  Custom: {
    allocationPct: 1.00,
    stopLossPct: 0.06,
    rrRatio: 2.0,
    label: 'Custom Risk',
    description: 'Custom • Dynamic SL',
  },
};

export interface CalculationStep {
  stepNumber: number;
  title: string;
  formula: string;
  explanation: string;
  calculation: string;
  result: string;
}

export interface RiskPlanResult {
  currentPrice: number;
  budget: number;
  riskTolerance: RiskTolerance;
  allocationPct: number;
  stopLossPct: number;
  maxWholeShares: number;
  recommendedShares: number;
  capitalAllocated: number;
  unallocatedBuffer: number;
  capitalAllocatedPct: number;
  unallocatedBufferPct: number;
  plannedStopLossPrice: number;
  maxPlannedLoss: number;
  riskPerShare: number;
  isBudgetInsufficient: boolean;
  alertMessage: string | null;
  steps: CalculationStep[];
}

function formatINR(val: number): string {
  const rounded = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

function formatInt(val: number): string {
  const rounded = Number.isFinite(val) ? Math.floor(val) : 0;
  return new Intl.NumberFormat('en-IN').format(rounded);
}

/**
 * Normalizes input risk tolerance string to 'Low' | 'Medium' | 'High' | 'Custom'
 */
export function normalizeRiskTolerance(input: string): RiskTolerance {
  const lower = (input || '').toLowerCase();
  if (lower === 'low') return 'Low';
  if (lower === 'high') return 'High';
  if (lower === 'custom') return 'Custom';
  return 'Medium'; // default for medium, moderate
}

/**
 * Phase 4: Deterministic Position Sizing & Stop-Loss Engine
 *
 * Implements deterministic position sizing and planned stop-loss level
 * based strictly on whole-share limits and risk allocation constraints.
 */
export function calculateRiskPlan(
  currentPrice: number,
  budget: number,
  riskToleranceInput: RiskTolerance | 'low' | 'medium' | 'moderate' | 'high' | 'custom' = 'Medium',
  overrideStopLossPct?: number,
  _overrideAllocationPct?: number
): RiskPlanResult {
  const riskTolerance = normalizeRiskTolerance(riskToleranceInput);
  const config = RISK_ALLOCATION_CONFIGS[riskTolerance] || RISK_ALLOCATION_CONFIGS.Medium;

  // Determine effective stop-loss percentage (handles both 6 and 0.06 representation)
  let stopLossPct = config.stopLossPct;
  if (overrideStopLossPct != null && Number.isFinite(overrideStopLossPct) && overrideStopLossPct > 0) {
    stopLossPct = overrideStopLossPct > 1 ? Number((overrideStopLossPct / 100).toFixed(4)) : overrideStopLossPct;
  }

  // Treat "Total Budget" as "Trade Capital Allocation": Deploy as close to 100% of budget as possible into whole shares
  const allocationPct = 1.0;

  // Safe sanitization
  const safePrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0;
  const safeBudget = Number.isFinite(budget) && budget > 0 ? budget : 0;

  // Edge case checks
  const isBudgetLessThanPrice = safePrice > 0 && safeBudget > 0 && safeBudget < safePrice;
  const isZeroPriceOrBudget = safePrice <= 0 || safeBudget <= 0;

  let recommendedShares = 0;
  let alertMessage: string | null = null;

  if (isZeroPriceOrBudget) {
    if (safePrice <= 0) {
      alertMessage = 'Awaiting live stock price to calculate whole-share sizing and stop-loss levels.';
    } else {
      alertMessage = 'Enter budget to calculate allocation and risk limits.';
    }
  } else if (isBudgetLessThanPrice) {
    // Edge case: If budget < currentPrice, set recommendedShares = 0 and return an alert message
    recommendedShares = 0;
    alertMessage = `Whole share threshold not met: Total budget of ₹${formatINR(safeBudget)} is less than the current share price of ₹${formatINR(safePrice)}. Minimum ₹${formatINR(safePrice)} required to purchase 1 whole share.`;
  } else {
    // recommendedShares = Math.floor(budget / currentPrice)
    recommendedShares = Math.floor(safeBudget / safePrice);
  }

  const maxWholeShares = recommendedShares;

  // capitalAllocated = recommendedShares * currentPrice
  const capitalAllocated = Number((recommendedShares * safePrice).toFixed(2));

  // unallocatedBuffer = budget - capitalAllocated (fractional share remainder)
  const unallocatedBuffer = Number((safeBudget - capitalAllocated).toFixed(2));

  // plannedStopLossPrice = Number((currentPrice * (1 - stopLossPct)).toFixed(2))
  const plannedStopLossPrice = safePrice > 0 ? Number((safePrice * (1 - stopLossPct)).toFixed(2)) : 0;

  // maxPlannedLoss = Number((recommendedShares * (currentPrice - plannedStopLossPrice)).toFixed(2))
  const riskPerShare = safePrice > 0 ? Number((safePrice - plannedStopLossPrice).toFixed(2)) : 0;
  const maxPlannedLoss = Number((recommendedShares * riskPerShare).toFixed(2));

  const capitalAllocatedPct = safeBudget > 0 ? Number(((capitalAllocated / safeBudget) * 100).toFixed(1)) : 0;
  const unallocatedBufferPct = safeBudget > 0 ? Number(((unallocatedBuffer / safeBudget) * 100).toFixed(1)) : 0;
  const isBudgetInsufficient = isBudgetLessThanPrice || (safePrice > 0 && safeBudget > 0 && recommendedShares === 0);

  const slPctFormatted = (stopLossPct * 100) % 1 === 0
    ? (stopLossPct * 100).toFixed(0)
    : (stopLossPct * 100).toFixed(1);

  // Build transparent mathematical calculation methodology steps
  const steps: CalculationStep[] = [
    {
      stepNumber: 1,
      title: 'Risk Profile & Stop-Loss Setting',
      formula: `Planned Stop-Loss = ${slPctFormatted}% (Tight downside exit threshold)`,
      explanation: `Selected '${riskTolerance}' risk profile strictly enforces a ${slPctFormatted}% planned stop-loss threshold while deploying 100% of your trade budget into whole shares.`,
      calculation: `Risk Profile: ${riskTolerance} → Planned Stop-Loss = ${slPctFormatted}%, Capital Allocation = 100%`,
      result: `100% budget deployment / ${slPctFormatted}% stop-loss protection`,
    },
    {
      stepNumber: 2,
      title: 'Whole-Share Sizing Calculation',
      formula: 'recommendedShares = Math.floor(budget / currentPrice)',
      explanation: 'Deploys your budget into the maximum number of whole shares possible under Indian equity delivery rules (NSE/BSE do not permit fractional shares).',
      calculation: `Math.floor(₹${formatINR(safeBudget)} / ₹${formatINR(safePrice)})`,
      result: `${formatInt(recommendedShares)} whole shares`,
    },
    {
      stepNumber: 3,
      title: 'Capital Deployed & Uninvested Cash Remainder',
      formula: 'capitalAllocated = recommendedShares * currentPrice | unallocatedBuffer = budget - capitalAllocated',
      explanation: 'Evaluates capital deployed into full shares versus the small uninvested cash remainder due to whole-share pricing.',
      calculation: `${formatInt(recommendedShares)} × ₹${formatINR(safePrice)} = ₹${formatINR(capitalAllocated)} deployed | ₹${formatINR(safeBudget)} - ₹${formatINR(capitalAllocated)} = ₹${formatINR(unallocatedBuffer)} remainder`,
      result: `₹${formatINR(capitalAllocated)} deployed (${capitalAllocatedPct}%) + ₹${formatINR(unallocatedBuffer)} remainder (${unallocatedBufferPct}%)`,
    },
    {
      stepNumber: 4,
      title: 'Planned Stop-Loss Trigger Level',
      formula: 'plannedStopLossPrice = Number((currentPrice * (1 - stopLossPct)).toFixed(2))',
      explanation: `Calculates the protective price level at ${slPctFormatted}% below current market price where an exit order should be triggered.`,
      calculation: `₹${formatINR(safePrice)} × (1 - ${stopLossPct}) = ₹${formatINR(safePrice)} × ${(1 - stopLossPct).toFixed(4)}`,
      result: `₹${formatINR(plannedStopLossPrice)} (-${slPctFormatted}%)`,
    },
    {
      stepNumber: 5,
      title: 'Maximum Planned Rupee Loss at Risk',
      formula: 'maxPlannedLoss = Number((recommendedShares * (currentPrice - plannedStopLossPrice)).toFixed(2))',
      explanation: 'Quantifies your total worst-case capital loss if the trade triggers the planned stop-loss level, giving total visibility before order entry.',
      calculation: `${formatInt(recommendedShares)} shares × (₹${formatINR(safePrice)} - ₹${formatINR(plannedStopLossPrice)}) = ${formatInt(recommendedShares)} × ₹${formatINR(riskPerShare)}`,
      result: `₹${formatINR(maxPlannedLoss)}`,
    },
  ];

  return {
    currentPrice: safePrice,
    budget: safeBudget,
    riskTolerance,
    allocationPct,
    stopLossPct,
    maxWholeShares,
    recommendedShares,
    capitalAllocated,
    unallocatedBuffer,
    capitalAllocatedPct,
    unallocatedBufferPct,
    plannedStopLossPrice,
    maxPlannedLoss,
    riskPerShare,
    isBudgetInsufficient,
    alertMessage,
    steps,
  };
}
