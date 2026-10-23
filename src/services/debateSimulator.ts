import { StockContext } from '../utils/committeeOrchestrator';
import { RiskPlanResult } from '../utils/riskEngine';
import { MasterId } from '../types/agents';
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

export type DebateMode = 'quick' | 'detailed';

export interface DebateMessage {
  id: string;
  speakerId: 'graham' | 'buffett' | 'munger' | 'jones';
  speakerName: string;
  avatarUrl: string;
  role: string;
  borderColor: string;
  badgeBg: string;
  text: string;
  targetSpeakerName?: string;
  sentiment: 'CHALLENGE' | 'DEFENSE' | 'AGREEMENT' | 'RULING';
  timestamp: string;
  round?: number;
  roundTitle?: string;
  quoteSnippet?: string;
  keyMetrics?: { label: string; value: string }[];
}

export interface CommitteeSynthesis {
  committeeScore: number;
  consensusStance: 'STRONG BUY' | 'CAUTIOUS BUY' | 'NEUTRAL' | 'AVOID';
  verdictTitle: string;
  verdictDetails: string;
  keyAgreements: string[];
  keyDissents: string[];
}

export interface MasterProfile {
  id: MasterId;
  name: string;
  role: string;
  avatarUrl: string;
  borderColor: string;
  badgeBg: string;
}

export const MASTER_PROFILES: Record<MasterId, MasterProfile> = {
  graham: {
    id: 'graham',
    name: 'Benjamin Graham',
    role: 'Value Specialist',
    avatarUrl: '/avatars/graham.png',
    borderColor: 'border-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
  },
  buffett: {
    id: 'buffett',
    name: 'Warren Buffett',
    role: 'Growth Specialist',
    avatarUrl: '/avatars/buffet.png',
    borderColor: 'border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400',
  },
  munger: {
    id: 'munger',
    name: 'Charlie Munger',
    role: 'Quality Auditor',
    avatarUrl: '/avatars/munger.png',
    borderColor: 'border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400',
  },
  jones: {
    id: 'jones',
    name: 'Paul Tudor Jones',
    role: 'Risk Controller',
    avatarUrl: '/avatars/jones.png',
    borderColor: 'border-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400',
  },
};

export interface DebateStreamStatus {
  mode: DebateMode;
  currentTurn: number;
  totalTurns: number;
  round: number;
  totalRounds: number;
  roundTitle: string;
  speakerId: MasterId | null;
  speakerName: string;
  speakerStatus: string;
  elapsedSec: number;
  totalEstSec: number;
  isPaused: boolean;
}

export interface DebateStreamControls {
  pause: () => void;
  resume: () => void;
  fastForward: () => void;
  stop: () => void;
  isPaused: () => boolean;
}

