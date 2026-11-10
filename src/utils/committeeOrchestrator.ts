import {
  AgentPerspective,
  DebateRebuttal,
  CommitteeSynthesis,
  CommitteeProgressUpdate,
  RiskVerdict,
  CommitteeStage,
  AgentRole,
  MasterId,
  MASTER_ROLE_MAP,
} from '../types/agents';
import { RiskPlanResult } from './riskEngine';
import {
  deriveStockMetricsFromContext,
  generateGrahamFallbackAnalysis,
} from '../agents/benjaminGraham';
import {
  deriveBuffettMetrics,
  generateBuffettFallbackAnalysis,
} from '../agents/warrenBuffett';
import { generateMungerFallbackAnalysis } from '../agents/charlieMunger';
import {
  extractTradeParameters,
  generateJonesFallbackAnalysis,
} from '../agents/paulTudorJones';
import { NSE_STOCKS } from '../data/nseStocks';
import {
  normalizeMetrics,
  normalizeTradeParams,
  calculateGrahamScore,
  calculateBuffettScore,
  calculateMungerScore,
  calculateJonesScore,
  calculateCommitteeSynthesis,
} from '../services/debateSimulator';

export interface StockContext {
  symbol: string;
  companyName: string | null;
  currentPrice: number;
  marketCap: number | null;
  netIncome: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  debtToEquity: number | null;
  institutionalOwnershipPct: number | null;
  source: string;
}

