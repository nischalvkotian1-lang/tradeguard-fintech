import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Swords,
  Shield,
  Gavel,
  Check,
  Clipboard,
  ClipboardCheck,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Activity,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  DebateMessage,
  CommitteeSynthesis,
  MASTER_PROFILES,
  DebateMode,
  DebateStreamStatus,
} from '../services/debateSimulator';
import { MasterId } from '../types/agents';

export interface DebateArenaProps {
  messages: DebateMessage[];
  synthesis: CommitteeSynthesis | null;
  activeMasterIds: MasterId[];
  isStreaming: boolean;
  currentSpeakerId: MasterId | null;
  debateMode?: DebateMode;
  streamingStatus?: DebateStreamStatus | null;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onFastForward?: () => void;
  onReplay?: () => void;
  className?: string;
}

function formatTimeMinSec(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const DebateArena: React.FC<DebateArenaProps> = ({
  messages,
  synthesis,
  activeMasterIds,
  isStreaming,
  currentSpeakerId,
  debateMode = 'quick',
  streamingStatus,
  isPaused = false,
  onPause,
  onResume,
  onFastForward,
  onReplay,
  className = '',
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll, isStreaming]);

  const handleCopyTranscript = () => {
    if (messages.length === 0) return;
    const line = '==========================================';
    const lines = [
      line,
      `🏛️ TRADEGUARD MULTI-AGENT DEBATE ARENA TRANSCRIPT (${debateMode.toUpperCase()} MODE)`,
      line,
      ...messages.map((m) => {
        const targetStr = m.targetSpeakerName ? ` [Addressing ${m.targetSpeakerName}]` : '';
        const roundStr = m.round ? ` [Round ${m.round}]` : '';
        return `[${m.timestamp}]${roundStr} [${m.sentiment}] ${m.speakerName} (${m.role})${targetStr}:\n"${m.text}"\n`;
      }),
      line,
    ];

    if (synthesis) {
      lines.push(
        `🏆 COMMITTEE VERDICT: ${synthesis.consensusStance} (Score: ${synthesis.committeeScore}/100)`,
        `${synthesis.verdictTitle}`,
        `${synthesis.verdictDetails}`,
        line
      );
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSentimentBadge = (sentiment: DebateMessage['sentiment']) => {
    switch (sentiment) {
      case 'CHALLENGE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
            <Swords className="h-3 w-3 text-rose-400" />
            CHALLENGE
          </span>
        );
      case 'DEFENSE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            <Shield className="h-3 w-3 text-amber-400" />
            DEFENSE
          </span>
        );
      case 'AGREEMENT':
        return (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
            AGREEMENT
          </span>
        );
      case 'RULING':
        return (
          <span className="flex items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-cyan-200 glow-cyan">
            <Gavel className="h-3 w-3 text-cyan-300" />
            RULING
          </span>
        );
    }
  };

  const getBubbleTheme = (speakerId: MasterId) => {
    switch (speakerId) {
      case 'graham':
        return 'border-emerald-500/30 bg-navy-950/70 text-emerald-50';
      case 'buffett':
        return 'border-cyan-500/30 bg-navy-950/70 text-cyan-50';
      case 'munger':
        return 'border-blue-500/30 bg-navy-950/70 text-blue-50';
      case 'jones':
        return 'border-rose-500/30 bg-navy-950/70 text-rose-50';
    }
  };

  const getStanceTheme = (stance: CommitteeSynthesis['consensusStance']) => {
    switch (stance) {
      case 'STRONG BUY':
        return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30';
      case 'CAUTIOUS BUY':
        return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30';
      case 'NEUTRAL':
      case 'NEUTRAL / HOLD':
        return 'border-amber-500/40 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30';
      case 'AVOID':
      case 'AVOID / HIGH RISK':
      default:
        return 'border-rose-500/40 bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30';
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-cyan-500/30 bg-navy-900/90 shadow-2xl backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Arena Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 bg-navy-950/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-purple-600/20 ring-1 ring-cyan-400/40">
            <MessageSquare className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight text-white">
                Live Visible Debate Arena
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  debateMode === 'detailed'
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30'
                    : 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                }`}
              >
                {debateMode === 'detailed' ? '🔬 Detailed Audit' : '⚡ Quick Mode'}
              </span>
              {isStreaming ? (
                <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 ring-1 ring-cyan-400/30">
                  <span className={`h-1.5 w-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-cyan-400 animate-ping'}`} />
                  {isPaused ? 'Paused' : 'Live Deliberation'}
                </span>
              ) : synthesis ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  Deliberation Concluded
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-white/5">
                  Ready to Convene
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Turn-by-turn cross-examination between active Market Masters
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Pause / Resume Controls during Streaming */}
          {isStreaming && onPause && onResume && (
            <button
              onClick={isPaused ? onResume : onPause}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                isPaused
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 ring-1 ring-amber-500/30'
                  : 'border-white/10 bg-navy-850 text-slate-300 hover:border-white/20 hover:text-white'
              }`}
              title={isPaused ? 'Resume debate stream' : 'Pause debate stream'}
            >
              {isPaused ? <Play className="h-3 w-3 text-amber-400" /> : <Pause className="h-3 w-3 text-slate-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}

          {/* Fast-Forward to Verdict during Streaming */}
          {isStreaming && onFastForward && (
            <button
              onClick={onFastForward}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/25 active:scale-95"
              title="Fast-forward through turns directly to the final committee verdict"
            >
              <FastForward className="h-3 w-3 text-cyan-300" />
              <span>Fast-Forward</span>
            </button>
          )}

          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
              autoScroll
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-navy-850 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-navy-850 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-navy-750 hover:text-white"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-3 w-3 text-slate-400" />
                  <span>Copy Debate</span>
                </>
              )}
            </button>
          )}

          {onReplay && !isStreaming && messages.length > 0 && (
            <button
              onClick={onReplay}
              className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* Detailed Mode Live Duration & Progress Banner */}
      {debateMode === 'detailed' && isStreaming && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/60 via-navy-950/80 to-purple-950/60 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/40">
              <Clock className={`h-3 w-3 text-cyan-400 ${isPaused ? '' : 'animate-spin'}`} />
            </div>
            <span className="text-xs font-bold text-cyan-200">
              ⏳ Deep Audit in Progress: Round {streamingStatus?.round ?? 1} of 3
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              ({streamingStatus?.roundTitle ?? 'Valuation Anchor vs. Long-Term Franchise Value'})
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-md border border-cyan-500/30 bg-navy-900/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
              Elapsed: {formatTimeMinSec(streamingStatus?.elapsedSec ?? 0)} / ~{formatTimeMinSec(streamingStatus?.totalEstSec ?? 62)}
            </span>
            <span className="rounded-md border border-white/10 bg-navy-900/90 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              Turn {streamingStatus?.currentTurn ?? 1} of {streamingStatus?.totalTurns ?? 11}
            </span>
          </div>
        </div>
      )}

      {/* Active Masters Mini Lineup Banner */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-navy-950/40 px-4 py-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          In The Arena:
        </span>
        {activeMasterIds.map((id) => {
          const profile = MASTER_PROFILES[id];
          const isSpeakingNow = currentSpeakerId === id && isStreaming;

          return (
            <div
              key={id}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-all ${
                isSpeakingNow
                  ? `${profile.borderColor} bg-navy-850 ring-2 ring-cyan-400/50 shadow-lg scale-105`
                  : 'border-white/10 bg-navy-900/60'
              }`}
            >
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className={`h-5 w-5 rounded-full object-cover border ${profile.borderColor} ${
                  isSpeakingNow ? 'animate-pulse' : ''
                }`}
              />
              <span className="text-xs font-bold text-white whitespace-nowrap">
                {profile.name}
              </span>
              {isSpeakingNow && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Debate Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[520px] min-h-[300px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/20 mb-3">
              <MessageSquare className="h-6 w-6 text-cyan-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Arena Awaiting Deliberation</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Convene the Multi-Agent Research Committee in {debateMode === 'detailed' ? 'Detailed Audit (>60s)' : 'Quick Mode (~15s)'} to witness Benjamin Graham, Warren Buffett,
              Charlie Munger, and Paul Tudor Jones debate your trade thesis live.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLatest = index === messages.length - 1;
            const isRoundStart =
              msg.roundTitle != null &&
              (index === 0 || messages[index - 1].round !== msg.round);

            return (
              <React.Fragment key={msg.id}>
                {/* Round Header Divider Banner in Detailed Mode */}
                {isRoundStart && msg.roundTitle && (
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                    <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-navy-950 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      <Activity className="h-3 w-3 text-cyan-400" />
                      <span>{msg.roundTitle}</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                  </div>
                )}

                <div
                  className={`flex items-start gap-3 animate-fadeIn ${
                    isLatest && isStreaming ? 'glow-cyan' : ''
                  }`}
                >
                  {/* Speaker Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={msg.avatarUrl}
                      alt={msg.speakerName}
                      className={`h-11 w-11 rounded-full object-cover border-2 shadow-md ${msg.borderColor}`}
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-navy-900 ${
                        msg.speakerId === 'graham'
                          ? 'bg-emerald-400'
                          : msg.speakerId === 'buffett'
                          ? 'bg-cyan-400'
                          : msg.speakerId === 'munger'
                          ? 'bg-blue-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {msg.speakerName}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-semibold border border-white/5 ${msg.badgeBg}`}
                        >
                          {msg.role}
                        </span>
                        {msg.targetSpeakerName && (
                          <div className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 border border-white/5">
                            <ArrowRight className="h-2.5 w-2.5 text-slate-500" />
                            <span>Addressing {msg.targetSpeakerName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getSentimentBadge(msg.sentiment)}
                        <span className="font-mono text-[9px] text-slate-500">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`rounded-2xl rounded-tl-sm border p-3.5 text-xs leading-relaxed shadow-lg ${getBubbleTheme(
                        msg.speakerId
                      )}`}
                    >
                      <p className="text-slate-100 font-sans tracking-wide">
                        "{msg.text}"
                      </p>

                      {/* Indented Quote Snippet / Citation */}
                      {msg.quoteSnippet && (
                        <div className="mt-2.5 rounded-lg border-l-2 border-cyan-400/60 bg-black/30 p-2.5 text-[11px] italic text-slate-300">
                          <p className="flex items-start gap-1.5">
                            <span className="text-cyan-400 text-sm font-serif">“</span>
                            <span>{msg.quoteSnippet}</span>
                          </p>
                        </div>
                      )}

                      {/* Key Metrics Badges */}
                      {msg.keyMetrics && msg.keyMetrics.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1">
                          {msg.keyMetrics.map((km, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono"
                            >
                              <span className="text-slate-400">{km.label}:</span>
                              <span className="font-bold text-emerald-300">{km.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Live Typing / Thinking Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-3 pl-2 py-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPaused ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isPaused ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              />
            </span>
            <span className="text-xs font-mono text-cyan-300 italic animate-pulse">
              {streamingStatus?.speakerStatus ||
                (currentSpeakerId
                  ? `${MASTER_PROFILES[currentSpeakerId].name} is formulating arguments...`
                  : 'Committee analyzing thesis cross-examinations...')}
            </span>
          </div>
        )}
      </div>

      {/* Committee Synthesis Footer Banner */}
      {synthesis && (
        <div
          className={`border-t p-4 sm:p-5 transition-all animate-fadeIn ${getStanceTheme(
            synthesis.consensusStance
          )}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                {synthesis.consensusStance === 'STRONG BUY' ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                ) : synthesis.consensusStance === 'CAUTIOUS BUY' ? (
                  <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                ) : synthesis.consensusStance === 'NEUTRAL' || synthesis.consensusStance === 'NEUTRAL / HOLD' ? (
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-rose-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Committee Synthesis Verdict
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    {synthesis.consensusStance}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {synthesis.verdictTitle}
                </h4>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-navy-950/70 px-3 py-1.5 text-right sm:min-w-[120px]">
              <span className="block text-[9px] uppercase text-slate-500 font-semibold">
                Conviction Score
              </span>
              <span className="font-mono text-lg font-bold text-white">
                {synthesis.committeeScore}
                <span className="text-xs text-slate-500">/100</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed mb-3">
            {synthesis.verdictDetails}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Agreements */}
            <div className="rounded-lg border border-white/10 bg-navy-950/60 p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5 text-emerald-300 font-bold text-[11px] uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Consensus Alignments</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {synthesis.keyAgreements.map((ag, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{ag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dissents */}
            <div className="rounded-lg border border-white/10 bg-navy-950/60 p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5 text-amber-300 font-bold text-[11px] uppercase tracking-wide">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Points of Friction</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {synthesis.keyDissents.map((ds, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{ds}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebateArena;