function formatINR(val: number): string {
  const rounded = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Generates the full transcript and synthesis of a multi-turn deliberation.
 * Supports both 'quick' mode (~4-6 turns) and 'detailed' mode (8-12 turns across 3 rounds).
 */
export function generateDebateTranscript(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  activeMasterIds: MasterId[] = ['graham', 'buffett', 'munger', 'jones'],
  mode: DebateMode = 'quick'
): { messages: DebateMessage[]; synthesis: CommitteeSynthesis } {
  const safeActiveIds =
    activeMasterIds.length > 0
      ? activeMasterIds
      : (['graham', 'buffett', 'munger', 'jones'] as MasterId[]);

  // 1. Quantitative Derivations
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
  const buffettMetrics = deriveBuffettMetrics(grahamMetrics, stock.netIncome, stock.totalEquity);
  const buffettAnalysis = generateBuffettFallbackAnalysis(buffettMetrics, riskPlan.budget);
  const mungerAnalysis = generateMungerFallbackAnalysis(grahamMetrics, riskPlan.budget);
  const tradeParams = extractTradeParameters(riskPlan);
  const jonesAnalysis = generateJonesFallbackAnalysis(grahamMetrics, tradeParams);

  const now = new Date();
  const formatTime = (offsetSec: number) => {
    const t = new Date(now.getTime() + offsetSec * 1000);
    return t.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const messages: DebateMessage[] = [];
  let step = 0;
  const pushMsg = (
    speakerId: MasterId,
    sentiment: DebateMessage['sentiment'],
    text: string,
    targetSpeakerName?: string,
    round?: number,
    roundTitle?: string,
    quoteSnippet?: string,
    keyMetrics?: { label: string; value: string }[]
  ) => {
    step++;
    const profile = MASTER_PROFILES[speakerId];
    messages.push({
      id: `msg-${step}-${speakerId}`,
      speakerId,
      speakerName: profile.name,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      borderColor: profile.borderColor,
      badgeBg: profile.badgeBg,
      text,
      targetSpeakerName,
      sentiment,
      timestamp: formatTime(step * (mode === 'detailed' ? 6 : 4)),
      round,
      roundTitle,
      quoteSnippet,
      keyMetrics,
    });
  };

  const hasGraham = safeActiveIds.includes('graham');
  const hasBuffett = safeActiveIds.includes('buffett');
  const hasMunger = safeActiveIds.includes('munger');
  const hasJones = safeActiveIds.includes('jones');

  const sym = stock.symbol;
  const price = stock.currentPrice;
  const grahamNo = grahamAnalysis.grahamNumber;
  const mos = grahamAnalysis.marginOfSafetyPct;
  const pe = grahamMetrics.pe;
  const pb = grahamMetrics.pb;
  const de = grahamMetrics.debtToEquity;
  const roe = buffettMetrics.roe;
  const moat = buffettAnalysis.moatStrength;
  const pricingPower = buffettAnalysis.pricingPowerScore;
  const shares = riskPlan.recommendedShares;
  const allocated = riskPlan.capitalAllocated;
  const slPrice = riskPlan.plannedStopLossPrice;
  const maxLoss = riskPlan.maxPlannedLoss;
  const slPct = Math.round(riskPlan.stopLossPct * 100);

  if (mode === 'detailed') {
    // =========================================================================
    // DETAILED ANALYSIS & DEBATE MODE (Extended 11-turn structured dialogue)
    // =========================================================================

    // -------------------------------------------------------------------------
    // ROUND 1: Valuation Anchor vs. Long-Term Franchise Value
    // -------------------------------------------------------------------------
    const r1Title = 'Round 1: Valuation Anchor vs. Long-Term Franchise Value';

    // Turn 1: Graham Dissects Graham Number & Tangible Assets
    if (hasGraham) {
      const isUndervalued = mos > 0;
      pushMsg(
        'graham',
        isUndervalued ? 'AGREEMENT' : 'CHALLENGE',
        `At ₹${formatINR(price)}, ${sym} presents an entry price that demands rigorous scrutiny. With a P/E of ${pe.toFixed(1)}x against a P/B of ${pb.toFixed(1)}x, the product of multiples is ${(pe * pb).toFixed(1)} (Graham ceiling: 22.5). Our calculated Graham Number is ₹${formatINR(grahamNo)}, giving an estimated margin of safety of ${mos >= 0 ? '+' : ''}${mos}%. ${
          isUndervalued
            ? `The discount to intrinsic value affords a genuine defensive cushion against macroeconomic volatility.`
            : `The market is exacting a premium over net tangible assets; without a clear margin of safety, downward shocks are structurally unprotected.`
        }`,
        undefined,
        1,
        r1Title,
        'An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return. Operations not meeting these requirements are speculative.',
        [
          { label: 'Graham Number', value: `₹${formatINR(grahamNo)}` },
          { label: 'Margin of Safety', value: `${mos}%` },
          { label: 'P/E × P/B Product', value: `${(pe * pb).toFixed(1)}x` },
        ]
      );
    } else {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Analyzing ${sym} at ₹${formatINR(price)}: our primary focus is earnings durability and return on capital. With an estimated ROE of ${roe.toFixed(1)}% and a ${moat} moat (${pricingPower}/100 pricing power), this enterprise possesses compounding characteristics worth owning.`,
        undefined,
        1,
        r1Title,
        undefined,
        [{ label: 'Return on Equity (ROE)', value: `${roe.toFixed(1)}%` }]
      );
    }

    // Turn 2: Buffett Counters on Indian Demographics & Moat Compounding
    if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Ben's margin of safety arithmetic is foundational, but static book value severely understates earning power in India's expanding economy. ${sym} generates an ROE of ${roe.toFixed(1)}% with a ${moat} moat and a ${pricingPower}/100 pricing power score. A business that can raise prices with inflation without shedding unit volume compounds capital far faster than buying cigar-butts at a discount to liquidation value.`,
        hasGraham ? 'Benjamin Graham' : undefined,
        1,
        r1Title,
        "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
        [
          { label: 'Return on Equity', value: `${roe.toFixed(1)}%` },
          { label: 'Moat Strength', value: moat },
          { label: 'Pricing Power', value: `${pricingPower}/100` },
        ]
      );
    }

    // Turn 3: Graham Rebuttal on Margin of Safety & Earnings Surprises
    if (hasGraham && hasBuffett) {
      pushMsg(
        'graham',
        'CHALLENGE',
        `Warren, the future is always uncertain. Projecting compounding 10 years out assumes sustained operating margins and benevolent competition. When market price ₹${formatINR(price)} exceeds net tangible assets, any unexpected quarterly earnings hiccup triggers sharp multiple compression. Without an arithmetic margin of safety, you are capitalizing optimism rather than audited reality.`,
        'Warren Buffett',
        1,
        r1Title,
        'Confronted with a challenge to his judgment, the investor must realize that his safety consists in not paying more for a security than its quantitative value justifies.',
        [{ label: 'Tangible P/B', value: `${pb.toFixed(1)}x` }]
      );
    }

    // Turn 4: Buffett Closes Round 1 on Reinvestment Economics
    if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `We don't ignore the price, Ben; we simply recognize that time is the friend of the wonderful company and the enemy of the mediocre. If ${sym} consistently reinvests retained earnings at ${roe.toFixed(1)}% incremental returns, book value per share expands every year. Paying a moderate premium today for proven management capital allocation protects our purchasing power far better than cash.`,
        hasGraham ? 'Benjamin Graham' : undefined,
        1,
        r1Title,
        'Time is the friend of the wonderful company, the enemy of the mediocre.',
        [{ label: 'Incremental ROE', value: `${roe.toFixed(1)}%` }]
      );
    }

    // -------------------------------------------------------------------------
    // ROUND 2: Forensic Inversion & Solvency Stress-Testing
    // -------------------------------------------------------------------------
    const r2Title = 'Round 2: Forensic Inversion & Solvency Stress-Testing';

    // Turn 5: Munger Inverts the Thesis
    if (hasMunger) {
      pushMsg(
        'munger',
        'CHALLENGE',
        `Let us invert our inquiry on ${sym}. Instead of hallucinating how rich we become, let's ask: How does this company go to zero in a credit freeze or an RBI rate spike? Debt-to-Equity sits at ${de.toFixed(2)}. Our Solvency Rating is ${mungerAnalysis.solvencyStatus} with Fragility scored as ${mungerAnalysis.fragilityRating}. If operating cash flow contracts by 30%, can this enterprise service its commitments without equity dilution?`,
        undefined,
        2,
        r2Title,
        'Invert, always invert: Turn a situation or problem upside down. What happens if everything goes wrong?',
        [
          { label: 'Debt-to-Equity', value: de.toFixed(2) },
          { label: 'Solvency Status', value: mungerAnalysis.solvencyStatus },
          { label: 'Fragility Rating', value: mungerAnalysis.fragilityRating },
        ]
      );
    }

    // Turn 6: Buffett Defends Balance Sheet & FCF Conversion
    if (hasBuffett && hasMunger) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Charlie's inversion keeps us honest. We looked closely at the debt maturity profile and working capital velocity. ${sym} converts earnings into real cash flows, not accounting smoke. With conservative debt relative to its compounding equity base, management has demonstrated financial sobriety over past market cycles.`,
        'Charlie Munger',
        2,
        r2Title,
        'Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1.',
        [{ label: 'Debt Burden', value: de <= 0.8 ? 'Manageable' : 'Elevated' }]
      );
    }

    // Turn 7: Graham Evaluates Working Capital Cushion
    if (hasGraham) {
      const target = hasMunger ? 'Charlie Munger' : 'Warren Buffett';
      pushMsg(
        'graham',
        de <= 0.5 ? 'AGREEMENT' : 'CHALLENGE',
        de <= 0.5
          ? `Charlie, I have audited the balance sheet alongside your inversion. Total debt of ₹${formatINR(stock.totalDebt ?? 0)} is well covered by tangible equity of ₹${formatINR(stock.totalEquity ?? 0)}. Debt-to-Equity of ${de.toFixed(2)} leaves the fortress intact even through an extended recession.`
          : `I share Charlie's skepticism. When Debt-to-Equity reaches ${de.toFixed(2)}, fixed financing obligations eat operating income during cyclical downturns. Debt is a multiplier on human error.`,
        target,
        2,
        r2Title,
        'The defensive investor must confine himself to the shares of important companies with a long record of continuous dividend payments and conservative financing.',
        [{ label: 'Audited D/E', value: de.toFixed(2) }]
      );
    }

    // Turn 8: Munger Delivers Round 2 Forensic Verdict
    if (hasMunger) {
      pushMsg(
        'munger',
        de <= 0.8 ? 'AGREEMENT' : 'CHALLENGE',
        de <= 0.8
          ? `The numbers confirm acceptable solvency sanity. We aren't being asked to underwrite reckless leverage. As long as we avoid idiocy and don't overpay, the company clears our forensic inversion screen.`
          : `The balance sheet fails our inversion mandate. Taking financial leverage into cyclical macro headwinds is fundamentally uninvestable. Avoid stupidity rather than seeking brilliance.`,
        undefined,
        2,
        r2Title,
        'It is remarkable how much long-term advantage people like us have gotten by trying to be consistently not stupid, instead of trying to be very intelligent.',
        [{ label: 'Solvency Clearance', value: de <= 0.8 ? 'PASSED' : 'FLAGGED' }]
      );
    }

    // -------------------------------------------------------------------------
    // ROUND 3: Tactical Risk Audit & Binding Gavel
    // -------------------------------------------------------------------------
    const r3Title = 'Round 3: Tactical Risk Audit & Binding Gavel';

    // Turn 9: Paul Tudor Jones Real-Time Risk Intervention
    if (hasJones) {
      pushMsg(
        'jones',
        'CHALLENGE',
        `Gentlemen, your economic philosophy is stimulating, but the tape does not care about your book values or 10-year discount models. The market only respects asymmetric risk. We have a specific trade budget of ₹${formatINR(riskPlan.budget)}. Sizing admits exactly ${shares} whole shares (capital deployed: ₹${formatINR(allocated)}), leaving ₹${formatINR(riskPlan.unallocatedBuffer)} unallocated in cash. Our stop-loss trigger is strictly anchored at ₹${formatINR(slPrice)} (-${slPct}%), hard-capping our worst-case loss at ₹${formatINR(maxLoss)}. Without this stop, capital allocation is forbidden.`,
        undefined,
        3,
        r3Title,
        "Don't focus on making money; focus on protecting what you have. Losers average losers.",
        [
          { label: 'Position Sizing', value: `${shares} Whole Shares` },
          { label: 'Stop-Loss Floor', value: `₹${formatINR(slPrice)} (-${slPct}%)` },
          { label: 'Max Rupee Risk', value: `₹${formatINR(maxLoss)}` },
        ]
      );
    }

    // Turn 10: Consensus Rebuttal & Risk Alignment
    if (hasBuffett && hasJones) {
      pushMsg(
        'buffett',
        'AGREEMENT',
        `Paul's stop-loss parameter provides the tactical discipline needed to navigate market volatility while our compounding thesis matures. Sizing exactly ${shares} whole shares respects capital preservation.`,
        'Paul Tudor Jones',
        3,
        r3Title,
        'Risk comes from not knowing what you are doing.',
        [{ label: 'Allocation', value: `₹${formatINR(allocated)}` }]
      );
    } else if (hasMunger && hasJones) {
      pushMsg(
        'munger',
        'AGREEMENT',
        `A mechanical stop at ₹${formatINR(slPrice)} limits catastrophe. If a position drops through technical support, admitting error quickly is the only rational course. Avoid stupidity rather than seeking brilliance.`,
        'Paul Tudor Jones',
        3,
        r3Title,
        'Acknowledging what you do not know is the dawning of wisdom.',
        [{ label: 'Loss Ceiling', value: `₹${formatINR(maxLoss)}` }]
      );
    }

    // Turn 11: Paul Tudor Jones Final Binding Gavel Ruling
    if (hasJones) {
      const verdict = jonesAnalysis.verdict;
      const isApproved = verdict === 'APPROVED';
      const isConditional = verdict === 'CONDITIONAL_APPROVAL';

      pushMsg(
        'jones',
        'RULING',
        isApproved
          ? `FINAL BINDING RULING: APPROVED. Order execution directive authorized for exactly ${shares} whole shares of ${sym} at market entry ₹${formatINR(price)}. GTT Stop-Loss floor at ₹${formatINR(slPrice)} (-${slPct}%) is active and binding. Maximum rupee capital loss strictly capped at ₹${formatINR(maxLoss)}. Risk-reward asymmetry exceeds 1:1.5 threshold. Delivery order authorized.`
          : isConditional
          ? `FINAL BINDING RULING: CONDITIONAL APPROVAL. Allocation permitted ONLY with trailing stop enforcement at ₹${formatINR(slPrice)}. If the stock breaks below support on heavy volume, order liquidation is mandatory without discretionary override. Max rupee loss capped at ₹${formatINR(maxLoss)}.`
          : `FINAL BINDING RULING: VETOED BY SOVEREIGN RISK GAVEL. Downside asymmetry fails mandatory 1:1.5 criteria or whole-share thresholds. CAPITAL COMMITMENT CANCELLED. Defense takes precedence over thesis speculation. Stand aside in cash reserve.`,
        undefined,
        3,
        r3Title,
        'Every day I assume every position I have is wrong.',
        [
          { label: 'Final Verdict', value: verdict },
          { label: 'Risk Directive', value: isApproved ? 'EXECUTE' : isConditional ? 'CONDITIONAL' : 'VETO' },
        ]
      );
    } else {
      const seniorId = hasBuffett ? 'buffett' : hasMunger ? 'munger' : 'graham';
      pushMsg(
        seniorId,
        'RULING',
        `COMMITTEE ADVISORY RULING: Consensus achieved between active masters. Proceed with disciplined sizing of ${shares} whole shares of ${sym} at ₹${formatINR(price)}, observing a conservative floor at ₹${formatINR(slPrice)}.`,
        undefined,
        3,
        r3Title
      );
    }
  } else {
    // =========================================================================
    // QUICK DEBATE MODE (Concise 4-7 turns, fast top-level focus)
    // =========================================================================

    // TURN 1: Opening Thesis & Valuation Anchor
    if (hasGraham) {
      const isUndervalued = mos > 0;
      pushMsg(
        'graham',
        isUndervalued ? 'AGREEMENT' : 'CHALLENGE',
        `At ₹${formatINR(price)}, ${sym} trades at a P/E of ${pe.toFixed(1)}x and P/B of ${pb.toFixed(1)}x. Our calculated Graham Number is ₹${formatINR(grahamNo)}, yielding a margin of safety of ${mos >= 0 ? '+' : ''}${mos}%. ${
          isUndervalued
            ? `The discount to intrinsic value provides a defensive cushion for conservative capital.`
            : `The market is asking a premium over net tangible assets; without a clear margin of safety, downward shocks are unprotected.`
        }`
      );
    } else if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Looking at ${sym} at ₹${formatINR(price)}, our primary focus is earnings durability. With an estimated ROE of ${roe.toFixed(1)}% and a ${moat} moat (${pricingPower}/100 pricing power), this enterprise possesses compounding characteristics worth owning.`
      );
    } else if (hasMunger) {
      pushMsg(
        'munger',
        'CHALLENGE',
        `Let us begin by inverting our inquiry on ${sym}. What causes permanent impairment here? Debt-to-equity is ${de.toFixed(2)}. Solvency rating is ${mungerAnalysis.solvencyStatus}. If we cannot withstand a 3-year downturn, we shouldn't touch it.`
      );
    } else if (hasJones) {
      pushMsg(
        'jones',
        'CHALLENGE',
        `Starting with risk execution on ${sym}: Our trade budget is ₹${formatINR(riskPlan.budget)}. At ₹${formatINR(price)}, position sizing admits ${shares} whole shares (allocating ₹${formatINR(allocated)}). My mandate is simple: defense first.`
      );
    }

    // TURN 2: Growth Specialist Moat & Compounding Cross-Examination
    if (hasBuffett && hasGraham) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Ben's margin of safety arithmetic is legendary, but paying a fair price for a wonderful business beats paying a wonderful price for a mediocre business. ${sym} demonstrates an ROE of ${roe.toFixed(1)}% and ${moat} moat protection. Quality compounders outgrow static book value over a multi-year horizon.`,
        'Benjamin Graham'
      );
    } else if (hasBuffett && !hasGraham && hasMunger) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Charlie, the balance sheet must be viewed alongside pricing power. A business that can raise prices with inflation without losing unit volume can service leverage comfortably. ${sym}'s pricing power score is ${pricingPower}/100.`,
        'Charlie Munger'
      );
    }

    // TURN 3: Quality Auditor Inversion & Leverage Challenge
    if (hasMunger) {
      const target = hasBuffett ? 'Warren Buffett' : hasGraham ? 'Benjamin Graham' : undefined;
      pushMsg(
        'munger',
        'CHALLENGE',
        `Warren and Ben speak of compounding, but people calculate projected cash flows while ignoring balance sheet rot. Debt-to-equity of ${de.toFixed(2)} cannot be rationalized by optimistic narrative. Invert: if operating cash flow contracts by 25%, does this firm survive without diluting equity? Our Fragility Rating is ${mungerAnalysis.fragilityRating}.`,
        target
      );
    }

    // TURN 4: Paul Tudor Jones Risk Controller Intervention & Gavel
    if (hasJones) {
      const isApproved = jonesAnalysis.verdict !== 'VETOED';
      pushMsg(
        'jones',
        isApproved ? 'DEFENSE' : 'CHALLENGE',
        `Gentlemen, your economic philosophy is intellectually stimulating, but the tape does not care about your book values. We are sizing ${shares} whole shares with ₹${formatINR(riskPlan.unallocatedBuffer)} left in cash buffer. Our mandatory stop-loss floor is set at ₹${formatINR(slPrice)} (-${slPct}%). Maximum rupee loss is capped at ₹${formatINR(maxLoss)}. Without this hard floor, the trade does not leave this room.`,
        hasBuffett ? 'Warren Buffett' : 'Benjamin Graham'
      );

      const verdict = jonesAnalysis.verdict;
      pushMsg(
        'jones',
        'RULING',
        verdict === 'APPROVED'
          ? `FINAL RULING: APPROVED. Execution directive authorized for ${shares} whole shares of ${sym} at ₹${formatINR(price)}. Mandatory stop-loss floor ₹${formatINR(slPrice)} strictly enforced. Max capital loss capped at ₹${formatINR(maxLoss)}. Risk-reward asymmetry is validated.`
          : verdict === 'CONDITIONAL_APPROVAL'
          ? `FINAL RULING: CONDITIONAL APPROVAL. The position is authorized ONLY with trailing stop enforcement at ₹${formatINR(slPrice)}. If the stock breaks below support, order is liquidated instantly without discretionary override.`
          : `FINAL RULING: VETOED. Downside skew violates 1.5:1 asymmetry. Capital allocation cancelled. Capital preservation takes precedence over thesis speculation.`
      );
    } else {
      const seniorId = hasBuffett ? 'buffett' : hasMunger ? 'munger' : 'graham';
      pushMsg(
        seniorId,
        'RULING',
        `COMMITTEE ADVISORY RULING: Consensus achieved between active masters. Proceed with disciplined sizing of ${shares} whole shares at ₹${formatINR(price)}, observing a conservative floor at ₹${formatINR(slPrice)}.`
      );
    }
  }

  // 3. Synthesis Calculation
  let totalScore = 0;
  let count = 0;
  if (hasGraham) { totalScore += grahamAnalysis.score; count++; }
  if (hasBuffett) { totalScore += buffettAnalysis.score; count++; }
  if (hasMunger) { totalScore += mungerAnalysis.score; count++; }
  if (hasJones) { totalScore += jonesAnalysis.score; count++; }
  const avgScore = count > 0 ? Math.round(totalScore / count) : 60;

  let consensusStance: CommitteeSynthesis['consensusStance'] = 'NEUTRAL';
  let verdictTitle = '';
  let verdictDetails = '';

  if (hasJones && jonesAnalysis.verdict === 'VETOED') {
    consensusStance = 'AVOID';
    verdictTitle = `VETOED: Risk Controller Downside Skew Breached`;
    verdictDetails = `Paul Tudor Jones exercised binding risk veto. While individual specialists saw merits, the capital preservation asymmetry ratio fails the mandatory 1.5:1 threshold.`;
  } else if (avgScore >= 75) {
    consensusStance = 'STRONG BUY';
    verdictTitle = `STRONG CONSENSUS: Quality Compounder with Risk Floor`;
    verdictDetails = `High alignment across committee specialists. Valuations and earnings durability warrant allocation of ${shares} whole shares with capped downside at ₹${formatINR(slPrice)}.`;
  } else if (avgScore >= 55) {
    consensusStance = 'CAUTIOUS BUY';
    verdictTitle = `CONDITIONAL APPROVAL: Sized Allocation with Strict Exit`;
    verdictDetails = `Moderate alignment. Analysts noted valuation premiums and leverage sensitivities, but trade passes risk-reward screening under strict stop-loss discipline.`;
  } else if (avgScore >= 40) {
    consensusStance = 'NEUTRAL';
    verdictTitle = `NEUTRAL / HOLD: Mixed Committee Conviction`;
    verdictDetails = `Sharp ideological conflict between margin of safety requirements and forward growth multiples. Capital allocation should remain conservative.`;
  } else {
    consensusStance = 'AVOID';
    verdictTitle = `AVOID: Unfavorable Risk-Reward Multiple`;
    verdictDetails = `Committee consensus warns against entry at current levels. Multiples are extended and balance sheet cushions are inadequate.`;
  }

  const keyAgreements: string[] = [
    `Strict Whole-Share Sizing: Commitment limited to ${shares} shares (₹${formatINR(allocated)}) with ₹${formatINR(riskPlan.unallocatedBuffer)} unallocated cash reserve.`,
    `Stop-Loss Floor Enforced: Non-negotiable exit level at ₹${formatINR(slPrice)} (-${slPct}%), capping maximum loss to ₹${formatINR(maxLoss)}.`,
    `Order Book Liquidity: Execution capacity for ${shares} shares confirmed with low market impact slippage on NSE/BSE.`,
  ];

  const keyDissents: string[] = [];
  if (hasGraham && hasBuffett && Math.abs(grahamAnalysis.score - buffettAnalysis.score) >= 15) {
    keyDissents.push(`Valuation Anchor: Graham demands ₹${formatINR(grahamNo)} Graham Number discount while Buffett accepts premium for ${moat} moat.`);
  }
  if (hasMunger && de > 0.8) {
    keyDissents.push(`Leverage Skepticism: Munger flagged Debt-to-Equity (${de.toFixed(2)}) as a fragile vulnerability under macroeconomic stress.`);
  }
  if (keyDissents.length === 0) {
    keyDissents.push(`Execution Timing: Debate between immediate market order placement vs limit accumulation around key support.`);
  }

  const synthesis: CommitteeSynthesis = {
    committeeScore: avgScore,
    consensusStance,
    verdictTitle,
    verdictDetails,
    keyAgreements,
    keyDissents,
  };

  return { messages, synthesis };
}