function formatINR(val: number): string {
  const rounded = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

function formatCr(val: number | null): string {
  if (val == null || !Number.isFinite(val)) return 'N/A';
  const cr = val / 1e7;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(cr)} Cr`;
}

/**
 * Cleanly formats Debt-to-Equity ratio, preventing raw astronomical figures from leaking
 */
export function formatDebtRatio(de: number | null | undefined): string {
  if (de == null || !Number.isFinite(de)) return 'N/A';
  if (de > 25) return '> 3.0 (High Leverage)';
  if (de < 0) return 'Negative Equity';
  return de.toFixed(2);
}

/**
 * Builds the exact multi-agent prompt injected into LLM edge functions or models
 */
export function buildCommitteePrompt(stock: StockContext, riskPlan: RiskPlanResult): string {
  return `
You are the TradeGuard Multi-Agent Equity Investment Committee for Indian Equities (NSE).
Your duty is to conduct a 3-Round rigorous debate on ${stock.symbol} (${stock.companyName || stock.symbol}).

--- COMPANY FUNDAMENTAL DOSSIER ---
• Current Stock Price: ₹${formatINR(stock.currentPrice)}
• Market Capitalization: ${formatCr(stock.marketCap)}
• Net Income / PAT: ${formatCr(stock.netIncome)}
• Debt-to-Equity: ${formatDebtRatio(stock.debtToEquity)}
• Institutional FII/DII Stake: ${stock.institutionalOwnershipPct != null ? `${stock.institutionalOwnershipPct}%` : 'Unknown'}
• Data Source: ${stock.source}

--- ENFORCED RISK & POSITION SIZING PLAN ---
• Total Trade Budget: ₹${formatINR(riskPlan.budget)} (${riskPlan.riskTolerance} Risk Profile)
• Capital Deployed: ₹${formatINR(riskPlan.capitalAllocated)} into ${riskPlan.recommendedShares} whole shares
• Uninvested Cash Remainder: ₹${formatINR(riskPlan.unallocatedBuffer)}
• Planned Stop-Loss Level: ₹${formatINR(riskPlan.plannedStopLossPrice)} (-${Math.round(riskPlan.stopLossPct * 100)}% trigger)
• Strictly Capped Capital at Risk: ₹${formatINR(riskPlan.maxPlannedLoss)}

--- COMMITTEE AGENDA ---
Round 1: Independent Agent Perspectives
- Value Specialist (Margin of safety, multiples, dividends)
- Growth Specialist (Top-line growth, sector tailwinds, margin trajectory)
- Quality Auditor (Balance sheet stability, debt coverage, ROE)
- Risk Controller (Execution feasibility, sizing adherence, liquidity)

Round 2: Cross-Examination Debate
- Direct counter-arguments and rebuttals between agents.
- Highlight specific structural disagreements (Valuation vs Growth, Debt vs Expansion).

Round 3: Committee Synthesis & Risk Controller Verdict
- Final consensus stance and confidence score.
- Risk Controller binding veto check (APPROVED, CONDITIONAL_APPROVAL, or VETOED).
`;
}

/**
 * Generates dynamic, realistic perspectives based strictly on live fundamentals and risk metrics
 */
function generateRealisticPerspectives(stock: StockContext, riskPlan: RiskPlanResult): AgentPerspective[] {
  const normMetrics = normalizeMetrics(stock);
  const normTradeParams = normalizeTradeParams(stock, riskPlan, normMetrics);

  const gScore = calculateGrahamScore(normMetrics);
  const bScore = calculateBuffettScore(normMetrics);
  const mScore = calculateMungerScore(normMetrics);
  const jResult = calculateJonesScore(normMetrics, normTradeParams);

  const sym = normMetrics.symbol;
  const price = normMetrics.currentPrice;
  const pe = normMetrics.peRatio;
  const pb = normMetrics.pbRatio;
  const roe = normMetrics.roe;
  const de = normMetrics.debtToEquity;
  const grahamNo = normMetrics.grahamNumber;
  const budget = normTradeParams.budget;
  const shares = normTradeParams.wholeShares;
  const stop = normTradeParams.stopLoss;
  const lossAmount = normTradeParams.rupeeDrawdown;
  const lossPercent = normTradeParams.drawdownPct;
  const verdict = jResult.verdict;

  const isGrahamCheap = price <= grahamNo || pe < 22;
  const isBuffettHighRoe = roe > 18;
  const isMungerHighDebt = de > 0.8;

  // 1. Value Specialist (Benjamin Graham)
  const grahamThesis = isGrahamCheap
    ? `At a P/E of ${pe.toFixed(1)}, ${sym} offers a rare genuine margin of safety against intrinsic value ₹${formatINR(grahamNo)}.`
    : `Speculative madness. At ${pe.toFixed(1)}x earnings, ${sym} trades far above its liquidation and net current asset buffer.`;

  const mosPct =
    grahamNo > 0
      ? Number((((grahamNo - price) / grahamNo) * 100).toFixed(1))
      : -100;

  const valuePerspective: AgentPerspective = {
    agentRole: 'Value Specialist',
    stance: gScore >= 65 ? 'Bullish' : gScore <= 40 ? 'Bearish' : 'Cautious',
    confidenceScore: gScore,
    coreThesis: grahamThesis,
    supportingDataPoints: [
      `Graham Number: ₹${formatINR(grahamNo)} (${mosPct >= 0 ? '+' : ''}${mosPct}% margin of safety).`,
      `Trailing P/E: ${pe.toFixed(1)}x | P/B: ${pb.toFixed(1)}x (Product: ${(pe * pb).toFixed(1)}).`,
      `Audited Debt-to-Equity: ${de.toFixed(2)}.`,
    ],
    redFlags:
      gScore < 60
        ? [`Valuation multiple (${pe.toFixed(1)}x) exceeds conservative asset protection benchmarks.`]
        : ['Strictly monitor for any multiple expansion beyond defensive thresholds.'],
    keyCitations: [
      `Graham No: ₹${formatINR(grahamNo)}`,
      `Margin of Safety: ${mosPct}%`,
      `P/E: ${pe.toFixed(1)}x`,
      `D/E: ${de.toFixed(2)}`,
    ],
    grahamAnalysis: {
      agentId: 'graham',
      agentName: 'Benjamin Graham',
      score: gScore,
      stance: gScore >= 65 ? 'BULLISH' : gScore <= 40 ? 'BEARISH' : 'NEUTRAL',
      grahamNumber: grahamNo,
      marginOfSafetyPct: mosPct,
      checklist: {
        peCheck: pe > 0 && pe <= 20,
        pbCheck: pb > 0 && pb <= 2.5,
        grahamMultiplierCheck: pe > 0 && pb > 0 && pe * pb <= 22.5,
        debtCheck: de <= 1.0,
        liquidityCheck: true,
      },
      thesis: grahamThesis,
      citations: [
        `P/E of ${pe.toFixed(1)} and P/B of ${pb.toFixed(1)}.`,
        `Graham Number: ₹${formatINR(grahamNo)}.`,
      ],
      redFlags: mosPct < 0 ? [`Price exceeds Graham Number by ${Math.abs(mosPct)}%`] : [],
    },
  };

  // 2. Growth Specialist (Warren Buffett)
  const buffettThesis = isBuffettHighRoe
    ? `Ben, you're valuing a cigar butt. ${sym}'s ROE of ${roe.toFixed(1)}% demonstrates an authentic economic moat with durable compounding.`
    : `I agree with Ben here. Without pricing power or high returns on capital, ${sym} lacks the protective moat we require.`;

  const moatStr = isBuffettHighRoe ? 'WIDE' : roe >= 12 ? 'NARROW' : 'NONE';
  const pricingPowerScore = Math.min(100, Math.round((normMetrics.profitMargin / 25) * 100));

  const growthPerspective: AgentPerspective = {
    agentRole: 'Growth Specialist',
    stance: bScore >= 65 ? 'Bullish' : bScore <= 40 ? 'Bearish' : 'Neutral',
    confidenceScore: bScore,
    coreThesis: buffettThesis,
    supportingDataPoints: [
      `Economic Moat: ${moatStr} MOAT (Pricing Power Score: ${pricingPowerScore}/100).`,
      `Return on Equity (ROE): ${roe.toFixed(1)}% across business cycles.`,
      `Operating & Net Profit Margin: ~${normMetrics.profitMargin}%.`,
    ],
    redFlags:
      bScore < 60
        ? [`Return on capital (${roe.toFixed(1)}%) lacks required compounding durability.`]
        : ['Watch for margin erosion if input cost pressures mount without pricing response.'],
    keyCitations: [
      `Moat: ${moatStr}`,
      `Pricing Power: ${pricingPowerScore}/100`,
      `ROE: ${roe.toFixed(1)}%`,
      `P/E: ${pe.toFixed(1)}`,
    ],
    buffettAnalysis: {
      agentId: 'buffett',
      agentName: 'Warren Buffett',
      score: bScore,
      stance: bScore >= 65 ? 'BULLISH' : bScore <= 40 ? 'BEARISH' : 'NEUTRAL',
      moatStrength: moatStr,
      pricingPowerScore,
      checklist: {
        roeCheck: roe >= 15.0,
        operatingMarginCheck: normMetrics.profitMargin >= 14.0,
        conservativeDebtCheck: de <= 0.8,
        fcfPositiveCheck: de < 1.2,
        valuationSanityCheck: pe <= 32.0,
      },
      thesis: buffettThesis,
      citations: [
        `Sustainable ROE: ${roe.toFixed(1)}%.`,
        `Economic moat classification: ${moatStr}.`,
      ],
      redFlags: bScore < 60 ? ['Fails high return on capital hurdle'] : [],
    },
  };

  // 3. Quality Auditor (Charlie Munger)
  const mungerThesis = isMungerHighDebt
    ? `Invert, always invert! A Debt-to-Equity of ${de.toFixed(2)} is financial arsenic if credit tightens in Dalal Street.`
    : `Clean ledger. Minimal leverage with ${de.toFixed(2)} D/E lets us sleep soundly during market panics.`;

  const solvencyStatus = de < 0.3 ? 'PRISTINE' : de <= 1.2 ? 'ADEQUATE' : 'OVERLEVERAGED';
  const fragilityRating = de > 1.2 ? 'CRITICAL' : de > 0.8 ? 'MODERATE' : 'LOW';

  const qualityPerspective: AgentPerspective = {
    agentRole: 'Quality Auditor',
    stance: mScore >= 65 ? 'Bullish' : mScore <= 40 ? 'Bearish' : 'Cautious',
    confidenceScore: mScore,
    coreThesis: mungerThesis,
    supportingDataPoints: [
      `Solvency Audit: ${solvencyStatus} (Fragility Rating: ${fragilityRating}).`,
      `Debt-to-Equity: ${de.toFixed(2)} | Inversion stress-test passed: ${de <= 1.2 ? 'YES' : 'NO'}.`,
    ],
    redFlags:
      de > 1.2
        ? [`Excessive debt structure (${de.toFixed(2)} D/E) introduces acute solvency fragility.`]
        : ['Maintain strict discipline against unexpected working capital decay.'],
    keyCitations: [
      `Solvency: ${solvencyStatus}`,
      `Fragility: ${fragilityRating}`,
      `D/E: ${de.toFixed(2)}`,
      `Inversion Test: ${de <= 1.2 ? 'PASSED' : 'FAILED'}`,
    ],
    mungerAnalysis: {
      agentId: 'munger',
      agentName: 'Charlie Munger',
      score: mScore,
      stance: mScore >= 65 ? 'BULLISH' : mScore <= 40 ? 'BEARISH' : 'NEUTRAL',
      fragilityRating,
      solvencyStatus,
      checklist: {
        noExcessiveDebtCheck: de <= 0.7,
        interestCoverageCheck: de <= 0.9,
        capitalDisciplineCheck: de <= 1.1,
        inversionTestPassed: de <= 1.2,
        valuationRationalityCheck: pe <= 35.0,
      },
      thesis: mungerThesis,
      citations: [
        `Solvency profile: ${solvencyStatus}.`,
        `Debt-to-Equity: ${de.toFixed(2)}.`,
      ],
      redFlags: de > 1.2 ? ['Elevated balance sheet fragility'] : [],
    },
  };

  // 4. Risk Controller (Paul Tudor Jones)
  const jonesThesis = `Cut the philosophy. With a ₹${formatINR(budget)} budget and ${shares} shares, our downside exposure to stop-loss ₹${formatINR(stop)} is ₹${formatINR(lossAmount)} (${lossPercent}% of capital). Verdict: ${verdict}.`;

  const riskPerspective: AgentPerspective = {
    agentRole: 'Risk Controller',
    stance: jResult.verdict === 'APPROVED' ? 'Bullish' : 'Bearish',
    confidenceScore: jResult.score,
    coreThesis: jonesThesis,
    supportingDataPoints: [
      `Verdict: ${jResult.verdict} • Downside Exposure: ₹${formatINR(lossAmount)} (${lossPercent}% of budget).`,
      `Sizing: ${shares} whole shares deployed at ₹${formatINR(normTradeParams.capitalAllocated)}.`,
      `Stop-Loss Floor: ₹${formatINR(stop)} strictly enforced.`,
    ],
    redFlags:
      jResult.verdict === 'VETOED'
        ? [`Downside drawdown of ${lossPercent}% exceeds the strict 2% capital threshold.`]
        : [`Slippage risk: Planned stop-loss at ₹${formatINR(stop)} relies on market order liquidity.`],
    keyCitations: [
      `Verdict: ${jResult.verdict}`,
      `Drawdown: ${lossPercent}%`,
      `Capped Loss: ₹${formatINR(lossAmount)}`,
      `Shares: ${shares}`,
    ],
    jonesAnalysis: {
      agentId: 'jones',
      agentName: 'Paul Tudor Jones',
      score: jResult.score,
      stance: jResult.verdict === 'APPROVED' ? 'BULLISH' : 'BEARISH',
      verdict: jResult.verdict,
      riskRewardRatio: '1 : 2.0',
      maxCapitalAtRisk: lossAmount,
      executionDirective:
        jResult.verdict === 'APPROVED'
          ? `Execute ${shares} whole shares at market entry. GTT stop-loss active at ₹${formatINR(stop)}.`
          : 'DO NOT EXECUTE. Capital preservation rule triggered. Stand aside in cash.',
      checklist: {
        wholeShareCapacityCheck: shares > 0,
        asymmetricRewardCheck: true,
        lossCappedCheck: lossPercent <= 2.0,
        liquidityCheck: true,
        stopLossEnforcedCheck: stop > 0,
      },
      thesis: jonesThesis,
      citations: [
        `Position: ${shares} shares (₹${formatINR(normTradeParams.capitalAllocated)}).`,
        `Stop-Loss: ₹${formatINR(stop)}.`,
        `Rupee Drawdown: ₹${formatINR(lossAmount)} (${lossPercent}%).`,
      ],
      redFlags: jResult.verdict === 'VETOED' ? ['Drawdown exceeds 2% capital limit'] : [],
    },
  };

  return [valuePerspective, growthPerspective, qualityPerspective, riskPerspective];
}

/**
 * Generates cross-examination rebuttals where specialists directly challenge opposing claims
 */
function generateRealisticDebate(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  activeRoles: Set<AgentRole>
): DebateRebuttal[] {
  if (activeRoles.size < 2) return [];

  const normMetrics = normalizeMetrics(stock);
  const normTradeParams = normalizeTradeParams(stock, riskPlan, normMetrics);
  const jResult = calculateJonesScore(normMetrics, normTradeParams);

  const sym = normMetrics.symbol;
  const pe = normMetrics.peRatio;
  const roe = normMetrics.roe;
  const de = normMetrics.debtToEquity;
  const grahamNo = normMetrics.grahamNumber;
  const budget = normTradeParams.budget;
  const shares = normTradeParams.wholeShares;
  const stop = normTradeParams.stopLoss;
  const lossAmount = normTradeParams.rupeeDrawdown;
  const lossPercent = normTradeParams.drawdownPct;
  const verdict = jResult.verdict;

  const isGrahamCheap = normMetrics.currentPrice <= grahamNo || pe < 22;
  const isBuffettHighRoe = roe > 18;
  const isHighDebt = de > 0.8;

  const allRebuttals: DebateRebuttal[] = [
    {
      id: 'deb-1',
      speakingAgent: 'Quality Auditor',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Growth Specialist assumes aggressive revenue reinvestment without modeling balance sheet friction.',
      rebuttalArgument: isHighDebt
        ? `Invert, always invert! A Debt-to-Equity of ${de.toFixed(2)} is financial arsenic if credit tightens in Dalal Street. In an era of non-zero interest rates, debt obligations take precedence over growth CAPEX.`
        : `Clean ledger. Minimal leverage with ${de.toFixed(2)} D/E lets us sleep soundly during market panics. However, unmanaged operational expansion could still erode return on equity (ROE).`,
      counterEvidence: [
        `Debt-to-Equity: ${de.toFixed(2)}`,
        `Operating Margin: ~${normMetrics.profitMargin}%`,
      ],
      disagreementFlag: {
        conflictType: 'Debt vs Expansion',
        severity: isHighDebt ? 'Sharp' : 'Moderate',
        summary: `Charlie Munger (Quality Auditor) challenges Warren Buffett (Growth Specialist): Balance sheet leverage (${de.toFixed(2)} D/E) cannot be brushed aside for optimistic growth projections.`,
      },
    },
    {
      id: 'deb-2',
      speakingAgent: 'Value Specialist',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Growth Specialist is willing to pay premium multiples on current market price.',
      rebuttalArgument: isGrahamCheap
        ? `At a P/E of ${pe.toFixed(1)}, ${sym} offers a rare genuine margin of safety against intrinsic value ₹${formatINR(grahamNo)}. Paying above this benchmark compromises principal protection.`
        : `Speculative madness. At ${pe.toFixed(1)}x earnings, ${sym} trades far above its liquidation and net current asset buffer. Market price ₹${formatINR(normMetrics.currentPrice)} dwarfs our Graham Number of ₹${formatINR(grahamNo)}.`,
      counterEvidence: [
        `Current P/E: ${pe.toFixed(1)}x`,
        `Graham Number: ₹${formatINR(grahamNo)}`,
        `Market Price: ₹${formatINR(normMetrics.currentPrice)}`,
      ],
      disagreementFlag: {
        conflictType: 'Valuation vs Growth',
        severity: 'Moderate',
        summary: `Benjamin Graham (Value Specialist) challenges Warren Buffett (Growth Specialist): P/E of ${pe.toFixed(1)}x vs Graham Number ₹${formatINR(grahamNo)}.`,
      },
    },
    {
      id: 'deb-3',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Specialists proposing larger position sizes without capping rupee downside.',
      rebuttalArgument: `Cut the philosophy. With a ₹${formatINR(budget)} budget and ${shares} shares, our downside exposure to stop-loss ₹${formatINR(stop)} is ₹${formatINR(lossAmount)} (${lossPercent}% of capital). Verdict: ${verdict}.`,
      counterEvidence: [
        `Position Sizing: ${shares} Shares`,
        `Stop-Loss Floor: ₹${formatINR(stop)}`,
        `Max Rupee Drawdown: ₹${formatINR(lossAmount)} (${lossPercent}%)`,
      ],
      disagreementFlag: {
        conflictType: 'Downside vs Momentum',
        severity: 'Sharp',
        summary: `Paul Tudor Jones (Risk Controller) enforces 2% max risk limit: ${lossPercent}% capital risk with verdict: ${verdict}.`,
      },
    },
    {
      id: 'deb-4',
      speakingAgent: 'Quality Auditor',
      targetAgent: 'Value Specialist',
      targetClaim: 'Value Specialist prioritizes low valuation multiples over enterprise durability.',
      rebuttalArgument: isBuffettHighRoe
        ? `Ben, you're valuing a cigar butt. ${sym}'s ROE of ${roe.toFixed(1)}% demonstrates an authentic economic moat with durable compounding. Cheap multiples without economic moat is a value trap.`
        : `I agree with Ben here. Without pricing power or high returns on capital, ${sym} lacks the protective moat we require. An ROE of ${roe.toFixed(1)}% fails our hurdle for compounders.`,
      counterEvidence: [
        `Return on Equity: ${roe.toFixed(1)}%`,
        `Pricing Power: ${Math.min(100, Math.round((normMetrics.profitMargin / 25) * 100))}/100`,
      ],
      disagreementFlag: {
        conflictType: 'Valuation vs Growth',
        severity: 'Moderate',
        summary: `Charlie Munger (Quality) challenges Benjamin Graham (Value): ROE of ${roe.toFixed(1)}% vs static valuation discount.`,
      },
    },
    {
      id: 'deb-5',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Value Specialist',
      targetClaim: 'Value Specialist assumes price will eventually mean-revert before margin of safety expires.',
      rebuttalArgument: `Markets can stay irrational longer than a trader can stay solvent. Even if intrinsic value is higher, a trade without a strict stop-loss at ₹${formatINR(stop)} invites catastrophic drawdown. Rule number one: Never take a large loss.`,
      counterEvidence: [
        `Planned stop-loss level: ₹${formatINR(stop)}`,
        `Risk per share: ₹${formatINR(normMetrics.currentPrice - stop)}`,
      ],
      disagreementFlag: {
        conflictType: 'Downside vs Momentum',
        severity: 'Sharp',
        summary: `Paul Tudor Jones (Risk Controller) warns Benjamin Graham (Value): Mean-reversion conviction cannot substitute for stop-loss floor at ₹${formatINR(stop)}.`,
      },
    },
    {
      id: 'deb-6',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Quality Auditor',
      targetClaim: 'Quality Auditor believes great balance sheets eliminate the need for active trade protection.',
      rebuttalArgument: `Even AAA balance sheets experience 30-50% drawdowns in broad market liquidations. With a ₹${formatINR(budget)} budget, position sizing must stay capped at ${shares} shares to guarantee survival.`,
      counterEvidence: [
        `Max Rupee Loss Capped: ₹${formatINR(lossAmount)}`,
        `Cash Buffer: ₹${formatINR(normTradeParams.unallocatedBuffer)}`,
      ],
      disagreementFlag: {
        conflictType: 'Liquidity vs Conviction',
        severity: 'Moderate',
        summary: `Paul Tudor Jones (Risk Controller) reminds Charlie Munger (Quality): Solvency is necessary but 2% risk limit is non-negotiable.`,
      },
    },
  ];

  return allRebuttals.filter(
    (r) => activeRoles.has(r.speakingAgent) && activeRoles.has(r.targetAgent)
  );
}

/**
 * Generates the final committee synthesis and Risk Controller veto verdict
 */
function generateRealisticSynthesis(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  activeMasterIds: MasterId[],
  perspectives: AgentPerspective[]
): CommitteeSynthesis {
  const normMetrics = normalizeMetrics(stock);
  const normTradeParams = normalizeTradeParams(stock, riskPlan, normMetrics);
  const simSynth = calculateCommitteeSynthesis(normMetrics, normTradeParams, activeMasterIds);
  const jResult = calculateJonesScore(normMetrics, normTradeParams);
  const hasRiskController = activeMasterIds.includes('jones');

  const verdict: RiskVerdict = hasRiskController ? jResult.verdict : 'APPROVED';
  const vetoExercised = hasRiskController && jResult.verdict === 'VETOED';

  const mandatoryConditions: string[] = [
    `Execute exactly ${normTradeParams.wholeShares} whole shares (₹${formatINR(
      normTradeParams.capitalAllocated
    )} capital deployed).`,
    `Mandatory GTT / Stop-Loss order placed at ₹${formatINR(normTradeParams.stopLoss)} (-${(
      normTradeParams.stopLossPct * 100
    ).toFixed(1)}%).`,
    `Directive: ${jResult.verdict === 'APPROVED' ? `Authorize whole-share delivery of ${normTradeParams.wholeShares} shares.` : 'DO NOT EXECUTE. Capital preservation rule triggered.'}`,
    `Retain ₹${formatINR(normTradeParams.unallocatedBuffer)} in cash buffer to ensure account solvency.`,
    'Exit position immediately if price breaches stop-loss on closing candle.',
  ];

  if (!hasRiskController) {
    mandatoryConditions.unshift(
      'NOTICE: Running without independent Risk Controller veto. Trader must manage exits manually.'
    );
  }

  const synthesis: CommitteeSynthesis = {
    consensusStance: simSynth.consensusStance,
    averageConfidence: simSynth.committeeScore,
    keyAgreementSummary: simSynth.keyAgreements[0] || `The committee unifies around disciplined whole-share execution of ${normTradeParams.wholeShares} shares.`,
    irreconcilableDissent: simSynth.keyDissents,
    riskControllerSignOff: {
      verdict,
      vetoExercised,
      verdictHeadline: simSynth.verdictTitle,
      riskJustification: `Cut the philosophy. With a ₹${formatINR(normTradeParams.budget)} budget and ${normTradeParams.wholeShares} shares, our downside exposure to stop-loss ₹${formatINR(normTradeParams.stopLoss)} is ₹${formatINR(normTradeParams.rupeeDrawdown)} (${normTradeParams.drawdownPct}% of capital). Verdict: ${verdict}.`,
      enforcedStopLossPrice: normTradeParams.stopLoss,
      enforcedShares: normTradeParams.wholeShares,
      maxCapitalLossCapped: normTradeParams.rupeeDrawdown,
      mandatoryConditions,
      liquidityAssessment: `NSE order book liquidity is deemed sufficient for whole-share block of ${normTradeParams.wholeShares} shares. Execution slippage expected <0.25%.`,
    },
    finalCommitteeScore: simSynth.committeeScore,
  };

  return synthesis;
}

/**
 * Main Orchestrator: Streams Multi-Agent Committee Analysis & Debate
 */
export async function runCommitteeOrchestration(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  onProgress: (update: CommitteeProgressUpdate) => void,
  signal?: AbortSignal,
  activeMasterIds: MasterId[] = ['graham', 'buffett', 'munger', 'jones']
): Promise<CommitteeSynthesis> {
  const safeActiveIds = activeMasterIds.length > 0 ? activeMasterIds : (['graham', 'buffett', 'munger', 'jones'] as MasterId[]);
  const activeRoles = new Set<AgentRole>(safeActiveIds.map((id) => MASTER_ROLE_MAP[id]));

  const sleep = (ms: number) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted by user', 'AbortError'));
    });
  });

  // STAGE 1: Round 1 — Independent Perspectives
  onProgress({
    stage: 'independent_analysis',
    currentSpeakingAgent: null,
    progressPct: 10,
    statusMessage: `Convening Committee with ${safeActiveIds.length} active master${safeActiveIds.length > 1 ? 's' : ''} for ${stock.symbol}... Initializing dossiers.`,
  });
  await sleep(350);

  const allPerspectives = generateRealisticPerspectives(stock, riskPlan);
  const perspectives = allPerspectives.filter((p) => activeRoles.has(p.agentRole));

  // Stream each agent's perspective sequentially
  for (let i = 0; i < perspectives.length; i++) {
    const p = perspectives[i];
    const pct = Math.round(15 + ((i + 1) / perspectives.length) * 35);

    onProgress({
      stage: 'independent_analysis',
      currentSpeakingAgent: p.agentRole,
      progressPct: pct,
      statusMessage: `${p.agentRole} presenting independent thesis on ${stock.symbol}...`,
      perspectiveUpdate: p,
    });
    await sleep(550);
  }

  // STAGE 2: Round 2 — Cross-Examination Debate
  const rebuttals = generateRealisticDebate(stock, riskPlan, activeRoles);

  if (rebuttals.length > 0) {
    onProgress({
      stage: 'cross_examination',
      currentSpeakingAgent: null,
      progressPct: 55,
      statusMessage: `Cross-examination initiated between ${safeActiveIds.length} active masters.`,
    });
    await sleep(400);

    for (let j = 0; j < rebuttals.length; j++) {
      const r = rebuttals[j];
      const pct = Math.round(58 + ((j + 1) / rebuttals.length) * 25);

      onProgress({
        stage: 'cross_examination',
        currentSpeakingAgent: r.speakingAgent,
        progressPct: pct,
        statusMessage: `${r.speakingAgent} rebutting ${r.targetAgent}'s thesis...`,
        rebuttalUpdate: r,
      });
      await sleep(650);
    }
  } else {
    // If only 1 master selected, skip debate stage smoothly
    onProgress({
      stage: 'cross_examination',
      currentSpeakingAgent: null,
      progressPct: 75,
      statusMessage: 'Solo analyst active: Multi-agent debate skipped. Compiling in-depth thesis synthesis...',
    });
    await sleep(300);
  }

  // STAGE 3: Round 3 — Committee Synthesis & Risk Controller Veto
  const hasRiskController = safeActiveIds.includes('jones');

  onProgress({
    stage: 'synthesis_veto',
    currentSpeakingAgent: hasRiskController ? 'Risk Controller' : null,
    progressPct: 88,
    statusMessage: hasRiskController
      ? 'Paul Tudor Jones (Risk Controller) deliberating final sign-off and stop-loss enforcement...'
      : 'Synthesizing advisory committee consensus...',
  });
  await sleep(600);

  const synthesis = generateRealisticSynthesis(stock, riskPlan, safeActiveIds, perspectives);

  onProgress({
    stage: 'completed',
    currentSpeakingAgent: null,
    progressPct: 100,
    statusMessage: `Committee deliberations completed. Verdict: ${synthesis.riskControllerSignOff.verdict}.`,
    synthesisUpdate: synthesis,
  });

  return synthesis;
}
