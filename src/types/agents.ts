import { RiskPlanResult } from '../utils/riskEngine';
import type { GrahamAnalysisResult, StockMetrics } from '../agents/benjaminGraham';
import type { BuffettAnalysisResult } from '../agents/warrenBuffett';
import type { MungerAnalysisResult } from '../agents/charlieMunger';
import type { JonesAnalysisResult, TradeParameters } from '../agents/paulTudorJones';

export type {
  GrahamAnalysisResult,
  StockMetrics,
  BuffettAnalysisResult,
  MungerAnalysisResult,
  JonesAnalysisResult,
  TradeParameters,
};

export type AgentRole =
  | 'Value Specialist'
  | 'Growth Specialist'
  | 'Quality Auditor'
  | 'Risk Controller';

export type MasterId = 'graham' | 'buffett' | 'munger' | 'jones';

export interface CommitteeMaster {
  id: MasterId;
  name: string;
  role: AgentRole;
  ideology: string;
  avatarUrl: string;
  borderColor: string;
  badgeBg: string;
  initials: string;
}

export const COMMITTEE_MASTERS: CommitteeMaster[] = [
  {
    id: 'graham',
    name: 'Benjamin Graham',
    role: 'Value Specialist',
    ideology: 'Deep Value & Margin of Safety',
    avatarUrl: '/avatars/graham.png',
    borderColor: 'border-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    initials: 'BG',
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    role: 'Growth Specialist',
    ideology: 'Economic Moats & Compounding',
    avatarUrl: '/avatars/buffet.png',
    borderColor: 'border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400',
    initials: 'WB',
  },
  {
    id: 'munger',
    name: 'Charlie Munger',
    role: 'Quality Auditor',
    ideology: 'Quality & Solvency Inversion',
    avatarUrl: '/avatars/munger.png',
    borderColor: 'border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400',
    initials: 'CM',
  },
  {
    id: 'jones',
    name: 'Paul Tudor Jones',
    role: 'Risk Controller',
    ideology: 'Capital Preservation & Risk Control',
    avatarUrl: '/avatars/jones.png',
    borderColor: 'border-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400',
    initials: 'PTJ',
  },
];

export const MASTER_ROLE_MAP: Record<MasterId, AgentRole> = {
  graham: 'Value Specialist',
  buffett: 'Growth Specialist',
  munger: 'Quality Auditor',
  jones: 'Risk Controller',
};

export const ROLE_MASTER_MAP: Record<AgentRole, MasterId> = {
  'Value Specialist': 'graham',
  'Growth Specialist': 'buffett',
  'Quality Auditor': 'munger',
  'Risk Controller': 'jones',
};

export type Stance = 'Bullish' | 'Neutral' | 'Bearish' | 'Cautious';

export type ConflictSeverity = 'Mild' | 'Moderate' | 'Sharp';

export type ConflictType =
  | 'Valuation vs Growth'
  | 'Debt vs Expansion'
  | 'Downside vs Momentum'
  | 'Liquidity vs Conviction';

export type RiskVerdict = 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'VETOED';

export type CommitteeStage =
  | 'idle'
  | 'independent_analysis'
  | 'cross_examination'
  | 'synthesis_veto'
  | 'completed'
  | 'error';

/**
 * Metadata defining the visual aesthetic and mandate of each agent
 */
export interface AgentMeta {
  role: AgentRole;
  shortTitle: string;
  badge: string;
  mandate: string;
  colorTheme: 'cyan' | 'emerald' | 'amber' | 'rose';
  borderClass: string;
  bgClass: string;
  textClass: string;
  glowClass: string;
  accentHex: string;
}