/**
 * Creates an interactive stream controller for the simulated debate,
 * providing Pause, Resume, Fast-Forward, and real-time elapsed duration reporting.
 */
export function createDebateStream(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  activeMasterIds: MasterId[],
  mode: DebateMode,
  callbacks: {
    onMessage: (msg: DebateMessage) => void;
    onStatusUpdate?: (status: DebateStreamStatus) => void;
    onComplete: (synthesis: CommitteeSynthesis) => void;
    signal?: AbortSignal;
  }
): {
  start: () => Promise<{ messages: DebateMessage[]; synthesis: CommitteeSynthesis }>;
  controls: DebateStreamControls;
} {
  const { messages, synthesis } = generateDebateTranscript(stock, riskPlan, activeMasterIds, mode);
  const totalTurns = messages.length;
  const turnDelayMs = mode === 'detailed' ? 5200 : 800;
  const totalEstSec = Math.round((totalTurns * turnDelayMs) / 1000);

  let isPaused = false;
  let isFastForward = false;
  let isStopped = false;

  const controls: DebateStreamControls = {
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
    },
    fastForward: () => {
      isFastForward = true;
      isPaused = false;
    },
    stop: () => {
      isStopped = true;
    },
    isPaused: () => isPaused,
  };

  const start = async () => {
    let elapsedMs = 0;
    const tickIntervalMs = 200;

    for (let i = 0; i < totalTurns; i++) {
      if (isStopped || callbacks.signal?.aborted) {
        throw new DOMException('Debate aborted', 'AbortError');
      }

      const msg = messages[i];
      const speakerProfile = MASTER_PROFILES[msg.speakerId];
      const roundNum = msg.round ?? (mode === 'detailed' ? (i < 4 ? 1 : i < 8 ? 2 : 3) : 1);
      const roundTitle =
        msg.roundTitle ??
        (roundNum === 1
          ? 'Round 1: Valuation Anchor vs. Long-Term Franchise Value'
          : roundNum === 2
          ? 'Round 2: Forensic Inversion & Solvency Stress-Testing'
          : 'Round 3: Tactical Risk Audit & Binding Gavel');

      // Deliver message
      callbacks.onMessage(msg);

      // Report status
      if (callbacks.onStatusUpdate) {
        callbacks.onStatusUpdate({
          mode,
          currentTurn: i + 1,
          totalTurns,
          round: roundNum,
          totalRounds: mode === 'detailed' ? 3 : 1,
          roundTitle,
          speakerId: msg.speakerId,
          speakerName: speakerProfile.name,
          speakerStatus: `${speakerProfile.name} delivered statement`,
          elapsedSec: Math.round(elapsedMs / 1000),
          totalEstSec,
          isPaused,
        });
      }

      // If not the last turn, wait for next speaker with live status updates
      if (i < totalTurns - 1) {
        const nextMsg = messages[i + 1];
        const nextSpeaker = MASTER_PROFILES[nextMsg.speakerId];
        const nextStatus = `${nextSpeaker.name} is reviewing financial statements & formulating cross-examination...`;

        let turnElapsedMs = 0;

        while (turnElapsedMs < turnDelayMs) {
          if (isStopped || callbacks.signal?.aborted) {
            throw new DOMException('Debate aborted', 'AbortError');
          }

          if (isFastForward) {
            // Immediately bypass remaining delay
            break;
          }

          await new Promise((r) => setTimeout(r, tickIntervalMs));

          if (!isPaused) {
            turnElapsedMs += tickIntervalMs;
            elapsedMs += tickIntervalMs;
          }

          if (callbacks.onStatusUpdate) {
            callbacks.onStatusUpdate({
              mode,
              currentTurn: i + 1,
              totalTurns,
              round: roundNum,
              totalRounds: mode === 'detailed' ? 3 : 1,
              roundTitle,
              speakerId: nextMsg.speakerId,
              speakerName: nextSpeaker.name,
              speakerStatus: isPaused ? '⏸️ Deliberation Paused' : nextStatus,
              elapsedSec: Math.round(elapsedMs / 1000),
              totalEstSec,
              isPaused,
            });
          }
        }
      }
    }

    callbacks.onComplete(synthesis);
    return { messages, synthesis };
  };

  return { start, controls };
}

/**
 * Streams the simulated debate in real-time turn-by-turn with realistic pacing.
 * Preserves backwards compatibility while supporting mode, controls, and status updates.
 */
export async function streamDebate(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  activeMasterIds: MasterId[],
  onMessage: (msg: DebateMessage) => void,
  onComplete: (synthesis: CommitteeSynthesis) => void,
  signal?: AbortSignal,
  _speedMs?: number,
  mode: DebateMode = 'quick',
  onStatusUpdate?: (status: DebateStreamStatus) => void,
  controlsRef?: { current: DebateStreamControls | null }
): Promise<{ messages: DebateMessage[]; synthesis: CommitteeSynthesis }> {
  const stream = createDebateStream(stock, riskPlan, activeMasterIds, mode, {
    onMessage,
    onStatusUpdate,
    onComplete,
    signal,
  });

  if (controlsRef) {
    controlsRef.current = stream.controls;
  }

  return stream.start();
}
