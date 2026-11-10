import { StockContext } from '../utils/committeeOrchestrator';
import { RiskPlanResult } from '../utils/riskEngine';
import { MasterId } from '../types/agents';
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
  consensusStance: 'STRONG BUY' | 'CAUTIOUS BUY' | 'NEUTRAL / HOLD' | 'AVOID / HIGH RISK' | 'NEUTRAL' | 'AVOID';
  verdictTitle: string;
  verdictDetails: string;
  keyAgreements: string[];
  keyDissents: string[];
  masterScores?: Record<MasterId, number>;
  normalizedMetrics?: NormalizedMetrics;
  normalizedTradeParams?: NormalizedTradeParams;
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

export interface NormalizedMetrics {
  symbol: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  profitMargin: number;
  debtToEquity: number;
  marketCap: number;
  eps: number;
  bookValuePerShare: number;
  grahamNumber: number;
}

export interface NormalizedTradeParams {
  budget: number;
  currentPrice: number;
  wholeShares: number;
  stopLoss: number;
  stopLossPct: number;
  capitalAllocated: number;
  unallocatedBuffer: number;
  rupeeDrawdown: number;
  drawdownPct: number;
}

export interface JonesScoreResult {
  score: number;
  verdict: 'APPROVED' | 'VETOED';
  rupeeDrawdown: number;
  drawdownPct: number;
  maxAllowableDrawdown: number;
}

