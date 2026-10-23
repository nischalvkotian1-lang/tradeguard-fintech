import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Flame,
  Check,
  Plus,
  Clipboard,
  ClipboardCheck,
  MessageSquare,
  Info,
} from 'lucide-react';
import {
  AgentRole,
  AgentPerspective,
  DebateRebuttal,
  CommitteeSynthesis,
  CommitteeStage,
  AGENT_REGISTRY,
  MasterId,
  CommitteeMaster,
  COMMITTEE_MASTERS,
  ROLE_MASTER_MAP,
} from '../types/agents';
import { RiskPlanResult } from '../utils/riskEngine';
import { StockContext } from '../utils/committeeOrchestrator';
import {
  DebateMessage,
  CommitteeSynthesis as SimulatorSynthesis,
  streamDebate,
  generateDebateTranscript,
  DebateMode,
  DebateStreamStatus,
  DebateStreamControls,
} from '../services/debateSimulator';
import DebateArena from './DebateArena';

export interface AgentCommitteeCardProps {
  stock: StockContext;
  riskPlan: RiskPlanResult;
  stage: CommitteeStage;
  currentSpeakingAgent: AgentRole | null;
  progressPct: number;
  statusMessage: string;
  round1Perspectives: AgentPerspective[];
  round2Rebuttals: DebateRebuttal[];
  round3Synthesis: CommitteeSynthesis | null;
  onConvene: () => void;
  selectedMasterIds?: MasterId[];
  onSelectMasterIds?: (ids: MasterId[]) => void;
  className?: string;
}

