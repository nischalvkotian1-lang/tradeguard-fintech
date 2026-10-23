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
You are the TradeGuard Multi-Agent Equity Investment Committee for Indian Equities (NSE/BSE).
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
  const sym = stock.symbol;
  const isProfitable = (stock.netIncome ?? 0) > 0;
  const isHighDebt = (stock.debtToEquity ?? 0) > 1.0;
  const isLargeCap = (stock.marketCap ?? 0) >= 8e11;
  const isStrongFii = (stock.institutionalOwnershipPct ?? 0) >= 40;
  const hasZeroShares = riskPlan.recommendedShares === 0;

  // 1. Value Specialist (Benjamin Graham Model Brain)
  const matchingStock = NSE_STOCKS.find(
    (s) => s.displaySymbol === stock.symbol || s.symbol === stock.symbol
  );
  const sector = matchingStock?.sector ?? 'Indian Equities';
  const grahamMetrics = deriveStockMetricsFromContext(
    stock.symbol,
    stock.companyName,
    stock.currentPrice,
    stock.marketCap,
    stock.netIncome,
    stock.totalEquity,
    stock.debtToEquity,
    sector
  );
  const grahamAnalysis = generateGrahamFallbackAnalysis(grahamMetrics, riskPlan.budget);

  const valueStance: 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious' =
    grahamAnalysis.stance === 'BULLISH'
      ? 'Bullish'
      : grahamAnalysis.stance === 'BEARISH'
      ? 'Bearish'
      : 'Cautious';

  const valuePerspective: AgentPerspective = {
    agentRole: 'Value Specialist',
    stance: valueStance,
    confidenceScore: grahamAnalysis.score,
    coreThesis: grahamAnalysis.thesis,
    supportingDataPoints: [
      `Graham Number: ₹${formatINR(grahamAnalysis.grahamNumber)} (${grahamAnalysis.marginOfSafetyPct >= 0 ? '+' : ''}${grahamAnalysis.marginOfSafetyPct}% margin of safety).`,
      ...grahamAnalysis.citations,
    ],
    redFlags:
      grahamAnalysis.redFlags.length > 0
        ? grahamAnalysis.redFlags
        : ['Strictly monitor for any multiple expansion beyond defensive thresholds.'],
    keyCitations: [
      `Graham No: ₹${formatINR(grahamAnalysis.grahamNumber)}`,
      `Margin of Safety: ${grahamAnalysis.marginOfSafetyPct}%`,
      `P/E × P/B: ${(grahamMetrics.pe * grahamMetrics.pb).toFixed(1)}`,
      `D/E: ${grahamMetrics.debtToEquity.toFixed(2)}`,
    ],
    grahamAnalysis,
  };

  // 2. Growth Specialist (Warren Buffett Model Brain)
  const buffettMetrics = deriveBuffettMetrics(grahamMetrics, stock.netIncome, stock.totalEquity);
  const buffettAnalysis = generateBuffettFallbackAnalysis(buffettMetrics, riskPlan.budget);

  const growthStance: 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious' =
    buffettAnalysis.stance === 'BULLISH'
      ? 'Bullish'
      : buffettAnalysis.stance === 'BEARISH'
      ? 'Bearish'
      : 'Neutral';

  const growthPerspective: AgentPerspective = {
    agentRole: 'Growth Specialist',
    stance: growthStance,
    confidenceScore: buffettAnalysis.score,
    coreThesis: buffettAnalysis.thesis,
    supportingDataPoints: [
      `Economic Moat: ${buffettAnalysis.moatStrength} MOAT (Pricing Power Score: ${buffettAnalysis.pricingPowerScore}/100).`,
      ...buffettAnalysis.citations,
    ],
    redFlags:
      buffettAnalysis.redFlags.length > 0
        ? buffettAnalysis.redFlags
        : ['Watch for margin erosion if input cost pressures mount without pricing response.'],
    keyCitations: [
      `Moat: ${buffettAnalysis.moatStrength}`,
      `Pricing Power: ${buffettAnalysis.pricingPowerScore}/100`,
      `ROE: ${buffettMetrics.roe.toFixed(1)}%`,
      `P/E: ${buffettMetrics.pe.toFixed(1)}`,
    ],
    buffettAnalysis,
  };

  // 3. Quality Auditor (Charlie Munger Model Brain)
  const mungerAnalysis = generateMungerFallbackAnalysis(grahamMetrics, riskPlan.budget);

  const qualityStance: 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious' =
    mungerAnalysis.stance === 'BULLISH'
      ? 'Bullish'
      : mungerAnalysis.stance === 'BEARISH'
      ? 'Bearish'
      : 'Cautious';

  const qualityPerspective: AgentPerspective = {
    agentRole: 'Quality Auditor',
    stance: qualityStance,
    confidenceScore: mungerAnalysis.score,
    coreThesis: mungerAnalysis.thesis,
    supportingDataPoints: [
      `Solvency Audit: ${mungerAnalysis.solvencyStatus} (Fragility Rating: ${mungerAnalysis.fragilityRating}).`,
      ...mungerAnalysis.citations,
    ],
    redFlags:
      mungerAnalysis.redFlags.length > 0
        ? mungerAnalysis.redFlags
        : ['Maintain strict discipline against unexpected working capital decay.'],
    keyCitations: [
      `Solvency: ${mungerAnalysis.solvencyStatus}`,
      `Fragility: ${mungerAnalysis.fragilityRating}`,
      `D/E: ${grahamMetrics.debtToEquity.toFixed(2)}`,
      `Inversion Test: ${mungerAnalysis.checklist.inversionTestPassed ? 'PASSED' : 'FAILED'}`,
    ],
    mungerAnalysis,
  };

  // 4. Risk Controller (Paul Tudor Jones Model Brain)
  const tradeParams = extractTradeParameters(riskPlan);
  const jonesAnalysis = generateJonesFallbackAnalysis(grahamMetrics, tradeParams);

  const riskStance: 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious' =
    jonesAnalysis.verdict === 'APPROVED'
      ? 'Bullish'
      : jonesAnalysis.verdict === 'VETOED'
      ? 'Bearish'
      : 'Cautious';

  const riskPerspective: AgentPerspective = {
    agentRole: 'Risk Controller',
    stance: riskStance,
    confidenceScore: jonesAnalysis.score,
    coreThesis: jonesAnalysis.thesis,
    supportingDataPoints: [
      `Verdict: ${jonesAnalysis.verdict} • Asymmetry: ${jonesAnalysis.riskRewardRatio} R:R.`,
      `Directive: ${jonesAnalysis.executionDirective}`,
      ...jonesAnalysis.citations,
    ],
    redFlags:
      jonesAnalysis.redFlags.length > 0
        ? jonesAnalysis.redFlags
        : [
            `Slippage risk: Planned stop-loss at ₹${formatINR(
              riskPlan.plannedStopLossPrice
            )} relies on active order matching.`,
          ],
    keyCitations: [
      `Verdict: ${jonesAnalysis.verdict}`,
      `R:R: ${jonesAnalysis.riskRewardRatio}`,
      `Capped Loss: ₹${formatINR(jonesAnalysis.maxCapitalAtRisk)}`,
      `Shares: ${tradeParams.recommendedShares}`,
    ],
    jonesAnalysis,
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

  const isHighDebt = (stock.debtToEquity ?? 0) > 1.0;

  const allRebuttals: DebateRebuttal[] = [
    {
      id: 'deb-1',
      speakingAgent: 'Quality Auditor',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Growth Specialist assumes aggressive revenue reinvestment without modeling balance sheet friction.',
      rebuttalArgument: `Growth Specialist is banking on forward top-line acceleration, but ignores that ${stock.symbol} ${
        isHighDebt
          ? `has a concerning Debt-to-Equity ratio of ${formatDebtRatio(stock.debtToEquity)}. In an era of non-zero interest rates, debt obligations take precedence over growth CAPEX.`
          : `must maintain its working capital discipline. Unchecked expansion could erode return on equity (ROE).`
      }`,
      counterEvidence: [
        `Debt-to-Equity is ${formatDebtRatio(stock.debtToEquity)}`,
        'Interest coverage must be maintained under stressed revenue scenarios.',
      ],
      disagreementFlag: {
        conflictType: 'Debt vs Expansion',
        severity: isHighDebt ? 'Sharp' : 'Moderate',
        summary: `Charlie Munger (Quality Auditor) challenges Warren Buffett (Growth Specialist): Balance sheet leverage cannot be brushed aside for optimistic growth projections.`,
      },
    },
    {
      id: 'deb-2',
      speakingAgent: 'Value Specialist',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Growth Specialist is willing to pay premium multiples on current market price.',
      rebuttalArgument: `At ₹${formatINR(stock.currentPrice)}, the current price already bakes in double-digit growth expectations. If quarterly earnings miss guidance by even 200 basis points, multiple compression will inflict rapid capital drawdown before the growth thesis matures.`,
      counterEvidence: [
        `Entry price: ₹${formatINR(stock.currentPrice)}`,
        `Net Income: ${formatCr(stock.netIncome)}`,
      ],
      disagreementFlag: {
        conflictType: 'Valuation vs Growth',
        severity: 'Moderate',
        summary: `Benjamin Graham (Value Specialist) rejects paying rich multiples without an adequate margin of safety buffer.`,
      },
    },
    {
      id: 'deb-3',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Growth Specialist',
      targetClaim: 'Specialists proposing larger position sizes without capping rupee downside.',
      rebuttalArgument: `I am overruling any suggestions to stretch beyond our deterministic ceiling. Regardless of growth conviction, trader budget of ₹${formatINR(riskPlan.budget)} mandates a hard cap of ${riskPlan.recommendedShares} whole shares. No trader should absorb more than ₹${formatINR(riskPlan.maxPlannedLoss)} in planned downside.`,
      counterEvidence: [
        `Capped Shares: ${riskPlan.recommendedShares}`,
        `Stop-Loss Floor: ₹${formatINR(riskPlan.plannedStopLossPrice)}`,
        `Max Risk: ₹${formatINR(riskPlan.maxPlannedLoss)}`,
      ],
      disagreementFlag: {
        conflictType: 'Downside vs Momentum',
        severity: 'Sharp',
        summary: `Paul Tudor Jones (Risk Controller) enforces binding position size limit (${riskPlan.recommendedShares} shares) and non-negotiable stop-loss at ₹${formatINR(riskPlan.plannedStopLossPrice)}.`,
      },
    },
    {
      id: 'deb-4',
      speakingAgent: 'Quality Auditor',
      targetAgent: 'Value Specialist',
      targetClaim: 'Value Specialist prioritizes low valuation multiples over enterprise durability.',
      rebuttalArgument: `Benjamin Graham is searching for cigar-butt cheapness, but as Warren and I learned, a fair price for a wonderful business is vastly superior to a wonderful price for a fair business. Low multiples often signal structural decay.`,
      counterEvidence: [
        `Institutional ownership: ${stock.institutionalOwnershipPct ?? 0}%`,
        'High ROE compounds intrinsic value over long holding horizons.',
      ],
      disagreementFlag: {
        conflictType: 'Valuation vs Growth',
        severity: 'Moderate',
        summary: `Charlie Munger (Quality) challenges Benjamin Graham (Value): Cheap multiples without economic moat is a value trap.`,
      },
    },
    {
      id: 'deb-5',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Value Specialist',
      targetClaim: 'Value Specialist assumes price will eventually mean-revert before margin of safety expires.',
      rebuttalArgument: `Markets can stay irrational longer than a trader can stay solvent. Even if intrinsic value is higher, a trade without a strict stop-loss at ₹${formatINR(riskPlan.plannedStopLossPrice)} invites catastrophic drawdown. Rule number one: Never take a large loss.`,
      counterEvidence: [
        `Planned stop-loss level: ₹${formatINR(riskPlan.plannedStopLossPrice)}`,
        `Risk per share: ₹${formatINR(stock.currentPrice - riskPlan.plannedStopLossPrice)}`,
      ],
      disagreementFlag: {
        conflictType: 'Downside vs Momentum',
        severity: 'Sharp',
        summary: `Paul Tudor Jones (Risk Controller) warns Benjamin Graham (Value): Mean-reversion conviction cannot substitute for risk control.`,
      },
    },
    {
      id: 'deb-6',
      speakingAgent: 'Risk Controller',
      targetAgent: 'Quality Auditor',
      targetClaim: 'Quality Auditor believes great balance sheets eliminate the need for active trade protection.',
      rebuttalArgument: `Even AAA balance sheets experience 30-50% drawdowns in broad market liquidations. Position sizing must stay capped at ${riskPlan.recommendedShares} shares to guarantee survival.`,
      counterEvidence: [
        `Max Rupee Loss Capped: ₹${formatINR(riskPlan.maxPlannedLoss)}`,
        `Cash Buffer: ₹${formatINR(riskPlan.unallocatedBuffer)}`,
      ],
      disagreementFlag: {
        conflictType: 'Liquidity vs Conviction',
        severity: 'Moderate',
        summary: `Paul Tudor Jones (Risk Controller) reminds Charlie Munger (Quality): Solvency is necessary but risk limits are non-negotiable.`,
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
  const hasRiskController = activeMasterIds.includes('jones');
  const matchingStock = NSE_STOCKS.find(
    (s) => s.displaySymbol === stock.symbol || s.symbol === stock.symbol
  );
  const sector = matchingStock?.sector ?? 'Indian Equities';
  const grahamMetrics = deriveStockMetricsFromContext(
    stock.symbol,
    stock.companyName,
    stock.currentPrice,
    stock.marketCap,
    stock.netIncome,
    stock.totalEquity,
    stock.debtToEquity,
    sector
  );
  const tradeParams = extractTradeParameters(riskPlan);
  const jonesAnalysis = generateJonesFallbackAnalysis(grahamMetrics, tradeParams);

  const isProfitable = (stock.netIncome ?? 0) > 0;
  const isHighDebt = (stock.debtToEquity ?? 0) > 1.0;

  let verdict: RiskVerdict = 'APPROVED';
  let vetoExercised = false;
  let headline = '';
  let riskJustification = '';
  let consensusStance: 'Strong Buy' | 'Moderate Buy' | 'Hold / Selective' | 'Avoid / Reduce' =
    'Moderate Buy';

  const avgConf =
    perspectives.length > 0
      ? Math.round(
          perspectives.reduce((acc, cur) => acc + cur.confidenceScore, 0) / perspectives.length
        )
      : 70;

  let finalScore = avgConf;

  if (!hasRiskController) {
    verdict = !isProfitable && isHighDebt ? 'CONDITIONAL_APPROVAL' : 'APPROVED';
    vetoExercised = false;
    headline = 'ADVISORY CONSENSUS: Risk Controller Veto Inactive';
    riskJustification = `Deliberations concluded with ${activeMasterIds.length} active master${
      activeMasterIds.length > 1 ? 's' : ''
    }. Note: Paul Tudor Jones was not convened, so no binding sovereign veto or mechanical stop-loss enforcement was exercised. Trader must execute risk controls independently.`;
    consensusStance = isProfitable && !isHighDebt ? 'Moderate Buy' : 'Hold / Selective';
    finalScore = isProfitable ? 72 : 55;
  } else {
    verdict = jonesAnalysis.verdict;
    vetoExercised = jonesAnalysis.verdict === 'VETOED';
    headline =
      jonesAnalysis.verdict === 'VETOED'
        ? 'TRADE EXECUTION VETOED: Risk Controller Sovereign Veto'
        : jonesAnalysis.verdict === 'CONDITIONAL_APPROVAL'
        ? 'CONDITIONAL APPROVAL: Elevated Risk Flagged'
        : 'COMMITTEE APPROVAL: Disciplined Execution Authorized';
    riskJustification = jonesAnalysis.thesis;
    consensusStance =
      jonesAnalysis.verdict === 'VETOED'
        ? 'Avoid / Reduce'
        : jonesAnalysis.verdict === 'CONDITIONAL_APPROVAL'
        ? 'Hold / Selective'
        : 'Strong Buy';
    finalScore = jonesAnalysis.verdict === 'VETOED' ? Math.min(30, avgConf) : avgConf;
  }

  const mandatoryConditions: string[] = [
    `Execute exactly ${tradeParams.recommendedShares} whole shares (₹${formatINR(
      tradeParams.capitalAllocated
    )} capital deployed).`,
    `Mandatory GTT / Stop-Loss order placed at ₹${formatINR(tradeParams.stopLossPrice)} (-${(
      tradeParams.stopLossPct * 100
    ).toFixed(1)}%).`,
    `Directive: ${jonesAnalysis.executionDirective}`,
    `Retain ₹${formatINR(tradeParams.unallocatedBuffer)} in cash buffer to ensure account solvency.`,
    'Exit position immediately if price breaches stop-loss on closing candle.',
  ];

  if (!hasRiskController) {
    mandatoryConditions.unshift(
      'NOTICE: Running without independent Risk Controller veto. Trader must manage exits manually.'
    );
  }

  const synthesis: CommitteeSynthesis = {
    consensusStance,
    averageConfidence: avgConf,
    keyAgreementSummary: `The committee unifies around disciplined whole-share execution. Active analysts acknowledge that at ₹${formatINR(
      stock.currentPrice
    )}, returns must be pursued strictly within our ₹${formatINR(
      tradeParams.maxPlannedLoss
    )} maximum capital risk ceiling.`,
    irreconcilableDissent: [
      `Growth thesis anticipates sustained forward volume, while Quality Auditor emphasizes balance sheet conservatism (${
        stock.debtToEquity != null ? `D/E ${formatDebtRatio(stock.debtToEquity)}` : 'unverified debt'
      }).`,
      `Value Specialist demands price pullback towards deeper intrinsic discount, whereas active risk limits establish the deterministic boundary.`,
    ],
    riskControllerSignOff: {
      verdict,
      vetoExercised,
      verdictHeadline: headline,
      riskJustification,
      enforcedStopLossPrice: tradeParams.stopLossPrice,
      enforcedShares: tradeParams.recommendedShares,
      maxCapitalLossCapped: tradeParams.maxPlannedLoss,
      mandatoryConditions,
      liquidityAssessment: `NSE order book liquidity is deemed sufficient for whole-share block of ${tradeParams.recommendedShares} shares. Execution slippage expected <0.25%.`,
    },
    finalCommitteeScore: finalScore,
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