export const AGENT_REGISTRY: Record<AgentRole, AgentMeta> = {
  'Value Specialist': {
    role: 'Value Specialist',
    shortTitle: 'Value',
    badge: 'Margin of Safety',
    mandate: 'Valuation multiples, discount to intrinsic value, dividend safety, and historic moat pricing.',
    colorTheme: 'cyan',
    borderClass: 'border-cyan-500/40',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-300',
    glowClass: 'glow-cyan',
    accentHex: '#22d3ee',
  },
  'Growth Specialist': {
    role: 'Growth Specialist',
    shortTitle: 'Growth',
    badge: 'Momentum & Scale',
    mandate: 'Top-line sales velocity, operating leverage, total addressable market (TAM), and sector tailwinds.',
    colorTheme: 'emerald',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-300',
    glowClass: 'text-glow-green',
    accentHex: '#10b981',
  },
  'Quality Auditor': {
    role: 'Quality Auditor',
    shortTitle: 'Quality',
    badge: 'Balance Sheet Forensic',
    mandate: 'Debt service coverage, debt-to-equity safety, ROE/ROCE return metrics, and FII/DII backing.',
    colorTheme: 'amber',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-300',
    glowClass: '',
    accentHex: '#f59e0b',
  },
  'Risk Controller': {
    role: 'Risk Controller',
    shortTitle: 'Risk Controller',
    badge: 'Chief Risk Officer & Veto Authority',
    mandate: 'Deterministic position sizing adherence, stop-loss trigger enforcement, market liquidity, and binding veto power.',
    colorTheme: 'rose',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    glowClass: 'text-glow-red',
    accentHex: '#f43f5e',
  },
};

/**
 * Round 1: Independent Agent Perspectives
 */
export interface AgentPerspective {
  agentRole: AgentRole;
  stance: Stance;
  confidenceScore: number; // 0 - 100
  coreThesis: string;
  supportingDataPoints: string[];
  redFlags: string[];
  keyCitations: string[];
  grahamAnalysis?: GrahamAnalysisResult;
  buffettAnalysis?: BuffettAnalysisResult;
  mungerAnalysis?: MungerAnalysisResult;
  jonesAnalysis?: JonesAnalysisResult;
}

/**
 * Round 2: Cross-Examination Debate Rebuttal
 */
export interface DebateRebuttal {
  id: string;
  speakingAgent: AgentRole;
  targetAgent: AgentRole;
  targetClaim: string;
  rebuttalArgument: string;
  counterEvidence: string[];
  disagreementFlag: {
    conflictType: ConflictType;
    severity: ConflictSeverity;
    summary: string;
  };
}

/**
 * Round 3: Committee Synthesis & Risk Controller Verdict
 */
export interface RiskControllerSignOff {
  verdict: RiskVerdict;
  vetoExercised: boolean;
  verdictHeadline: string;
  riskJustification: string;
  enforcedStopLossPrice: number;
  enforcedShares: number;
  maxCapitalLossCapped: number;
  mandatoryConditions: string[];
  liquidityAssessment: string;
}

export interface CommitteeSynthesis {
  consensusStance: 'Strong Buy' | 'Moderate Buy' | 'Hold / Selective' | 'Avoid / Reduce';
  averageConfidence: number; // 0 - 100
  keyAgreementSummary: string;
  irreconcilableDissent: string[];
  riskControllerSignOff: RiskControllerSignOff;
  finalCommitteeScore: number; // 0 - 100
}

/**
 * Active Session State passed to UI
 */
export interface CommitteeSession {
  symbol: string;
  companyName: string;
  currentPrice: number;
  budget: number;
  riskPlan: RiskPlanResult;
  stage: CommitteeStage;
  currentSpeakingAgent: AgentRole | null;
  progressPct: number; // 0 - 100
  statusMessage: string;
  round1Perspectives: AgentPerspective[];
  round2Rebuttals: DebateRebuttal[];
  round3Synthesis: CommitteeSynthesis | null;
  error?: string;
  timestamp: string;
}

/**
 * Streaming progress payload for real-time orchestration
 */
export interface CommitteeProgressUpdate {
  stage: CommitteeStage;
  currentSpeakingAgent: AgentRole | null;
  progressPct: number;
  statusMessage: string;
  perspectiveUpdate?: AgentPerspective;
  rebuttalUpdate?: DebateRebuttal;
  synthesisUpdate?: CommitteeSynthesis;
  error?: string;
}
