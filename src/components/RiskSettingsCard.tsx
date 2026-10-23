import React from 'react';
import { Shield, Wallet, Sliders, ShieldAlert, Check, X } from 'lucide-react';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'custom';

export interface RiskProfileOption {
  key: 'low' | 'moderate' | 'high';
  label: string;
  badge: string;
  stopLossPct: number;
  rrRatio: number;
  displayText: string;
}

export const RISK_PROFILES: RiskProfileOption[] = [
  {
    key: 'low',
    label: 'Low Risk',
    badge: 'Conservative',
    stopLossPct: 3.0,
    rrRatio: 3.0,
    displayText: 'Conservative • 3% SL',
  },
  {
    key: 'moderate',
    label: 'Moderate Risk',
    badge: 'Balanced',
    stopLossPct: 6.0,
    rrRatio: 2.0,
    displayText: 'Balanced • 6% SL',
  },
  {
    key: 'high',
    label: 'High Risk',
    badge: 'Aggressive',
    stopLossPct: 10.0,
    rrRatio: 1.5,
    displayText: 'Aggressive • 10% SL',
  },
];

export interface BudgetPresetOption {
  label: string;
  value: number;
}

export const BUDGET_CHIPS = [10000, 25000, 50000, 100000, 200000];

export const BUDGET_PRESETS: BudgetPresetOption[] = [
  { label: '₹10K', value: 10000 },
  { label: '₹25K', value: 25000 },
  { label: '₹50K', value: 50000 },
  { label: '₹1L', value: 100000 },
  { label: '₹2L', value: 200000 },
];

export interface RiskSettingsCardProps {
  capitalRaw: string;
  setCapitalRaw: (v: string) => void;
  currency?: string;
  riskLevel: RiskLevel;
  onSelectRiskLevel: (level: 'low' | 'moderate' | 'high') => void;
  stopLossPct: number;
  onStopLossChange: (pct: number) => void;
  livePrice?: number | null;
  className?: string;
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

export const RiskSettingsCard: React.FC<RiskSettingsCardProps> = ({
  capitalRaw,
  setCapitalRaw,
  currency = '₹',
  riskLevel,
  onSelectRiskLevel,
  stopLossPct,
  onStopLossChange,
  livePrice,
  className = '',
}) => {
  const currentBudget = parseFloat(capitalRaw.replace(/[^0-9.]/g, '')) || 0;

  // Compute planned exit price if live price is available
  const plannedExitPrice = livePrice != null && livePrice > 0
    ? Number((livePrice * (1 - stopLossPct / 100)).toFixed(2))
    : null;

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow the user to backspace and clear the input completely
    if (raw === '') {
      setCapitalRaw('');
      return;
    }

    // Strip non-numeric characters (handles pasting e.g. "₹50,000" or "50,000")
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      setCapitalRaw('');
      return;
    }

    // Prevent forced leading zeros while allowing single '0'
    const formatted = digitsOnly.replace(/^0+(?=\d)/, '');
    setCapitalRaw(formatted);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onStopLossChange(val);
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-navy-900/70 p-5 backdrop-blur-sm relative ${className}`}
    >
      {/* Header Label */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Shield className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Step 2: Budget & Risk Settings</h2>
          <p className="text-[11px] text-slate-500">
            Define your capital, risk tolerance, and stop-loss buffer
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Section 1: Total Budget */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Trade Capital Allocation ({currency})</span>
            <span className="text-[10px] text-emerald-400/90 font-mono">100% Deployed into Whole Shares</span>
          </label>

          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            {capitalRaw !== '' && (
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-400">
                {currency}
              </span>
            )}
            <input
              value={capitalRaw}
              onChange={handleCapitalChange}
              inputMode="numeric"
              placeholder={`Enter your investment capital (e.g. ${currency}50,000)`}
              className={`w-full rounded-lg border border-white/10 bg-navy-850 py-2.5 ${
                capitalRaw !== '' ? 'pl-[50px]' : 'pl-10'
              } pr-9 font-mono text-sm font-semibold text-white focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-500`}
            />
            {capitalRaw !== '' && (
              <button
                type="button"
                onClick={() => setCapitalRaw('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition"
                title="Clear budget"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Budget Chips */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((preset) => {
              const active = currentBudget === preset.value;
              const chipLabel = preset.label.replace('₹', currency);
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setCapitalRaw(String(preset.value))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-navy-850 text-slate-400 hover:border-white/20 hover:bg-navy-800 hover:text-slate-200'
                  }`}
                  title={`Set capital to ${currency}${formatInt(preset.value)}`}
                >
                  {chipLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Unified Risk Profile */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span>Risk Profile</span>
            </label>
            {riskLevel === 'custom' && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Custom Stop-Loss Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {RISK_PROFILES.map((profile) => {
              const active = riskLevel === profile.key;

              return (
                <button
                  key={profile.key}
                  type="button"
                  onClick={() => onSelectRiskLevel(profile.key)}
                  className={`relative rounded-xl border p-2.5 text-left transition-all duration-200 ${
                    active
                      ? 'border-emerald-500/70 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40 text-white'
                      : 'border-white/10 bg-navy-850 hover:border-white/20 hover:bg-navy-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold ${
                        active ? 'text-emerald-300' : 'text-slate-200'
                      }`}
                    >
                      {profile.label}
                    </span>
                    {active ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-navy-950">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">{profile.badge}</span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 leading-snug">
                    {profile.displayText}
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>1:{profile.rrRatio} Target</span>
                    <span className="text-emerald-400 font-semibold">100% Deployed</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Interactive Stop-Loss Meter (Slider) */}
        <div className="rounded-xl border border-white/10 bg-navy-850/80 p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <label className="text-xs font-medium text-slate-300">
                Stop-Loss Protection
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 font-mono text-xs font-bold text-rose-300">
                -{stopLossPct.toFixed(1)}%
              </span>
              {plannedExitPrice != null && (
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
                  (Exit: <span className="text-slate-200 font-semibold">{currency}{formatINR(plannedExitPrice)}</span>)
                </span>
              )}
            </div>
          </div>

          {/* Slider input */}
          <div className="relative pt-1">
            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={stopLossPct}
              onChange={handleSliderChange}
              className="w-full h-2 bg-navy-950 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none ring-1 ring-white/10"
            />

            {/* Slider Scale Ticks */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className={stopLossPct <= 2.0 ? 'text-emerald-400 font-bold' : ''}>1.0%</span>
              <span className={Math.abs(stopLossPct - 3.0) < 0.1 ? 'text-emerald-400 font-bold' : ''}>
                3.0% (Low)
              </span>
              <span className={Math.abs(stopLossPct - 6.0) < 0.1 ? 'text-emerald-400 font-bold' : ''}>
                6.0% (Mod)
              </span>
              <span className={Math.abs(stopLossPct - 10.0) < 0.1 ? 'text-emerald-400 font-bold' : ''}>
                10.0% (High)
              </span>
              <span className={stopLossPct >= 14.5 ? 'text-emerald-400 font-bold' : ''}>15.0%</span>
            </div>
          </div>

          {/* Contextual Notice */}
          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed border-t border-white/5 pt-2">
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
            <p>
              Planned stop-loss triggers at{' '}
              <strong className="text-rose-300 font-mono">-{stopLossPct.toFixed(1)}%</strong>
              {plannedExitPrice != null ? (
                <>
                  {' '}or{' '}
                  <strong className="text-slate-200 font-mono">
                    {currency}{formatINR(plannedExitPrice)}
                  </strong>
                </>
              ) : null}
              . Protects against unexpected market gaps while respecting exchange whole-share sizing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskSettingsCard;