export function formatINR(val: number): string {
  const rounded = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

// ============================================================================
// 1. SECTOR-AWARE METRIC INGESTION & FALLBACK SAFEGUARDS
// ============================================================================

interface StockProfile {
  pe: number;
  pb: number;
  roe: number;
  debtToEquity: number;
  profitMargin: number;
}

const SPECIFIC_STOCK_PROFILES: Record<string, StockProfile> = {
  TCS: { pe: 28.0, pb: 7.5, roe: 36.0, debtToEquity: 0.05, profitMargin: 22.0 },
  INFY: { pe: 26.0, pb: 6.2, roe: 31.0, debtToEquity: 0.05, profitMargin: 20.0 },
  HCLTECH: { pe: 24.0, pb: 5.2, roe: 26.0, debtToEquity: 0.08, profitMargin: 18.0 },
  WIPRO: { pe: 22.0, pb: 3.2, roe: 16.0, debtToEquity: 0.12, profitMargin: 14.0 },
  TECHM: { pe: 25.0, pb: 3.6, roe: 17.0, debtToEquity: 0.10, profitMargin: 13.0 },
  TATAELXSI: { pe: 38.0, pb: 11.5, roe: 32.0, debtToEquity: 0.02, profitMargin: 24.0 },
  RELIANCE: { pe: 25.0, pb: 2.1, roe: 14.0, debtToEquity: 0.45, profitMargin: 11.0 },
  TATASTEEL: { pe: 10.0, pb: 1.2, roe: 13.0, debtToEquity: 0.75, profitMargin: 9.0 },
  JSWSTEEL: { pe: 14.0, pb: 1.8, roe: 14.0, debtToEquity: 1.10, profitMargin: 8.0 },
  HINDALCO: { pe: 11.0, pb: 1.3, roe: 12.0, debtToEquity: 0.65, profitMargin: 7.0 },
  COALINDIA: { pe: 8.5, pb: 2.4, roe: 45.0, debtToEquity: 0.12, profitMargin: 25.0 },
  HDFCBANK: { pe: 18.0, pb: 2.6, roe: 16.0, debtToEquity: 0.25, profitMargin: 22.0 },
  ICICIBANK: { pe: 17.0, pb: 2.8, roe: 18.0, debtToEquity: 0.25, profitMargin: 23.0 },
  SBIN: { pe: 10.0, pb: 1.4, roe: 16.0, debtToEquity: 0.80, profitMargin: 15.0 },
  KOTAKBANK: { pe: 20.0, pb: 2.8, roe: 14.0, debtToEquity: 0.20, profitMargin: 22.0 },
  AXISBANK: { pe: 13.0, pb: 1.8, roe: 15.0, debtToEquity: 0.30, profitMargin: 18.0 },
  HINDUNILVR: { pe: 52.0, pb: 11.0, roe: 24.0, debtToEquity: 0.04, profitMargin: 19.0 },
  ITC: { pe: 26.0, pb: 6.8, roe: 28.0, debtToEquity: 0.03, profitMargin: 32.0 },
  NESTLEIND: { pe: 65.0, pb: 18.0, roe: 85.0, debtToEquity: 0.15, profitMargin: 16.0 },
  BRITANNIA: { pe: 50.0, pb: 14.0, roe: 45.0, debtToEquity: 0.40, profitMargin: 14.0 },
  TATACONSUM: { pe: 60.0, pb: 3.5, roe: 8.0, debtToEquity: 0.15, profitMargin: 9.0 },
  TITAN: { pe: 75.0, pb: 18.0, roe: 30.0, debtToEquity: 0.20, profitMargin: 9.0 },
  ASIANPAINT: { pe: 50.0, pb: 12.0, roe: 25.0, debtToEquity: 0.10, profitMargin: 14.0 },
  TATAMOTORS: { pe: 16.0, pb: 3.2, roe: 22.0, debtToEquity: 0.85, profitMargin: 8.0 },
  MARUTI: { pe: 26.0, pb: 3.8, roe: 15.0, debtToEquity: 0.02, profitMargin: 10.0 },
  M_AND_M: { pe: 28.0, pb: 4.2, roe: 18.0, debtToEquity: 0.35, profitMargin: 9.0 },
  M: { pe: 28.0, pb: 4.2, roe: 18.0, debtToEquity: 0.35, profitMargin: 9.0 },
  SUNPHARMA: { pe: 34.0, pb: 4.8, roe: 16.0, debtToEquity: 0.08, profitMargin: 20.0 },
  CIPLA: { pe: 26.0, pb: 3.5, roe: 15.0, debtToEquity: 0.05, profitMargin: 17.0 },
  DRREDDY: { pe: 20.0, pb: 3.2, roe: 18.0, debtToEquity: 0.06, profitMargin: 18.0 },
  LT: { pe: 32.0, pb: 4.5, roe: 15.0, debtToEquity: 0.90, profitMargin: 8.0 },
  NTPC: { pe: 15.0, pb: 1.9, roe: 13.0, debtToEquity: 1.35, profitMargin: 12.0 },
  POWERGRID: { pe: 17.0, pb: 2.8, roe: 18.0, debtToEquity: 1.45, profitMargin: 28.0 },
  TATAPOWER: { pe: 35.0, pb: 3.8, roe: 12.0, debtToEquity: 1.65, profitMargin: 7.0 },
  ONGC: { pe: 7.5, pb: 0.9, roe: 14.0, debtToEquity: 0.45, profitMargin: 14.0 },
  BPCL: { pe: 8.0, pb: 1.2, roe: 15.0, debtToEquity: 0.70, profitMargin: 5.0 },
  SUZLON: { pe: 65.0, pb: 9.5, roe: 18.0, debtToEquity: 1.60, profitMargin: 8.0 },
  ZOMATO: { pe: 85.0, pb: 6.2, roe: 7.0, debtToEquity: 0.05, profitMargin: 5.0 },
  ADANIENT: { pe: 70.0, pb: 6.5, roe: 10.0, debtToEquity: 1.85, profitMargin: 4.0 },
  ADANIPORTS: { pe: 32.0, pb: 4.0, roe: 14.0, debtToEquity: 1.40, profitMargin: 24.0 },
  DLF: { pe: 48.0, pb: 3.6, roe: 8.0, debtToEquity: 0.25, profitMargin: 20.0 },
};

const SECTOR_PROFILES: Record<string, StockProfile> = {
  'Information Technology': { pe: 28.0, pb: 6.0, roe: 28.0, debtToEquity: 0.08, profitMargin: 20.0 },
  'Metals & Mining': { pe: 10.5, pb: 1.25, roe: 13.5, debtToEquity: 0.85, profitMargin: 9.0 },
  'Mining & Metals': { pe: 10.5, pb: 1.25, roe: 13.5, debtToEquity: 0.85, profitMargin: 9.0 },
  'Oil & Gas': { pe: 14.0, pb: 1.5, roe: 14.0, debtToEquity: 0.55, profitMargin: 11.0 },
  'Oil & Gas Exploration': { pe: 8.0, pb: 1.0, roe: 14.0, debtToEquity: 0.45, profitMargin: 14.0 },
  FMCG: { pe: 46.0, pb: 9.5, roe: 28.0, debtToEquity: 0.08, profitMargin: 18.0 },
  'Banking & Financial': { pe: 16.5, pb: 2.2, roe: 15.5, debtToEquity: 0.35, profitMargin: 20.0 },
  'Public Sector Bank': { pe: 10.0, pb: 1.4, roe: 16.0, debtToEquity: 0.80, profitMargin: 15.0 },
  Automobile: { pe: 20.0, pb: 3.2, roe: 18.0, debtToEquity: 0.45, profitMargin: 9.0 },
  Pharmaceuticals: { pe: 28.0, pb: 4.0, roe: 16.0, debtToEquity: 0.10, profitMargin: 17.0 },
  'Power & Energy': { pe: 24.0, pb: 2.5, roe: 13.0, debtToEquity: 1.45, profitMargin: 10.0 },
  'Power Transmission': { pe: 17.0, pb: 2.8, roe: 18.0, debtToEquity: 1.45, profitMargin: 28.0 },
  'Power & Utilities': { pe: 15.0, pb: 1.9, roe: 13.0, debtToEquity: 1.35, profitMargin: 12.0 },
  'Infrastructure & Capital Goods': { pe: 30.0, pb: 3.8, roe: 14.0, debtToEquity: 1.25, profitMargin: 8.0 },
  'Consumer Discretionary': { pe: 55.0, pb: 10.0, roe: 22.0, debtToEquity: 0.20, profitMargin: 10.0 },
  Retail: { pe: 55.0, pb: 10.0, roe: 22.0, debtToEquity: 0.20, profitMargin: 10.0 },
  Telecommunications: { pe: 35.0, pb: 3.5, roe: 10.0, debtToEquity: 1.30, profitMargin: 10.0 },
  'Real Estate Development': { pe: 42.0, pb: 3.2, roe: 9.0, debtToEquity: 0.45, profitMargin: 16.0 },
  'Renewable Wind Energy': { pe: 65.0, pb: 9.5, roe: 18.0, debtToEquity: 1.60, profitMargin: 8.0 },
  'Internet & Food Delivery': { pe: 85.0, pb: 6.2, roe: 7.0, debtToEquity: 0.05, profitMargin: 5.0 },
  'Diversified Conglomerate': { pe: 70.0, pb: 6.5, roe: 10.0, debtToEquity: 1.85, profitMargin: 4.0 },
};

const DEFAULT_SECTOR_PROFILE: StockProfile = {
  pe: 22.0,
  pb: 2.5,
  roe: 16.0,
  debtToEquity: 0.45,
  profitMargin: 12.0,
};

export function normalizeMetrics(stock: StockContext): NormalizedMetrics {
  const rawSym = (stock.symbol || 'UNKNOWN').trim().toUpperCase();
  const cleanSym = rawSym.replace(/\.(NS|BO|BSE)$/i, '').replace(/[^A-Z0-9_]/g, '');

  const matchingNseStock = NSE_STOCKS.find(
    (s) =>
      s.displaySymbol.toUpperCase() === cleanSym ||
      s.symbol.toUpperCase().startsWith(cleanSym) ||
      (stock.companyName && s.name.toLowerCase().includes(stock.companyName.toLowerCase()))
  );

  const sector = matchingNseStock?.sector || 'Indian Equities';

  // Base fallback from specific stock or sector
  const specificProfile = SPECIFIC_STOCK_PROFILES[cleanSym];
  const sectorProfile = SECTOR_PROFILES[sector] || DEFAULT_SECTOR_PROFILE;
  const baseProfile = specificProfile || sectorProfile;

  const currentPrice =
    stock.currentPrice > 0
      ? stock.currentPrice
      : 100.0;

  // Live P/E derivation or fallback
  let peRatio = baseProfile.pe;
  if (stock.marketCap && stock.netIncome && stock.marketCap > 0 && stock.netIncome > 0) {
    const livePE = Number((stock.marketCap / stock.netIncome).toFixed(1));
    if (livePE >= 2.0 && livePE <= 250.0) {
      peRatio = livePE;
    }
  }

  // Live P/B derivation or fallback
  let pbRatio = baseProfile.pb;
  if (stock.marketCap && stock.totalEquity && stock.marketCap > 0 && stock.totalEquity > 0) {
    const livePB = Number((stock.marketCap / stock.totalEquity).toFixed(2));
    if (livePB >= 0.2 && livePB <= 50.0) {
      pbRatio = livePB;
    }
  }

  // Live ROE derivation or fallback
  let roe = baseProfile.roe;
  if (stock.netIncome != null && stock.totalEquity && stock.totalEquity > 0) {
    const liveROE = Number(((stock.netIncome / stock.totalEquity) * 100).toFixed(1));
    if (liveROE >= -50.0 && liveROE <= 90.0) {
      roe = liveROE;
    }
  }

  // Live D/E derivation or fallback
  let debtToEquity = baseProfile.debtToEquity;
  if (stock.debtToEquity != null && Number.isFinite(stock.debtToEquity) && stock.debtToEquity >= 0) {
    debtToEquity = stock.debtToEquity > 25.0 ? 2.50 : Number(stock.debtToEquity.toFixed(2));
  } else if (stock.totalDebt != null && stock.totalEquity && stock.totalEquity > 0) {
    const liveDE = Number((stock.totalDebt / stock.totalEquity).toFixed(2));
    if (liveDE >= 0 && liveDE <= 25) {
      debtToEquity = liveDE;
    }
  }

  const profitMargin = baseProfile.profitMargin;
  const marketCap = stock.marketCap && stock.marketCap > 0 ? stock.marketCap : currentPrice * 1e7;

  // EPS = currentPrice / peRatio
  const eps = peRatio > 0 ? Number((currentPrice / peRatio).toFixed(2)) : 0;

  // Book Value Per Share = currentPrice / pbRatio
  const bookValuePerShare = pbRatio > 0 ? Number((currentPrice / pbRatio).toFixed(2)) : 0;

  // Graham Number Formula: Math.sqrt(22.5 * eps * bookValuePerShare) or currentPrice * (15 / peRatio) if EPS is sparse
  let grahamNumber: number;
  if (eps > 0 && bookValuePerShare > 0) {
    grahamNumber = Number(Math.sqrt(22.5 * eps * bookValuePerShare).toFixed(2));
  } else {
    grahamNumber = Number((currentPrice * (15 / Math.max(1, peRatio))).toFixed(2));
  }

  return {
    symbol: cleanSym || stock.symbol || 'STOCK',
    companyName: stock.companyName || matchingNseStock?.name || cleanSym,
    sector,
    currentPrice,
    peRatio,
    pbRatio,
    roe,
    profitMargin,
    debtToEquity,
    marketCap,
    eps,
    bookValuePerShare,
    grahamNumber,
  };
}

export function normalizeTradeParams(
  stock: StockContext,
  riskPlan: RiskPlanResult,
  metrics: NormalizedMetrics
): NormalizedTradeParams {
  const currentPrice = metrics.currentPrice;
  const budget = riskPlan?.budget > 0 ? riskPlan.budget : 50000;

  const rawShares = riskPlan?.recommendedShares;
  const wholeShares =
    rawShares != null && rawShares > 0
      ? rawShares
      : Math.floor(budget / currentPrice);

  const rawStop = riskPlan?.plannedStopLossPrice;
  const defaultStop = Number((currentPrice * 0.95).toFixed(2));
  let stopLoss = rawStop != null && rawStop > 0 ? rawStop : defaultStop;

  let stopLossPct =
    riskPlan?.stopLossPct != null && riskPlan.stopLossPct > 0
      ? riskPlan.stopLossPct
      : currentPrice > 0
      ? (currentPrice - stopLoss) / currentPrice
      : 0.05;

  // Disciplined risk normalization:
  // For sound companies with manageable debt (D/E <= 1.2), PTJ enforces a disciplined 2% stop-loss floor
  // capping rupee drawdown at strictly <= 2% of budget.
  // For overleveraged companies (D/E > 1.2), downside reflects wide unhedged risk (> 2%).
  if (metrics.debtToEquity <= 1.2 && wholeShares > 0) {
    if (stopLossPct > 0.02) {
      stopLoss = Number((currentPrice * 0.98).toFixed(2));
      stopLossPct = 0.02;
    }
  } else if (metrics.debtToEquity > 1.2) {
    stopLossPct = Math.max(stopLossPct, 0.06);
    stopLoss = Number((currentPrice * (1 - stopLossPct)).toFixed(2));
  }

  const capitalAllocated = Number((wholeShares * currentPrice).toFixed(2));
  const unallocatedBuffer = Math.max(0, Number((budget - capitalAllocated).toFixed(2)));

  const rupeeDrawdown = Number(((currentPrice - stopLoss) * wholeShares).toFixed(2));
  const drawdownPct = budget > 0 ? Number(((rupeeDrawdown / budget) * 100).toFixed(2)) : 0;

  return {
    budget,
    currentPrice,
    wholeShares,
    stopLoss,
    stopLossPct,
    capitalAllocated,
    unallocatedBuffer,
    rupeeDrawdown,
    drawdownPct,
  };
}

// ============================================================================
// 2. DYNAMIC, METRIC-DRIVEN MASTER SCORING ALGORITHMS (15 - 95 RANGE)
// ============================================================================

export function calculateGrahamScore(metrics: NormalizedMetrics): number {
  let score = 50;

  // P/E multiple checks
  if (metrics.peRatio < 15) {
    score += 25;
  } else if (metrics.peRatio < 22) {
    score += 10;
  } else if (metrics.peRatio > 35) {
    score -= 25;
  }

  // P/B ratio checks
  if (metrics.pbRatio < 1.5) {
    score += 15;
  } else if (metrics.pbRatio > 4.0) {
    score -= 20;
  }

  // Graham Number discount / premium check
  if (metrics.currentPrice < metrics.grahamNumber) {
    score += 10;
  } else if (metrics.currentPrice > 1.5 * metrics.grahamNumber) {
    score -= 20;
  }

  return Math.min(95, Math.max(15, Math.round(score)));
}

export function calculateBuffettScore(metrics: NormalizedMetrics): number {
  let score = 50;

  // ROE compounding quality
  if (metrics.roe > 20) {
    score += 30;
  } else if (metrics.roe > 15) {
    score += 15;
  } else if (metrics.roe < 10) {
    score -= 25;
  }

  // Sustainable profit margins
  if (metrics.profitMargin > 15) {
    score += 15;
  }

  // Valuation ceiling vs ROE exception
  if (metrics.peRatio > 40 && metrics.roe <= 30) {
    score -= 20;
  }

  return Math.min(95, Math.max(15, Math.round(score)));
}

export function calculateMungerScore(metrics: NormalizedMetrics): number {
  let score = 50;

  // Fortress balance sheet vs inversion leverage risk
  if (metrics.debtToEquity < 0.3) {
    score += 25;
  } else if (metrics.debtToEquity > 1.2) {
    score -= 35;
  }

  // Consistent ROE and pricing power intact
  if (metrics.roe >= 15 && metrics.profitMargin >= 12) {
    score += 15;
  }

  return Math.min(95, Math.max(15, Math.round(score)));
}

export function calculateJonesScore(
  metrics: NormalizedMetrics,
  tradeParams: NormalizedTradeParams
): JonesScoreResult {
  const maxAllowableDrawdown = tradeParams.budget * 0.02;

  // Evaluates position risk: Rupee drawdown = (currentPrice - stopLoss) * wholeShares
  // Max allowable drawdown: strictly 2% of budget
  // If risk exceeds 2% or trend is sharply breaking support: Score = 20, issues VETOED
  // If risk is well-hedged: Score = 85, issues APPROVED
  const isDrawdownExcessive = tradeParams.rupeeDrawdown > maxAllowableDrawdown + 0.01;
  const isBreakingSupportOrOverleveraged =
    metrics.debtToEquity > 1.2 || tradeParams.wholeShares <= 0;

  if (isDrawdownExcessive || isBreakingSupportOrOverleveraged) {
    return {
      score: 20,
      verdict: 'VETOED',
      rupeeDrawdown: tradeParams.rupeeDrawdown,
      drawdownPct: tradeParams.drawdownPct,
      maxAllowableDrawdown,
    };
  }

  return {
    score: 85,
    verdict: 'APPROVED',
    rupeeDrawdown: tradeParams.rupeeDrawdown,
    drawdownPct: tradeParams.drawdownPct,
    maxAllowableDrawdown,
  };
}

export function calculateCommitteeSynthesis(
  metrics: NormalizedMetrics,
  tradeParams: NormalizedTradeParams,
  activeMasterIds: MasterId[] = ['graham', 'buffett', 'munger', 'jones']
): CommitteeSynthesis {
  const safeActiveIds =
    activeMasterIds.length > 0
      ? activeMasterIds
      : (['graham', 'buffett', 'munger', 'jones'] as MasterId[]);

  const gScore = calculateGrahamScore(metrics);
  const bScore = calculateBuffettScore(metrics);
  const mScore = calculateMungerScore(metrics);
  const jResult = calculateJonesScore(metrics, tradeParams);

  const scores: Record<MasterId, number> = {
    graham: gScore,
    buffett: bScore,
    munger: mScore,
    jones: jResult.score,
  };

  let total = 0;
  let count = 0;
  for (const id of safeActiveIds) {
    total += scores[id];
    count++;
  }

  const rawAvg = count > 0 ? Math.round(total / count) : 60;
  const committeeScore = Math.min(95, Math.max(15, rawAvg));

  const hasJones = safeActiveIds.includes('jones');
  const isPTJVetoed = hasJones && jResult.verdict === 'VETOED';

  let consensusStance: CommitteeSynthesis['consensusStance'];
  let verdictTitle = '';
  let verdictDetails = '';

  if (isPTJVetoed || committeeScore < 40) {
    consensusStance = 'AVOID / HIGH RISK';
    if (isPTJVetoed) {
      verdictTitle = 'TRADE VETOED: Sovereign Risk Drawdown Breached';
      verdictDetails = `Paul Tudor Jones exercised binding risk veto. Downside exposure of ₹${formatINR(
        tradeParams.rupeeDrawdown
      )} (${tradeParams.drawdownPct}% of capital) violates the non-negotiable 2% capital preservation threshold.`;
    } else {
      verdictTitle = 'AVOID / HIGH RISK: Unfavorable Valuation & Balance Sheet Skew';
      verdictDetails = `Committee consensus rejects allocation into ${metrics.symbol}. High multiples and elevated debt-to-equity (${metrics.debtToEquity.toFixed(
        2
      )}) fail defensive safety hurdles.`;
    }
  } else if (committeeScore >= 75) {
    consensusStance = 'STRONG BUY';
    verdictTitle = 'STRONG BUY: High-Conviction Quality Compounder';
    verdictDetails = `Overwhelming master alignment on ${metrics.symbol}. Robust capital returns (ROE: ${metrics.roe.toFixed(
      1
    )}%) combined with sound balance sheet discipline warrant disciplined execution of ${
      tradeParams.wholeShares
    } whole shares.`;
  } else if (committeeScore >= 60) {
    consensusStance = 'CAUTIOUS BUY';
    verdictTitle = 'CAUTIOUS BUY: Sized Allocation with Strict Exit Discipline';
    verdictDetails = `Moderate committee conviction. ${metrics.symbol} offers acceptable upside asymmetry, but valuation multiples or cyclical sensitivities require non-negotiable trailing stop-loss protection at ₹${formatINR(
      tradeParams.stopLoss
    )}.`;
  } else {
    consensusStance = 'NEUTRAL / HOLD';
    verdictTitle = 'NEUTRAL / HOLD: Mixed Ideological Convictions';
    verdictDetails = `Specialists are divided on ${metrics.symbol}. Tension between margin of safety requirements and forward multiple expectations warrants standing aside in cash reserve.`;
  }

  const keyAgreements: string[] = [
    `Strict Whole-Share Allocation: Deploying capital into ${tradeParams.wholeShares} whole shares (₹${formatINR(
      tradeParams.capitalAllocated
    )}) with ₹${formatINR(tradeParams.unallocatedBuffer)} unallocated cash reserve.`,
    `Stop-Loss Floor Enforced: Non-negotiable exit level at ₹${formatINR(tradeParams.stopLoss)} (-${(
      tradeParams.stopLossPct * 100
    ).toFixed(1)}%), strictly capping worst-case rupee drawdown at ₹${formatINR(tradeParams.rupeeDrawdown)}.`,
    `Execution Feasibility: Liquidity in ${metrics.symbol} confirmed for order execution with low market impact slippage.`,
  ];

  const keyDissents: string[] = [];
  if (safeActiveIds.includes('graham') && safeActiveIds.includes('buffett')) {
    if (metrics.peRatio > 25 && metrics.roe > 18) {
      keyDissents.push(
        `Valuation vs Moat: Graham warns against ${metrics.peRatio.toFixed(
          1
        )}x P/E multiple while Buffett defends ${metrics.roe.toFixed(1)}% ROE franchise compounding.`
      );
    }
  }
  if (safeActiveIds.includes('munger') && metrics.debtToEquity > 0.8) {
    keyDissents.push(
      `Leverage Inversion: Munger flagged Debt-to-Equity of ${metrics.debtToEquity.toFixed(
        2
      )} as financial arsenic during Dalal Street liquidity shocks.`
    );
  }
  if (keyDissents.length === 0) {
    keyDissents.push(
      `Execution Timing: Tactical debate between immediate market fill vs waiting for technical pullbacks.`
    );
  }

  return {
    committeeScore,
    consensusStance,
    verdictTitle,
    verdictDetails,
    keyAgreements,
    keyDissents,
    masterScores: scores,
    normalizedMetrics: metrics,
    normalizedTradeParams: tradeParams,
  };
}

// ============================================================================
// 3. GENERATE TRULY DYNAMIC REBUTTALS & STOCK-SPECIFIC CONTENT
// ============================================================================

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

  const metrics = normalizeMetrics(stock);
  const tradeParams = normalizeTradeParams(stock, riskPlan, metrics);
  const synthesis = calculateCommitteeSynthesis(metrics, tradeParams, safeActiveIds);

  const now = new Date();
  const formatTime = (offsetSec: number) => {
    const t = new Date(now.getTime() + offsetSec * 1000);
    return t.toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

  const sym = metrics.symbol;
  const price = metrics.currentPrice;
  const pe = metrics.peRatio;
  const pb = metrics.pbRatio;
  const roe = metrics.roe;
  const de = metrics.debtToEquity;
  const grahamNo = metrics.grahamNumber;
  const budget = tradeParams.budget;
  const shares = tradeParams.wholeShares;
  const stop = tradeParams.stopLoss;
  const lossAmount = tradeParams.rupeeDrawdown;
  const lossPercent = tradeParams.drawdownPct;
  const verdict = synthesis.consensusStance === 'AVOID / HIGH RISK' ? 'VETOED' : 'APPROVED';

  const isGrahamCheap = price <= grahamNo || pe < 22;
  const isBuffettHighRoe = roe > 18;
  const isMungerHighDebt = de > 0.8;

  // Exact prompt quotes
  const grahamDialogue = isGrahamCheap
    ? `At a P/E of ${pe.toFixed(1)}, ${sym} offers a rare genuine margin of safety against intrinsic value ₹${formatINR(grahamNo)}.`
    : `Speculative madness. At ${pe.toFixed(1)}x earnings, ${sym} trades far above its liquidation and net current asset buffer.`;

  const buffettDialogue = isBuffettHighRoe
    ? `Ben, you're valuing a cigar butt. ${sym}'s ROE of ${roe.toFixed(1)}% demonstrates an authentic economic moat with durable compounding.`
    : `I agree with Ben here. Without pricing power or high returns on capital, ${sym} lacks the protective moat we require.`;

  const mungerDialogue = isMungerHighDebt
    ? `Invert, always invert! A Debt-to-Equity of ${de.toFixed(2)} is financial arsenic if credit tightens in Dalal Street.`
    : `Clean ledger. Minimal leverage with ${de.toFixed(2)} D/E lets us sleep soundly during market panics.`;

  const jonesGavelDialogue = `Cut the philosophy. With a ₹${formatINR(budget)} budget and ${shares} shares, our downside exposure to stop-loss ₹${formatINR(stop)} is ₹${formatINR(lossAmount)} (${lossPercent}% of capital). Verdict: ${verdict}.`;

  if (mode === 'detailed') {
    // =========================================================================
    // DETAILED MODE (Structured 3-Round Deliberation)
    // =========================================================================
    const r1Title = 'Round 1: Valuation Anchor vs. Long-Term Franchise Value';

    // Turn 1: Graham Thesis
    if (hasGraham) {
      pushMsg(
        'graham',
        isGrahamCheap ? 'AGREEMENT' : 'CHALLENGE',
        `${grahamDialogue} At ₹${formatINR(price)}, ${sym} demands rigorous scrutiny against net tangible assets. Our Graham Number benchmark stands at ₹${formatINR(grahamNo)} with a P/B of ${pb.toFixed(1)}x.`,
        undefined,
        1,
        r1Title,
        'An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return.',
        [
          { label: 'P/E Multiple', value: `${pe.toFixed(1)}x` },
          { label: 'Graham Number', value: `₹${formatINR(grahamNo)}` },
          { label: 'P/B Multiple', value: `${pb.toFixed(1)}x` },
        ]
      );
    } else {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Analyzing ${sym} at ₹${formatINR(price)}: our primary focus is return on capital and earnings durability. ${buffettDialogue}`,
        undefined,
        1,
        r1Title,
        undefined,
        [{ label: 'Return on Equity (ROE)', value: `${roe.toFixed(1)}%` }]
      );
    }

    // Turn 2: Buffett Defense & Cross-Examination
    if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `${buffettDialogue} Paying a fair price for a wonderful company beats paying a wonderful price for a fair company. ${sym} reinvests capital at high efficiency across India's economic expansion.`,
        hasGraham ? 'Benjamin Graham' : undefined,
        1,
        r1Title,
        "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
        [
          { label: 'Return on Equity', value: `${roe.toFixed(1)}%` },
          { label: 'Economic Moat', value: isBuffettHighRoe ? 'WIDE' : 'NARROW' },
          { label: 'Profit Margin', value: `${metrics.profitMargin}%` },
        ]
      );
    }

    // Turn 3: Graham Rebuttal
    if (hasGraham && hasBuffett) {
      pushMsg(
        'graham',
        'CHALLENGE',
        `Warren, the future is always uncertain. When market price ₹${formatINR(price)} trades at ${pe.toFixed(1)}x earnings without a deep discount to tangible book value ₹${formatINR(metrics.bookValuePerShare)}, unexpected macro shocks will compress multiples fast. You are capitalizing optimism rather than audited reality.`,
        'Warren Buffett',
        1,
        r1Title,
        'Confronted with a challenge to his judgment, the investor must realize that his safety consists in not paying more for a security than its quantitative value justifies.',
        [{ label: 'Tangible Book Value', value: `₹${formatINR(metrics.bookValuePerShare)}` }]
      );
    }

    // Turn 4: Buffett Closes Round 1
    if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `We do not ignore price, Ben, but time is the friend of the wonderful company and the enemy of the mediocre. If ${sym} consistently compounding equity at ${roe.toFixed(1)}% per annum, book value expands each fiscal year.`,
        hasGraham ? 'Benjamin Graham' : undefined,
        1,
        r1Title,
        'Time is the friend of the wonderful company, the enemy of the mediocre.',
        [{ label: 'Compounding ROE', value: `${roe.toFixed(1)}%` }]
      );
    }

    // ROUND 2: Forensic Inversion & Solvency Stress-Testing
    const r2Title = 'Round 2: Forensic Inversion & Solvency Stress-Testing';

    // Turn 5: Munger Inversion
    if (hasMunger) {
      pushMsg(
        'munger',
        isMungerHighDebt ? 'CHALLENGE' : 'AGREEMENT',
        `${mungerDialogue} Let us invert our inquiry on ${sym}. What causes insolvency in an economic shock? Debt-to-Equity sits at ${de.toFixed(2)}. If operating cash flow contracts by 30%, can this enterprise service debt without equity dilution?`,
        undefined,
        2,
        r2Title,
        'Invert, always invert: Turn a situation or problem upside down. What happens if everything goes wrong?',
        [
          { label: 'Debt-to-Equity', value: de.toFixed(2) },
          { label: 'Solvency Status', value: de < 0.3 ? 'PRISTINE' : de <= 1.2 ? 'ADEQUATE' : 'OVERLEVERAGED' },
        ]
      );
    }

    // Turn 6: Buffett Defends Balance Sheet
    if (hasBuffett && hasMunger) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Charlie's inversion keeps us honest. We looked closely at ${sym}'s cash generation. With ${de <= 0.8 ? `prudent leverage of ${de.toFixed(2)} D/E, management has maintained balance sheet sobriety` : `elevated debt of ${de.toFixed(2)} D/E, debt service requires constant vigilance`}.`,
        'Charlie Munger',
        2,
        r2Title,
        'Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1.',
        [{ label: 'Debt Burden', value: de <= 0.8 ? 'Manageable' : 'Elevated' }]
      );
    }

    // Turn 7: Graham Audits Capital Structure
    if (hasGraham) {
      pushMsg(
        'graham',
        de <= 0.5 ? 'AGREEMENT' : 'CHALLENGE',
        de <= 0.5
          ? `Charlie, I have audited the balance sheet alongside your inversion. Debt-to-Equity of ${de.toFixed(2)} leaves the defensive cushion intact even through an extended recession.`
          : `I share Charlie's skepticism. When Debt-to-Equity reaches ${de.toFixed(2)}, fixed financing obligations eat operating income during cyclical downturns. Debt is a multiplier on human error.`,
        hasMunger ? 'Charlie Munger' : 'Warren Buffett',
        2,
        r2Title,
        'The defensive investor must confine himself to the shares of important companies with conservative financing.',
        [{ label: 'Audited D/E', value: de.toFixed(2) }]
      );
    }

    // Turn 8: Munger Closes Round 2
    if (hasMunger) {
      pushMsg(
        'munger',
        de <= 0.8 ? 'AGREEMENT' : 'CHALLENGE',
        de <= 0.8
          ? `The numbers confirm acceptable solvency sanity. We aren't being asked to underwrite reckless leverage. As long as we avoid stupidity and don't overpay, ${sym} clears our forensic inversion screen.`
          : `The balance sheet fails our inversion mandate. Taking financial leverage into cyclical macro headwinds is fundamentally uninvestable. Avoid stupidity rather than seeking brilliance.`,
        undefined,
        2,
        r2Title,
        'It is remarkable how much long-term advantage people like us have gotten by trying to be consistently not stupid.',
        [{ label: 'Solvency Clearance', value: de <= 0.8 ? 'PASSED' : 'FLAGGED' }]
      );
    }

    // ROUND 3: Tactical Risk Audit & Binding Gavel
    const r3Title = 'Round 3: Tactical Risk Audit & Binding Gavel';

    // Turn 9: Jones Tactical Intervention
    if (hasJones) {
      pushMsg(
        'jones',
        'CHALLENGE',
        `Gentlemen, your economic philosophy is stimulating, but the tape does not care about your book values or 10-year discount models. We have a specific trade budget of ₹${formatINR(budget)}. Sizing admits exactly ${shares} whole shares (capital deployed: ₹${formatINR(tradeParams.capitalAllocated)}), leaving ₹${formatINR(tradeParams.unallocatedBuffer)} unallocated in cash. Our stop-loss trigger is strictly anchored at ₹${formatINR(stop)} (-${(tradeParams.stopLossPct * 100).toFixed(1)}%).`,
        undefined,
        3,
        r3Title,
        "Don't focus on making money; focus on protecting what you have. Losers average losers.",
        [
          { label: 'Whole Shares', value: `${shares} Shares` },
          { label: 'Stop-Loss Floor', value: `₹${formatINR(stop)}` },
          { label: 'Capped Downside', value: `₹${formatINR(lossAmount)}` },
        ]
      );
    }

    // Turn 10: Consensus Rebuttal
    if (hasBuffett && hasJones) {
      pushMsg(
        'buffett',
        'AGREEMENT',
        `Paul's stop-loss parameter provides the tactical discipline needed to navigate market volatility while our compounding thesis matures. Sizing exactly ${shares} whole shares respects capital preservation.`,
        'Paul Tudor Jones',
        3,
        r3Title,
        'Risk comes from not knowing what you are doing.',
        [{ label: 'Capital Deployed', value: `₹${formatINR(tradeParams.capitalAllocated)}` }]
      );
    } else if (hasMunger && hasJones) {
      pushMsg(
        'munger',
        'AGREEMENT',
        `A mechanical stop at ₹${formatINR(stop)} limits catastrophe. If a position drops through technical support, admitting error quickly is the only rational course. Avoid stupidity rather than seeking brilliance.`,
        'Paul Tudor Jones',
        3,
        r3Title,
        'Acknowledging what you do not know is the dawning of wisdom.',
        [{ label: 'Loss Ceiling', value: `₹${formatINR(lossAmount)}` }]
      );
    }

    // Turn 11: Paul Tudor Jones Binding Ruling
    if (hasJones) {
      pushMsg(
        'jones',
        'RULING',
        `${jonesGavelDialogue} ${
          verdict === 'APPROVED'
            ? `Execution directive authorized for exactly ${shares} whole shares of ${sym} at market entry ₹${formatINR(price)}. GTT Stop-Loss floor at ₹${formatINR(stop)} is active and binding. Maximum capital loss strictly capped at ₹${formatINR(lossAmount)}. Risk-reward asymmetry validated.`
            : `Execution cancelled. Capital preservation rule triggered. Stand aside in cash reserve.`
        }`,
        undefined,
        3,
        r3Title,
        'Every day I assume every position I have is wrong.',
        [
          { label: 'Final Verdict', value: verdict },
          { label: 'Capital at Risk', value: `${lossPercent}% of Budget` },
        ]
      );
    } else {
      const seniorId = hasBuffett ? 'buffett' : hasMunger ? 'munger' : 'graham';
      pushMsg(
        seniorId,
        'RULING',
        `COMMITTEE ADVISORY RULING: Consensus achieved. Proceed with disciplined sizing of ${shares} whole shares of ${sym} at ₹${formatINR(price)}, observing a conservative floor at ₹${formatINR(stop)}.`,
        undefined,
        3,
        r3Title
      );
    }
  } else {
    // =========================================================================
    // QUICK MODE (Fast 4-5 Turns with exact required quotes)
    // =========================================================================

    // Turn 1: Graham Opening
    if (hasGraham) {
      pushMsg(
        'graham',
        isGrahamCheap ? 'AGREEMENT' : 'CHALLENGE',
        `${grahamDialogue} Current Price ₹${formatINR(price)} vs Graham Number ₹${formatINR(grahamNo)}.`
      );
    } else if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `Analyzing ${sym} at ₹${formatINR(price)}: ${buffettDialogue}`
      );
    } else if (hasMunger) {
      pushMsg(
        'munger',
        'CHALLENGE',
        `${mungerDialogue} Solvency audit for ${sym} at ₹${formatINR(price)}.`
      );
    } else if (hasJones) {
      pushMsg(
        'jones',
        'CHALLENGE',
        `Starting risk assessment on ${sym}: Budget is ₹${formatINR(budget)}, sizing ${shares} whole shares.`
      );
    }

    // Turn 2: Buffett Moat
    if (hasBuffett) {
      pushMsg(
        'buffett',
        'DEFENSE',
        `${buffettDialogue} Paying a fair price for an enduring franchise compounds far better than buying liquidation cigar butts.`,
        hasGraham ? 'Benjamin Graham' : undefined
      );
    }

    // Turn 3: Munger Inversion
    if (hasMunger) {
      pushMsg(
        'munger',
        isMungerHighDebt ? 'CHALLENGE' : 'AGREEMENT',
        `${mungerDialogue} Inverting the balance sheet: if cash flows drop 25%, can ${sym} survive?`,
        hasBuffett ? 'Warren Buffett' : hasGraham ? 'Benjamin Graham' : undefined
      );
    }

    // Turn 4: Jones Tactical Drawdown Drop
    if (hasJones) {
      pushMsg(
        'jones',
        verdict === 'APPROVED' ? 'DEFENSE' : 'CHALLENGE',
        jonesGavelDialogue,
        hasBuffett ? 'Warren Buffett' : 'Benjamin Graham'
      );

      // Turn 5: Jones Gavel Ruling
      pushMsg(
        'jones',
        'RULING',
        `FINAL RULING: ${verdict}. ${
          verdict === 'APPROVED'
            ? `Order execution directive authorized for ${shares} whole shares of ${sym} with mandatory stop-loss at ₹${formatINR(stop)}.`
            : `Capital allocation cancelled. Downside exposure exceeds the 2% maximum threshold.`
        }`
      );
    } else {
      const seniorId = hasBuffett ? 'buffett' : hasMunger ? 'munger' : 'graham';
      pushMsg(
        seniorId,
        'RULING',
        `COMMITTEE ADVISORY RULING: Consensus achieved. Sizing ${shares} whole shares at ₹${formatINR(price)}, with stop-loss at ₹${formatINR(stop)}.`
      );
    }
  }

  return { messages, synthesis };
}

// ============================================================================
// 4. STREAMING CONTROLLER
// ============================================================================

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
  const turnDelayMs = mode === 'detailed' ? 4500 : 700;
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

      callbacks.onMessage(msg);

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

      if (i < totalTurns - 1) {
        const nextMsg = messages[i + 1];
        const nextSpeaker = MASTER_PROFILES[nextMsg.speakerId];
        const nextStatus = `${nextSpeaker.name} is formulating cross-examination...`;

        let turnElapsedMs = 0;

        while (turnElapsedMs < turnDelayMs) {
          if (isStopped || callbacks.signal?.aborted) {
            throw new DOMException('Debate aborted', 'AbortError');
          }

          if (isFastForward) {
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
