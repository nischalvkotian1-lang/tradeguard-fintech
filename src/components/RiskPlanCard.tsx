import React, { useState, useMemo } from 'react';
import {
  Layers,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calculator,
  Wallet,
  TrendingDown,
  Percent,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  calculateRiskPlan,
  RiskPlanResult,
  RiskTolerance,
  RISK_ALLOCATION_CONFIGS,
} from '../utils/riskEngine';

export interface RiskPlanCardProps {
  currentPrice: number;
  budget: number;
  riskTolerance: RiskTolerance | 'low' | 'medium' | 'moderate' | 'high' | 'custom';
  currency?: string;
  symbol?: string;
  className?: string;
  stopLossPct?: number;
  allocationPct?: number;
  plan?: RiskPlanResult;
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

export const RiskPlanCard: React.FC<RiskPlanCardProps> = ({
  currentPrice,
  budget,
  riskTolerance,
  currency = '₹',
  symbol,
  className = '',
  stopLossPct,
  allocationPct,
  plan: planProp,
}) => {
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Compute deterministic position sizing and risk plan (or use precomputed plan)
  const plan: RiskPlanResult = useMemo(() => {
    if (planProp) return planProp;
    return calculateRiskPlan(currentPrice, budget, riskTolerance, stopLossPct, allocationPct);
  }, [planProp, currentPrice, budget, riskTolerance, stopLossPct, allocationPct]);

  const config = RISK_ALLOCATION_CONFIGS[plan.riskTolerance] || RISK_ALLOCATION_CONFIGS.Medium;
  const hasValidInput = currentPrice > 0 && budget > 0;

  return (
    <div
      className={`rounded-2xl border border-emerald-500/30 bg-navy-900/80 p-5 shadow-xl shadow-navy-950/60 ring-1 ring-emerald-500/20 backdrop-blur-sm ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Deterministic Position Sizing & Stop-Loss Engine
              </h2>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                Phase 4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Whole-share allocation & protective exit thresholds{symbol ? ` · ${symbol}` : ''}
            </p>
          </div>
        </div>

        {/* Risk Profile Pill */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-300">
            {config.label} · -{((plan.stopLossPct * 100) % 1 === 0 ? (plan.stopLossPct * 100).toFixed(0) : (plan.stopLossPct * 100).toFixed(1))}% SL
          </span>
        </div>
      </div>

      {/* Edge Case / Alert Message Banner */}
      {plan.alertMessage && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
            plan.isBudgetInsufficient
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          }`}
        >
          {plan.isBudgetInsufficient ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-snug">
              {plan.isBudgetInsufficient
                ? 'Whole Share Threshold Alert'
                : budget <= 0
                ? 'Budget Required'
                : 'Notice'}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{plan.alertMessage}</p>
          </div>
        </div>
      )}

      {/* Main Metric Spotlight: Confident Whole Shares Headline */}
      <div className="mb-4 rounded-xl border border-emerald-500/30 bg-navy-850/95 p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-black/20">
        <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Recommended Trade Sizing
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-300 text-glow-green tracking-tight">
                {budget > 0 ? `${formatInt(plan.recommendedShares)} Shares` : '0 Shares'}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 font-medium">
              <span>
                Capital Deployed:{' '}
                <strong className="font-mono text-white">
                  {budget > 0 ? `${currency}${formatINR(plan.capitalAllocated)}` : `${currency}0`}
                </strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {budget > 0 ? `${plan.capitalAllocatedPct}% of Budget` : '—'}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-400">
              {budget > 0 ? (
                <>
                  Allocated from total budget of{' '}
                  <span className="font-semibold text-slate-200 font-mono">
                    {currency}{formatINR(plan.budget)}
                  </span>{' '}
                  at{' '}
                  <span className="font-semibold text-slate-200 font-mono">
                    {currency}{formatINR(plan.currentPrice)}
                  </span>
                  /share
                </>
              ) : (
                <span>Enter your investment capital to calculate whole-share allocation.</span>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-navy-900/90 p-3 sm:p-3.5 sm:min-w-[190px] shrink-0 text-left sm:text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Trade Execution Mode
            </span>
            <span className="font-mono text-base font-bold text-slate-100 block mt-0.5">
              100% Whole-Share
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 leading-tight">
              Indian Cash Delivery (NSE)
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        {/* Metric 1: Allocated Capital vs Cash Remainder */}
        <div className="rounded-xl border border-white/10 bg-navy-850/80 p-3.5 sm:p-4 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 truncate">
                <Wallet className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Capital Deployed</span>
              </span>
              <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                {budget > 0 ? `${plan.capitalAllocatedPct}%` : '—'}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-navy-950 ring-1 ring-white/10 flex">
              <div
                style={{ width: `${budget > 0 ? Math.min(100, Math.max(0, plan.capitalAllocatedPct)) : 0}%` }}
                className="bg-emerald-400 transition-all duration-500"
                title={budget > 0 ? `Allocated: ${plan.capitalAllocatedPct}%` : 'No budget entered'}
              />
              <div
                style={{ width: `${budget > 0 ? Math.min(100, Math.max(0, plan.unallocatedBufferPct)) : 0}%` }}
                className="bg-slate-600 transition-all duration-500"
                title={budget > 0 ? `Remainder: ${plan.unallocatedBufferPct}%` : ''}
              />
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 inline-block" />
                  Deployed:
                </span>
                <span className="font-bold text-emerald-300 truncate text-right">
                  {budget > 0 ? `${currency}${formatINR(plan.capitalAllocated)}` : `${currency}0`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0 inline-block" />
                  Remainder:
                </span>
                <span className="font-medium text-slate-300 truncate text-right">
                  {budget > 0 ? `${currency}${formatINR(plan.unallocatedBuffer)}` : `${currency}0`}
                </span>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-slate-400 leading-snug border-t border-white/5 pt-1.5">
              Uninvested Remainder (due to whole-share pricing):{' '}
              <span className="font-mono text-slate-300 font-semibold">
                {budget > 0 ? `${currency}${formatINR(plan.unallocatedBuffer)}` : `${currency}0`}
              </span>
            </p>
          </div>
        </div>

        {/* Metric 2: Planned Stop-Loss Level */}
        <div className="rounded-xl border border-white/10 bg-navy-850/80 p-3.5 sm:p-4 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 truncate">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Planned Stop-Loss</span>
              </span>
              <span className="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300 ring-1 ring-rose-500/30">
                -{((plan.stopLossPct * 100) % 1 === 0 ? (plan.stopLossPct * 100).toFixed(0) : (plan.stopLossPct * 100).toFixed(1))}% Trigger
              </span>
            </div>

            <div className="font-mono text-xl sm:text-2xl font-bold text-rose-400 text-glow-red truncate mt-1">
              {currentPrice > 0 ? `${currency}${formatINR(plan.plannedStopLossPrice)}` : '—'}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
              {currentPrice > 0 ? (
                <>Loss of <span className="font-mono text-slate-200 font-semibold">{currency}{formatINR(plan.riskPerShare)}</span>/share from entry</>
              ) : (
                'Awaiting stock price'
              )}
            </p>
          </div>
        </div>

        {/* Metric 3: Maximum Capital at Risk */}
        <div className="rounded-xl border border-white/10 bg-navy-850/80 p-3.5 sm:p-4 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 truncate">
                <Percent className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Max Capital at Risk</span>
              </span>
              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                {budget > 0 ? 'Strictly Capped' : '—'}
              </span>
            </div>

            <div className="font-mono text-xl sm:text-2xl font-bold text-amber-300 truncate mt-1">
              {budget > 0 ? `${currency}${formatINR(plan.maxPlannedLoss)}` : `${currency}0`}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
              {budget > 0 ? 'Capped worst-case loss if stop-loss triggers' : 'No capital currently allocated'}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Calculation Methodology Drawer */}
      <div className="mt-3 rounded-xl border border-white/10 bg-navy-850/60 overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsMethodologyOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Calculation Methodology
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
              {plan.steps.length} Transparent Steps
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{isMethodologyOpen ? 'Collapse' : 'Expand Steps'}</span>
            {isMethodologyOpen ? (
              <ChevronUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>

        {isMethodologyOpen && (
          <div className="border-t border-white/5 p-4 space-y-3.5 bg-navy-950/40">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every position size and stop-loss recommendation is deterministically computed from first principles without black-box approximations:
            </p>

            <div className="space-y-3">
              {plan.steps.map((s) => (
                <div
                  key={s.stepNumber}
                  className="rounded-lg border border-white/5 bg-navy-900/90 p-3 transition hover:border-emerald-500/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-300">
                        {s.stepNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white">{s.title}</h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      {s.result}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug mb-2">
                    {s.explanation}
                  </p>

                  <div className="space-y-1 rounded bg-navy-950/80 p-2 font-mono text-[11px] border border-white/5">
                    <div className="text-slate-500">
                      <span className="text-[10px] uppercase tracking-wider text-slate-600 mr-2 font-sans font-semibold">Formula:</span>
                      <span className="text-cyan-300/90">{s.formula}</span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-[10px] uppercase tracking-wider text-slate-600 mr-2 font-sans font-semibold">Values:</span>
                      <span className="text-emerald-300/90">{s.calculation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-white/5 bg-navy-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
        <Shield className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-300">Disclaimer:</span> Planned stop-loss trigger. Execution price depends on market liquidity and order matching.
        </p>
      </div>
    </div>
  );
};

export default RiskPlanCard;