function formatINR(val: number): string {
  const rounded = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

const MASTER_ACTIVE_BORDERS: Record<MasterId, string> = {
  graham: 'border-emerald-400',
  buffett: 'border-cyan-400',
  munger: 'border-blue-400',
  jones: 'border-rose-400',
};

const MASTER_AVATARS: Record<MasterId, string> = {
  graham: '/avatars/graham.png',
  buffett: '/avatars/buffet.png',
  munger: '/avatars/munger.png',
  jones: '/avatars/jones.png',
};

export const AgentCommitteeCard: React.FC<AgentCommitteeCardProps> = ({
  stock,
  riskPlan,
  stage,
  currentSpeakingAgent,
  progressPct,
  statusMessage,
  round1Perspectives,
  round2Rebuttals,
  round3Synthesis,
  onConvene,
  selectedMasterIds,
  onSelectMasterIds,
  className = '',
}) => {
  const [internalSelected, setInternalSelected] = useState<MasterId[]>([
    'graham',
    'buffett',
    'munger',
    'jones',
  ]);
  const activeMasterIds = selectedMasterIds ?? internalSelected;
  const setMasterIds = onSelectMasterIds ?? setInternalSelected;

  const [activeTab, setActiveTab] = useState<'arena' | 'round1' | 'round2' | 'round3'>('arena');
  const [copied, setCopied] = useState(false);
  const [guardrailAlert, setGuardrailAlert] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Live Debate Arena & Simulator State
  const [debateMode, setDebateMode] = useState<DebateMode>('quick');
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([]);
  const [simulatorSynthesis, setSimulatorSynthesis] = useState<SimulatorSynthesis | null>(null);
  const [isDebateStreaming, setIsDebateStreaming] = useState(false);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<MasterId | null>(null);
  const [streamStatus, setStreamStatus] = useState<DebateStreamStatus | null>(null);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const debateAbortRef = useRef<AbortController | null>(null);
  const streamControlsRef = useRef<DebateStreamControls | null>(null);

  const isRunning =
    stage === 'independent_analysis' ||
    stage === 'cross_examination' ||
    stage === 'synthesis_veto';
  const isCompleted = stage === 'completed';
  const hasData = round1Perspectives.length > 0;
  const isPTJActive = activeMasterIds.includes('jones');
  const hasBudget = (riskPlan?.budget ?? 0) > 0;

  const startDebateStream = useCallback(async (modeToUse: DebateMode = debateMode) => {
    if (debateAbortRef.current) {
      debateAbortRef.current.abort();
    }
    const controller = new AbortController();
    debateAbortRef.current = controller;

    setDebateMessages([]);
    setSimulatorSynthesis(null);
    setIsDebateStreaming(true);
    setCurrentSpeakerId(null);
    setIsStreamPaused(false);
    setStreamStatus(null);

    try {
      await streamDebate(
        stock,
        riskPlan,
        activeMasterIds,
        (msg) => {
          setDebateMessages((prev) => [...prev, msg]);
          setCurrentSpeakerId(msg.speakerId);
        },
        (synth) => {
          setSimulatorSynthesis(synth);
          setIsDebateStreaming(false);
          setCurrentSpeakerId(null);
          setIsStreamPaused(false);
        },
        controller.signal,
        undefined,
        modeToUse,
        (status) => {
          setStreamStatus(status);
          setIsStreamPaused(status.isPaused);
        },
        streamControlsRef
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsDebateStreaming(false);
      setCurrentSpeakerId(null);
      setIsStreamPaused(false);
    }
  }, [stock, riskPlan, activeMasterIds, debateMode]);

  const handlePauseDebate = useCallback(() => {
    streamControlsRef.current?.pause();
    setIsStreamPaused(true);
  }, []);

  const handleResumeDebate = useCallback(() => {
    streamControlsRef.current?.resume();
    setIsStreamPaused(false);
  }, []);

  const handleFastForwardDebate = useCallback(() => {
    streamControlsRef.current?.fastForward();
  }, []);

  const handleConvene = useCallback(() => {
    setActiveTab('arena');
    startDebateStream(debateMode);
    onConvene();
  }, [startDebateStream, onConvene, debateMode]);

  // Sync debate stream when committee execution begins
  useEffect(() => {
    if (stage === 'independent_analysis') {
      setActiveTab('arena');
      startDebateStream(debateMode);
    }
  }, [stage, startDebateStream, debateMode]);

  // Backfill transcript for existing data if arena is opened
  useEffect(() => {
    if (hasData && debateMessages.length === 0 && !isDebateStreaming) {
      const transcript = generateDebateTranscript(stock, riskPlan, activeMasterIds, debateMode);
      setDebateMessages(transcript.messages);
      setSimulatorSynthesis(transcript.synthesis);
    }
  }, [hasData, debateMessages.length, isDebateStreaming, stock, riskPlan, activeMasterIds, debateMode]);

  // Clear debate if stock symbol changes
  useEffect(() => {
    if (debateAbortRef.current) {
      debateAbortRef.current.abort();
    }
    setDebateMessages([]);
    setSimulatorSynthesis(null);
    setIsDebateStreaming(false);
    setCurrentSpeakerId(null);
  }, [stock.symbol]);

  const handleImgError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const handleToggleMaster = (id: MasterId) => {
    if (isRunning) return;

    if (activeMasterIds.includes(id)) {
      if (activeMasterIds.length <= 1) {
        setGuardrailAlert('Select at least 1 analyst to run the committee.');
        setTimeout(() => setGuardrailAlert(null), 3000);
        return;
      }
      setMasterIds(activeMasterIds.filter((m) => m !== id));
    } else {
      setMasterIds([...activeMasterIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (isRunning) return;
    setMasterIds(['graham', 'buffett', 'munger', 'jones']);
  };

  const handleSelectBuffettMunger = () => {
    if (isRunning) return;
    setMasterIds(['buffett', 'munger']);
  };

  const handleSelectGrahamPTJ = () => {
    if (isRunning) return;
    setMasterIds(['graham', 'jones']);
  };

  const handleCopyDebate = () => {
    if (!round3Synthesis) return;
    const line = '==========================================';
    const text = [
      line,
      `🏛️ TRADEGUARD MULTI-AGENT COMMITTEE REPORT: ${stock.symbol}`,
      `• Active Masters: ${activeMasterIds.map((id) => COMMITTEE_MASTERS.find((m) => m.id === id)?.name).join(', ')}`,
      `• Verdict: ${round3Synthesis.riskControllerSignOff.verdict}`,
      `• Consensus Stance: ${round3Synthesis.consensusStance} (Confidence: ${round3Synthesis.finalCommitteeScore}/100)`,
      `• Enforced Whole Shares: ${round3Synthesis.riskControllerSignOff.enforcedShares} shares`,
      `• Planned Stop-Loss Level: ₹${formatINR(round3Synthesis.riskControllerSignOff.enforcedStopLossPrice)}`,
      `• Max Capital Loss Capped: ₹${formatINR(round3Synthesis.riskControllerSignOff.maxCapitalLossCapped)}`,
      line,
      `📋 RISK CONTROLLER VERDICT:`,
      `${round3Synthesis.riskControllerSignOff.verdictHeadline}`,
      `${round3Synthesis.riskControllerSignOff.riskJustification}`,
      line,
      `⚖️ KEY AGREEMENT:`,
      `${round3Synthesis.keyAgreementSummary}`,
      line,
      `🔥 DISSENT & CONFLICT POINTS:`,
      ...round3Synthesis.irreconcilableDissent.map((d) => `• ${d}`),
      line,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMasterAvatar = (master: CommitteeMaster, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-7 w-7 text-[10px]',
      md: 'h-11 w-11 text-xs',
      lg: 'h-13 w-13 text-sm',
    }[size];

    const hasError = imgErrors[master.id];

    if (hasError || !master.avatarUrl) {
      return (
        <div
          className={`${sizeClasses} shrink-0 rounded-full flex items-center justify-center font-bold bg-navy-800 border ${master.borderColor} text-slate-200 shadow-inner`}
        >
          {master.initials}
        </div>
      );
    }

    return (
      <img
        src={master.avatarUrl}
        alt={master.name}
        referrerPolicy="no-referrer"
        onError={() => handleImgError(master.id)}
        className={`${sizeClasses} shrink-0 rounded-full object-cover object-top border ${master.borderColor} shadow-inner bg-navy-950`}
      />
    );
  };

  return (
    <div
      className={`rounded-2xl border border-cyan-500/30 bg-navy-900/85 p-5 sm:p-6 shadow-2xl shadow-navy-950/80 ring-1 ring-cyan-500/20 backdrop-blur-md ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-blue-600/20 to-purple-600/20 ring-1 ring-cyan-400/40 glow-cyan">
            <Users className="h-6 w-6 text-cyan-300" />
            {isRunning && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Multi-Agent Research Committee & Debate Engine
              </h2>
              <span className="rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
                Phase 5 AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select iconic Market Masters to independently stress-test {stock.symbol || 'your trade'}
            </p>
          </div>
        </div>

        {/* Mode Selector Pill & Convene Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Mode Selector Pill */}
          <div className="flex items-center rounded-xl bg-navy-950/90 border border-white/10 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => !isRunning && setDebateMode('quick')}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                debateMode === 'quick'
                  ? 'border border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/5'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Quick 4-turn executive deliberation (~15s)"
            >
              <span>⚡</span>
              <span>Quick</span>
              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-mono text-amber-200">~15s</span>
            </button>

            <button
              type="button"
              onClick={() => !isRunning && setDebateMode('detailed')}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                debateMode === 'detailed'
                  ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/5'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Deep 3-round 10-12 turn forensic master audit (>60s)"
            >
              <span>🔬</span>
              <span>Detailed Audit</span>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-mono text-cyan-200 uppercase tracking-wider">&gt;1m</span>
            </button>
          </div>

          {!hasData && !isRunning ? (
            <button
              onClick={handleConvene}
              disabled={stock.currentPrice <= 0 || !hasBudget || activeMasterIds.length === 0}
              title={!hasBudget ? 'Enter budget to calculate allocation and risk limits' : undefined}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-400/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              Convene Committee ({activeMasterIds.length} Active)
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isCompleted && (
                <button
                  onClick={handleCopyDebate}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-navy-750 hover:text-white"
                  title="Copy full committee debate"
                >
                  {copied ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleConvene}
                disabled={isRunning || stock.currentPrice <= 0 || !hasBudget || activeMasterIds.length === 0}
                title={!hasBudget ? 'Enter budget to calculate allocation and risk limits' : undefined}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>
                  {isRunning
                    ? `Deliberating (${activeMasterIds.length})...`
                    : `Re-Convene (${activeMasterIds.length} Active)`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analysts Control Toolbar: Presets, Counter & PTJ Veto Status */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-navy-950/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Presets:
          </span>
          <button
            onClick={handleSelectAll}
            disabled={isRunning}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeMasterIds.length === 4
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-750 border border-white/5'
            } disabled:opacity-50`}
          >
            Select All (4)
          </button>
          <button
            onClick={handleSelectBuffettMunger}
            disabled={isRunning}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeMasterIds.length === 2 &&
              activeMasterIds.includes('buffett') &&
              activeMasterIds.includes('munger')
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-750 border border-white/5'
            } disabled:opacity-50`}
          >
            Buffett & Munger
          </button>
          <button
            onClick={handleSelectGrahamPTJ}
            disabled={isRunning}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeMasterIds.length === 2 &&
              activeMasterIds.includes('graham') &&
              activeMasterIds.includes('jones')
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-750 border border-white/5'
            } disabled:opacity-50`}
          >
            Graham & PTJ
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="rounded-full bg-navy-800 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            Active Analysts: <strong className="text-white">{activeMasterIds.length}</strong> / 4
          </span>

          {isPTJActive ? (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              <span>PTJ Binding Veto: Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>No PTJ Veto (Advisory Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Guardrail Warning Banner */}
      {guardrailAlert && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 text-xs text-amber-200 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>{guardrailAlert}</span>
        </div>
      )}

      {/* 4 Market Masters Interactive Lineup */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COMMITTEE_MASTERS.map((master) => {
          const isSelected = activeMasterIds.includes(master.id);

          return (
            <button
              key={master.id}
              onClick={() => handleToggleMaster(master.id)}
              disabled={isRunning}
              type="button"
              className={`relative flex flex-col items-center p-3.5 rounded-xl border transition-all text-center select-none ${
                isSelected
                  ? `bg-navy-800/80 ${master.borderColor} ring-1 ring-white/10 shadow-lg`
                  : 'bg-navy-950/40 border-white/5 hover:bg-navy-900/40 hover:border-white/20'
              } ${isRunning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-white/20'}`}
            >
              {/* Master Circular Profile Container */}
              <div className="relative mb-2.5">
                <img
                  src={master.avatarUrl}
                  alt={master.name}
                  className={`w-14 h-14 rounded-full object-cover border-2 shadow-md ${
                    MASTER_ACTIVE_BORDERS[master.id]
                  } ${!isSelected ? 'grayscale opacity-40' : ''}`}
                />
                {isSelected ? (
                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-navy-950 shadow-md ring-2 ring-navy-900 transition-colors">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-slate-400 border border-white/10 transition-colors">
                    <Plus className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Master Name & Role */}
              <div className="min-w-0 w-full">
                <h4
                  className={`text-xs font-bold truncate ${
                    isSelected ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {master.name}
                </h4>
                <span
                  className={`block text-[10px] font-semibold mt-0.5 truncate ${
                    isSelected ? master.badgeBg : 'text-slate-500'
                  }`}
                >
                  {master.role}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">
                  {master.ideology}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress & Live Deliberation Banner */}
      {isRunning && (
        <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-200">
                {currentSpeakingAgent ? `${currentSpeakingAgent} is speaking...` : 'Committee Active'}
              </span>
            </div>
            <span className="font-mono text-xs font-semibold text-cyan-300">{progressPct}%</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-950">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-slate-400 leading-snug font-mono">
            {statusMessage}
          </p>
        </div>
      )}

      {/* Interactive Stage Stepper */}
      {(hasData || isRunning || debateMessages.length > 0) && (
        <div className="mt-5 border-b border-white/10 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* TAB 0: Live Debate Arena */}
            <button
              onClick={() => setActiveTab('arena')}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                activeTab === 'arena'
                  ? 'border-cyan-400/60 bg-cyan-500/10 glow-cyan ring-1 ring-cyan-400/30'
                  : 'border-white/5 bg-navy-850/60 hover:border-white/15 hover:bg-navy-800'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  activeTab === 'arena' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`block truncate text-xs font-bold ${
                      activeTab === 'arena' ? 'text-cyan-200' : 'text-slate-300'
                    }`}
                  >
                    Debate Arena
                  </span>
                  {isDebateStreaming && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <span className="block truncate text-[10px] text-slate-400">
                  {isDebateStreaming
                    ? 'Deliberating Live...'
                    : debateMessages.length > 0
                    ? `${debateMessages.length} Turns`
                    : 'Interactive Arena'}
                </span>
              </div>
            </button>

            {/* TAB 1: Round 1 — Analysis */}
            <button
              onClick={() => setActiveTab('round1')}
              disabled={round1Perspectives.length === 0}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'round1'
                  ? 'border-emerald-400/60 bg-emerald-500/10 ring-1 ring-emerald-400/30'
                  : 'border-white/5 bg-navy-850/60 hover:border-white/15 hover:bg-navy-800'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  activeTab === 'round1' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                1
              </div>
              <div className="min-w-0">
                <span
                  className={`block truncate text-xs font-bold ${
                    activeTab === 'round1' ? 'text-emerald-200' : 'text-slate-300'
                  }`}
                >
                  Round 1: Analysis
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {round1Perspectives.length} Perspectives
                </span>
              </div>
            </button>

            {/* TAB 2: Round 2 — Debate */}
            <button
              onClick={() => setActiveTab('round2')}
              disabled={round2Rebuttals.length === 0}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'round2'
                  ? 'border-amber-400/60 bg-amber-500/10 ring-1 ring-amber-400/30'
                  : 'border-white/5 bg-navy-850/60 hover:border-white/15 hover:bg-navy-800'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  activeTab === 'round2' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                2
              </div>
              <div className="min-w-0">
                <span
                  className={`block truncate text-xs font-bold ${
                    activeTab === 'round2' ? 'text-amber-200' : 'text-slate-300'
                  }`}
                >
                  Round 2: Debate
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {round2Rebuttals.length > 0 ? `${round2Rebuttals.length} Rebuttals` : 'Solo Analysis'}
                </span>
              </div>
            </button>

            {/* TAB 3: Round 3 — Verdict */}
            <button
              onClick={() => setActiveTab('round3')}
              disabled={!round3Synthesis}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'round3'
                  ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/30'
                  : 'border-white/5 bg-navy-850/60 hover:border-white/15 hover:bg-navy-800'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  activeTab === 'round3' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                3
              </div>
              <div className="min-w-0">
                <span
                  className={`block truncate text-xs font-bold ${
                    activeTab === 'round3' ? 'text-cyan-200' : 'text-slate-300'
                  }`}
                >
                  Round 3: Verdict
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {isPTJActive ? 'Risk Veto & Sizing' : 'Advisory Sign-Off'}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Body per Tab */}
      <div className="mt-5">
        {/* Empty State when committee not yet run */}
        {!hasData && !isRunning && debateMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-navy-850/40 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/20 mb-3">
              <Users className="h-7 w-7 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Committee Ready</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
              Launch a live multi-agent deliberation between {activeMasterIds.length} selected Market
              Masters to stress-test your trade thesis before order placement.
            </p>

            {/* Mode Selector in Empty State */}
            <div className="mt-4 mb-2 flex items-center justify-center gap-1.5 p-1 rounded-xl bg-navy-950/90 border border-white/10 max-w-md w-full">
              <button
                type="button"
                onClick={() => setDebateMode('quick')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  debateMode === 'quick'
                    ? 'border border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/5'
                }`}
              >
                <span>⚡ Quick Debate (~15s)</span>
              </button>
              <button
                type="button"
                onClick={() => setDebateMode('detailed')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  debateMode === 'detailed'
                    ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/5'
                }`}
              >
                <span>🔬 Detailed Audit (&gt;1m)</span>
              </button>
            </div>

            <button
              onClick={handleConvene}
              disabled={stock.currentPrice <= 0 || !hasBudget || activeMasterIds.length === 0}
              className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-400/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              {!hasBudget
                ? 'Enter Budget to Convene Committee'
                : `Convene ${debateMode === 'detailed' ? 'Detailed Audit' : 'Quick Debate'} for ${stock.symbol || 'Selected Stock'}`}
            </button>
            {stock.currentPrice > 0 && !hasBudget && (
              <p className="mt-2.5 text-xs text-cyan-300 font-medium flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Enter budget to calculate allocation and risk limits</span>
              </p>
            )}
          </div>
        )}

        {/* TAB 0: Live Visible Debate Arena */}
        {(hasData || isRunning || debateMessages.length > 0) && activeTab === 'arena' && (
          <DebateArena
            messages={debateMessages}
            synthesis={simulatorSynthesis}
            activeMasterIds={activeMasterIds}
            isStreaming={isDebateStreaming}
            currentSpeakerId={currentSpeakerId}
            debateMode={debateMode}
            streamingStatus={streamStatus}
            isPaused={isStreamPaused}
            onPause={handlePauseDebate}
            onResume={handleResumeDebate}
            onFastForward={handleFastForwardDebate}
            onReplay={() => startDebateStream(debateMode)}
          />
        )}

        {/* TAB 1: Round 1 — Independent Perspectives */}
        {hasData && activeTab === 'round1' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Stage 1: Independent Specialist Perspectives
              </span>
              <span className="text-[11px] text-slate-500">
                {round1Perspectives.length} Unbiased Evaluations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {round1Perspectives.map((p) => {
                const meta = AGENT_REGISTRY[p.agentRole];
                const masterId = ROLE_MASTER_MAP[p.agentRole];
                const master = COMMITTEE_MASTERS.find((m) => m.id === masterId);

                const stanceStyles = {
                  Bullish: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                  Neutral: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                  Cautious: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                  Bearish: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                }[p.stance];

                return (
                  <div
                    key={p.agentRole}
                    className={`rounded-xl border ${meta.borderClass} ${meta.bgClass} p-4 flex flex-col justify-between transition hover:border-white/20`}
                  >
                    <div>
                      {/* Agent Header with Avatar */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          {master && renderMasterAvatar(master, 'sm')}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {master?.name ?? p.agentRole}
                              </h4>
                              <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-slate-300 border border-white/5">
                                {meta.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {p.agentRole} • {master?.ideology}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${stanceStyles}`}>
                            {p.stance}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Confidence: <span className="font-bold text-white">{p.confidenceScore}%</span>
                          </span>
                        </div>
                      </div>

                      {/* Core Thesis */}
                      <p className="text-xs text-slate-200 leading-relaxed bg-navy-950/60 p-3 rounded-lg border border-white/5 mb-3 italic">
                        "{p.coreThesis}"
                      </p>

                      {/* Benjamin Graham Brain Quantitative Valuation Card */}
                      {p.grahamAnalysis && (
                        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 block">
                                Graham Number Valuation
                              </span>
                              <span className="font-mono text-sm font-bold text-white">
                                ₹{formatINR(p.grahamAnalysis.grahamNumber)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                                Margin of Safety
                              </span>
                              <span
                                className={`font-mono text-xs font-bold ${
                                  p.grahamAnalysis.marginOfSafetyPct >= 0
                                    ? 'text-emerald-300'
                                    : p.grahamAnalysis.marginOfSafetyPct >= -20
                                    ? 'text-amber-300'
                                    : 'text-rose-400'
                                }`}
                              >
                                {p.grahamAnalysis.marginOfSafetyPct >= 0 ? '+' : ''}
                                {p.grahamAnalysis.marginOfSafetyPct}%
                              </span>
                            </div>
                          </div>

                          {/* 5-Rule Checklist */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.grahamAnalysis.checklist.peCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>P/E &le; 20</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.grahamAnalysis.checklist.pbCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>P/B &le; 2.5</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.grahamAnalysis.checklist.grahamMultiplierCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>P/E &times; P/B &le; 22.5</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.grahamAnalysis.checklist.debtCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>D/E &le; 1.0</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              {p.grahamAnalysis.checklist.liquidityCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Current Ratio &ge; 1.2</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Warren Buffett Brain Quantitative Moat & Compounding Card */}
                      {p.buffettAnalysis && (
                        <div className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5">
                          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-cyan-400 block">
                                Economic Moat Classification
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wide ${
                                    p.buffettAnalysis.moatStrength === 'WIDE'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : p.buffettAnalysis.moatStrength === 'NARROW'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {p.buffettAnalysis.moatStrength} MOAT
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                                Pricing Power
                              </span>
                              <span className="font-mono text-xs font-bold text-white">
                                {p.buffettAnalysis.pricingPowerScore}
                                <span className="text-[10px] text-slate-400">/100</span>
                              </span>
                            </div>
                          </div>

                          {/* 5-Rule Buffett Checklist */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.buffettAnalysis.checklist.roeCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>ROE &ge; 15%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.buffettAnalysis.checklist.operatingMarginCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Op Margin &ge; 14%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.buffettAnalysis.checklist.conservativeDebtCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>D/E &le; 0.80</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.buffettAnalysis.checklist.valuationSanityCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>P/E &le; 32 (Fair Price)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              {p.buffettAnalysis.checklist.fcfPositiveCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Positive Cash Flow Stability</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Charlie Munger Brain Quantitative Inversion & Solvency Card */}
                      {p.mungerAnalysis && (
                        <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5">
                          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2 mb-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-blue-400 block">
                                Solvency & Inversion Audit
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wide ${
                                    p.mungerAnalysis.solvencyStatus === 'PRISTINE'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : p.mungerAnalysis.solvencyStatus === 'ADEQUATE'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {p.mungerAnalysis.solvencyStatus}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                                Fragility Rating
                              </span>
                              <span
                                className={`font-mono text-xs font-bold ${
                                  p.mungerAnalysis.fragilityRating === 'LOW'
                                    ? 'text-emerald-300'
                                    : p.mungerAnalysis.fragilityRating === 'MODERATE'
                                    ? 'text-amber-300'
                                    : 'text-rose-400'
                                }`}
                              >
                                {p.mungerAnalysis.fragilityRating}
                              </span>
                            </div>
                          </div>

                          {/* 5-Rule Munger Checklist */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.mungerAnalysis.checklist.noExcessiveDebtCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>D/E &le; 0.70</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.mungerAnalysis.checklist.interestCoverageCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Coverage Cushion</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.mungerAnalysis.checklist.capitalDisciplineCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Capital Discipline</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.mungerAnalysis.checklist.valuationRationalityCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>P/E &le; 35 (Rational)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              {p.mungerAnalysis.checklist.inversionTestPassed ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Inversion Test: Anti-Fragile</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Paul Tudor Jones Brain Quantitative Risk Control & Veto Card */}
                      {p.jonesAnalysis && (
                        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
                          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2 mb-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400 block">
                                Binding Risk Controller Verdict
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wide ${
                                    p.jonesAnalysis.verdict === 'APPROVED'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : p.jonesAnalysis.verdict === 'CONDITIONAL_APPROVAL'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {p.jonesAnalysis.verdict}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                                Asymmetric Payoff
                              </span>
                              <span className="font-mono text-xs font-bold text-white">
                                {p.jonesAnalysis.riskRewardRatio} R:R
                              </span>
                            </div>
                          </div>

                          {/* Execution Directive */}
                          <div className="mb-2 rounded bg-navy-950/70 p-1.5 text-[10px] text-slate-300 border border-rose-500/20 font-mono">
                            <span className="text-rose-400 font-bold uppercase block text-[8px] tracking-wider mb-0.5">
                              Execution Directive
                            </span>
                            {p.jonesAnalysis.executionDirective}
                          </div>

                          {/* 5-Rule Jones Checklist */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.jonesAnalysis.checklist.wholeShareCapacityCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Whole Share Sizing</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.jonesAnalysis.checklist.asymmetricRewardCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Asymmetry &ge; 1.5 R:R</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.jonesAnalysis.checklist.lossCappedCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Capped Rupee Loss</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {p.jonesAnalysis.checklist.liquidityCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Market Liquidity</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              {p.jonesAnalysis.checklist.stopLossEnforcedCheck ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                              )}
                              <span>Stop-Loss Floor Enforced</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Supporting Points */}
                      <div className="space-y-1.5 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Key Arguments
                        </span>
                        {p.supportingDataPoints.map((pt, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>

                      {/* Red Flags */}
                      {p.redFlags.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                            Flagged Risks
                          </span>
                          {p.redFlags.map((rf, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{rf}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Citations Footer */}
                    <div className="border-t border-white/5 pt-2 flex flex-wrap gap-1.5">
                      {p.keyCitations.map((cit, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-navy-950/80 px-2 py-0.5 font-mono text-[9px] text-slate-400 border border-white/5"
                        >
                          {cit}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Round 2 — Cross-Examination Debate & Rebuttals */}
        {hasData && activeTab === 'round2' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Stage 2: Cross-Examination Debate & Rebuttals
              </span>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {round2Rebuttals.length} Active Challenges
              </span>
            </div>

            {round2Rebuttals.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-navy-850/50 p-6 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                  Cross-Examination Skipped
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Only 1 analyst was selected for this committee session. Cross-examination debate requires
                  at least 2 active masters to challenge and cross-examine theses.
                </p>
              </div>
            ) : (
              <>
                {/* Dissent & Disagreement Panel */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                      Dissent & Disagreement Highlights
                    </h4>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed mb-3">
                    Active analysts raised ideological and empirical challenges between forward growth,
                    margin of safety, and downside stop-loss discipline:
                  </p>
                  <div className="space-y-2">
                    {round2Rebuttals.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-navy-950/60 p-2.5"
                      >
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-300 shrink-0">
                          {r.disagreementFlag.conflictType}
                        </span>
                        <span className="text-xs text-slate-300 leading-snug">
                          {r.disagreementFlag.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rebuttal Dialogue Cards */}
                <div className="space-y-3">
                  {round2Rebuttals.map((r) => {
                    const speakerMeta = AGENT_REGISTRY[r.speakingAgent];
                    const targetMeta = AGENT_REGISTRY[r.targetAgent];
                    const speakerMaster = COMMITTEE_MASTERS.find(
                      (m) => m.id === ROLE_MASTER_MAP[r.speakingAgent]
                    );
                    const targetMaster = COMMITTEE_MASTERS.find(
                      (m) => m.id === ROLE_MASTER_MAP[r.targetAgent]
                    );

                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-navy-850/80 p-4 transition hover:border-white/20"
                      >
                        {/* Speaker to Target Indicator with Avatars */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {speakerMaster && renderMasterAvatar(speakerMaster, 'sm')}
                              <div>
                                <span className="block text-xs font-bold text-white">
                                  {speakerMaster?.name ?? r.speakingAgent}
                                </span>
                                <span className={`text-[9px] font-semibold ${speakerMeta.textClass}`}>
                                  {r.speakingAgent}
                                </span>
                              </div>
                            </div>

                            <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />

                            <div className="flex items-center gap-2">
                              {targetMaster && renderMasterAvatar(targetMaster, 'sm')}
                              <div>
                                <span className="block text-xs font-bold text-white">
                                  {targetMaster?.name ?? r.targetAgent}
                                </span>
                                <span className={`text-[9px] font-semibold ${targetMeta.textClass}`}>
                                  {r.targetAgent}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                            {r.disagreementFlag.severity} Disagreement
                          </span>
                        </div>

                        {/* Contested Claim */}
                        <div className="mb-2.5 rounded bg-navy-950/70 p-2 text-[11px] text-slate-400 border border-white/5">
                          <span className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">
                            Contested Claim
                          </span>
                          "{r.targetClaim}"
                        </div>

                        {/* Rebuttal Text */}
                        <div className="text-xs text-slate-200 leading-relaxed mb-3">
                          <span className="font-semibold text-cyan-300 mr-1.5">Rebuttal:</span>
                          {r.rebuttalArgument}
                        </div>

                        {/* Counter Evidence */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Counter Evidence Presented
                          </span>
                          {r.counterEvidence.map((ev, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                              <span className="h-1 w-1 rounded-full bg-cyan-400" />
                              <span>{ev}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: Round 3 — Committee Synthesis & Risk Controller Veto */}
        {hasData && activeTab === 'round3' && round3Synthesis && (
          <div className="space-y-5">
            {/* Risk Controller Verdict Banner */}
            {(() => {
              const verdict = round3Synthesis.riskControllerSignOff.verdict;
              const isApproved = verdict === 'APPROVED';
              const isConditional = verdict === 'CONDITIONAL_APPROVAL';

              const bannerStyles = isApproved
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30'
                : isConditional
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30';

              const Icon = isApproved ? ShieldCheck : isConditional ? AlertTriangle : ShieldAlert;
              const ptjMaster = COMMITTEE_MASTERS.find((m) => m.id === 'jones');

              return (
                <div className={`rounded-xl border p-5 ${bannerStyles}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        {isPTJActive && ptjMaster ? (
                          renderMasterAvatar(ptjMaster, 'sm')
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {isPTJActive
                              ? 'Paul Tudor Jones — Risk Controller Verdict'
                              : 'Committee Advisory Verdict (No PTJ Veto)'}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                                : isConditional
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                            }`}
                          >
                            {verdict}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {round3Synthesis.riskControllerSignOff.verdictHeadline}
                        </h3>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-navy-950/70 p-2.5 text-right sm:min-w-[140px]">
                      <span className="block text-[10px] uppercase text-slate-500 font-semibold">
                        Committee Score
                      </span>
                      <span className="font-mono text-xl font-bold text-white">
                        {round3Synthesis.finalCommitteeScore}
                        <span className="text-xs text-slate-500">/100</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-200 mb-4">
                    {round3Synthesis.riskControllerSignOff.riskJustification}
                  </p>

                  {/* Enforced Parameters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-white/10 bg-navy-950/80 p-3.5 mb-4">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-semibold">
                        Enforced Whole Shares
                      </span>
                      <span className="font-mono text-lg font-bold text-emerald-300">
                        {round3Synthesis.riskControllerSignOff.enforcedShares} shares
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-semibold">
                        Mandatory Stop-Loss Floor
                      </span>
                      <span className="font-mono text-lg font-bold text-rose-400">
                        ₹{formatINR(round3Synthesis.riskControllerSignOff.enforcedStopLossPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-semibold">
                        Capped Rupee Loss
                      </span>
                      <span className="font-mono text-lg font-bold text-amber-300">
                        ₹{formatINR(round3Synthesis.riskControllerSignOff.maxCapitalLossCapped)}
                      </span>
                    </div>
                  </div>

                  {/* Mandatory Conditions List */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Enforced Execution Directives
                    </span>
                    {round3Synthesis.riskControllerSignOff.mandatoryConditions.map((cond, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                        <Lock className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{cond}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 italic border-t border-white/5 pt-2">
                    {round3Synthesis.riskControllerSignOff.liquidityAssessment}
                  </div>
                </div>
              );
            })()}

            {/* Committee Agreement & Dissent Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-navy-850/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Core Committee Consensus
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {round3Synthesis.keyAgreementSummary}
                </p>
                <div className="rounded bg-navy-950/70 p-2.5 font-mono text-xs text-emerald-300 border border-white/5">
                  Consensus Recommendation: <span className="font-bold">{round3Synthesis.consensusStance}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-navy-850/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Persistent Dissent Points
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {round3Synthesis.irreconcilableDissent.map((dis, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{dis}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCommitteeCard;
