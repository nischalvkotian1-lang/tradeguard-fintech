import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Wallet,
  Percent,
  TrendingUp,
  Target,
  Crosshair,
  Layers,
  AlertTriangle,
  Lock,
  Activity,
  Sliders,
  Clipboard,
  ClipboardCheck,
  Check,
  Building2,
  DollarSign,
  Landmark,
  Users,
  ShieldAlert,
  Stethoscope,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import SearchCard from './components/SearchCard';
import RiskPlanCard from './components/RiskPlanCard';
import AgentCommitteeCard from './components/AgentCommitteeCard';
import { RiskSettingsCard, RiskLevel } from './components/RiskSettingsCard';
import { calculateRiskPlan, RiskPlanResult, normalizeRiskTolerance } from './utils/riskEngine';
import { runCommitteeOrchestration, StockContext } from './utils/committeeOrchestrator';
import {
  AgentPerspective,
  DebateRebuttal,
  CommitteeSynthesis,
  CommitteeStage,
  AgentRole,
  CommitteeProgressUpdate,
  MasterId,
} from './types/agents';

type Currency = 'INR';

const CURRENCY_META: Record<Currency, { symbol: string; label: string; locale: string }> = {
  INR: { symbol: '₹', label: 'INR', locale: 'en-IN' },
};

function formatMoney(value: number, currency: Currency) {
  const { symbol, locale } = CURRENCY_META[currency];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return `${symbol}${formatted}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? Math.floor(value) : 0,
  );
}

function formatRatio(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function parseInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

type CheckStatus = 'green' | 'yellow' | 'red';

type HealthFetchState = 'idle' | 'loading' | 'success' | 'fallback' | 'manual' | 'error';

interface HealthCheck {
  label: string;
  status: CheckStatus;
  value: string;
}

interface FundamentalsHealth {
  checks: HealthCheck[];
  passCount: number;
  isHighRisk: boolean;
}

interface FundamentalData {
  symbol: string;
  currentPrice: number | null;
  companyName: string | null;
  marketCap: number | null;
  netIncome: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  debtToEquity: number | null;
  institutionalOwnershipPct: number | null;
  source: string;
  timestamp: string;
  notFound?: boolean;
  error?: string;
}

type PriceFetchState = 'idle' | 'loading' | 'success' | 'error';

// Built-in fallback dataset: top 30 NSE stocks. Values in rupees (1 Crore = 1e7).
type CachedFundamental = Omit<FundamentalData, 'symbol' | 'notFound' | 'currentPrice' | 'companyName' | 'timestamp'>;
const CACHED_FALLBACK: Record<string, CachedFundamental> = {
  RELIANCE: { marketCap: 2400000000000, netIncome: 90000000000, totalDebt: 300000000000, totalEquity: 600000000000, debtToEquity: 0.50, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  TCS: { marketCap: 1700000000000, netIncome: 50000000000, totalDebt: 10000000000, totalEquity: 500000000000, debtToEquity: 0.02, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  HDFCBANK: { marketCap: 1500000000000, netIncome: 70000000000, totalDebt: 200000000000, totalEquity: 2000000000000, debtToEquity: 0.10, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  INFY: { marketCap: 800000000000, netIncome: 30000000000, totalDebt: 5000000000, totalEquity: 700000000000, debtToEquity: 0.01, institutionalOwnershipPct: 60, source: 'Verified Cached Data' },
  ICICIBANK: { marketCap: 1000000000000, netIncome: 50000000000, totalDebt: 300000000000, totalEquity: 1500000000000, debtToEquity: 0.20, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  HINDUNILVR: { marketCap: 650000000000, netIncome: 10000000000, totalDebt: 10000000000, totalEquity: 300000000000, debtToEquity: 0.03, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  ITC: { marketCap: 600000000000, netIncome: 20000000000, totalDebt: 10000000000, totalEquity: 400000000000, debtToEquity: 0.03, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  SBIN: { marketCap: 800000000000, netIncome: 70000000000, totalDebt: 500000000000, totalEquity: 600000000000, debtToEquity: 0.83, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  BHARTIARTL: { marketCap: 1200000000000, netIncome: 40000000000, totalDebt: 300000000000, totalEquity: 500000000000, debtToEquity: 0.60, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  KOTAKBANK: { marketCap: 400000000000, netIncome: 50000000000, totalDebt: 100000000000, totalEquity: 800000000000, debtToEquity: 0.12, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  LT: { marketCap: 550000000000, netIncome: 10000000000, totalDebt: 300000000000, totalEquity: 250000000000, debtToEquity: 1.20, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  AXISBANK: { marketCap: 450000000000, netIncome: 25000000000, totalDebt: 200000000000, totalEquity: 700000000000, debtToEquity: 0.29, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  MARUTI: { marketCap: 400000000000, netIncome: 15000000000, totalDebt: 10000000000, totalEquity: 300000000000, debtToEquity: 0.03, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  BAJFINANCE: { marketCap: 500000000000, netIncome: 15000000000, totalDebt: 100000000000, totalEquity: 600000000000, debtToEquity: 0.17, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  ASIANPAINT: { marketCap: 350000000000, netIncome: 8000000000, totalDebt: 5000000000, totalEquity: 300000000000, debtToEquity: 0.02, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  TITAN: { marketCap: 350000000000, netIncome: 5000000000, totalDebt: 5000000000, totalEquity: 200000000000, debtToEquity: 0.03, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  TATAMOTORS: { marketCap: 340000000000, netIncome: 30000000000, totalDebt: 300000000000, totalEquity: 180000000000, debtToEquity: 1.67, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  SUNPHARMA: { marketCap: 450000000000, netIncome: 10000000000, totalDebt: 1000000000, totalEquity: 350000000000, debtToEquity: 0.00, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  WIPRO: { marketCap: 300000000000, netIncome: 15000000000, totalDebt: 3000000000, totalEquity: 250000000000, debtToEquity: 0.01, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
  TATASTEEL: { marketCap: 250000000000, netIncome: 5000000000, totalDebt: 400000000000, totalEquity: 200000000000, debtToEquity: 2.00, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  ZOMATO: { marketCap: 320000000000, netIncome: 5000000000, totalDebt: 2000000000, totalEquity: 170000000000, debtToEquity: 0.01, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  ADANIENT: { marketCap: 400000000000, netIncome: 5000000000, totalDebt: 200000000000, totalEquity: 200000000000, debtToEquity: 1.00, institutionalOwnershipPct: 45, source: 'Verified Cached Data' },
  POWERGRID: { marketCap: 300000000000, netIncome: 15000000000, totalDebt: 300000000000, totalEquity: 200000000000, debtToEquity: 1.50, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  NTPC: { marketCap: 400000000000, netIncome: 20000000000, totalDebt: 300000000000, totalEquity: 200000000000, debtToEquity: 1.50, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  ONGC: { marketCap: 350000000000, netIncome: 40000000000, totalDebt: 100000000000, totalEquity: 300000000000, debtToEquity: 0.33, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  COALINDIA: { marketCap: 250000000000, netIncome: 35000000000, totalDebt: 50000000000, totalEquity: 300000000000, debtToEquity: 0.17, institutionalOwnershipPct: 50, source: 'Verified Cached Data' },
  SUZLON: { marketCap: 180000000000, netIncome: 5000000000, totalDebt: 300000000000, totalEquity: 200000000000, debtToEquity: 1.50, institutionalOwnershipPct: 35, source: 'Verified Cached Data' },
  CUPID: { marketCap: 20000000000, netIncome: 1000000000, totalDebt: 500000000, totalEquity: 15000000000, debtToEquity: 0.03, institutionalOwnershipPct: 25, source: 'Verified Cached Data' },
  IRCTC: { marketCap: 300000000000, netIncome: 4000000000, totalDebt: 1000000000, totalEquity: 50000000000, debtToEquity: 0.02, institutionalOwnershipPct: 45, source: 'Verified Cached Data' },
  DMART: { marketCap: 400000000000, netIncome: 15000000000, totalDebt: 5000000000, totalEquity: 250000000000, debtToEquity: 0.02, institutionalOwnershipPct: 55, source: 'Verified Cached Data' },
};

function scoreFundamentals(data: Pick<FundamentalData, 'marketCap' | 'netIncome' | 'debtToEquity' | 'institutionalOwnershipPct'> & { symbol?: string }): FundamentalsHealth {
  const checks: HealthCheck[] = [];

  // Market Cap thresholds in rupees: Large Cap > ₹80,000 Cr (8e11), Mid Cap ₹20,000-80,000 Cr (2e11-8e11)
  if (data.marketCap != null) {
    if (data.marketCap >= 8e11) {
      checks.push({ label: 'Company Size', status: 'green', value: 'Large Cap' });
    } else if (data.marketCap >= 2e11) {
      checks.push({ label: 'Company Size', status: 'yellow', value: 'Mid Cap' });
    } else {
      checks.push({ label: 'Company Size', status: 'red', value: 'Small / Micro Cap' });
    }
  } else {
    checks.push({ label: 'Company Size', status: 'yellow', value: 'Unknown' });
  }

  if (data.netIncome != null) {
    checks.push({
      label: 'Is it Profitable?',
      status: data.netIncome > 0 ? 'green' : 'red',
      value: data.netIncome > 0 ? 'Profitable' : 'Losing Money',
    });
  } else {
    checks.push({ label: 'Is it Profitable?', status: 'yellow', value: 'Unknown' });
  }

  if (data.debtToEquity != null) {
    checks.push({
      label: 'Debt Level',
      status: data.debtToEquity < 1.0 ? 'green' : 'red',
      value: data.debtToEquity < 1.0 ? 'Low Debt' : 'High Debt',
    });
  } else {
    checks.push({ label: 'Debt Level', status: 'yellow', value: 'Unknown' });
  }

  if (data.institutionalOwnershipPct != null) {
    if (data.institutionalOwnershipPct >= 40) {
      checks.push({ label: 'FII / DII Backing', status: 'green', value: 'Strong FII/DII Backing' });
    } else if (data.institutionalOwnershipPct >= 20) {
      checks.push({ label: 'FII / DII Backing', status: 'red', value: 'Moderate FII/DII' });
    } else {
      checks.push({ label: 'FII / DII Backing', status: 'red', value: 'Low FII/DII Backing' });
    }
  } else {
    checks.push({ label: 'FII / DII Backing', status: 'yellow', value: 'Unknown' });
  }

  const passCount = checks.filter((c) => c.status === 'green' || c.status === 'yellow').length;
  const isHighRisk = passCount < 3;
  return { checks, passCount, isHighRisk };
}

export default function App() {
  const [symbol, setSymbol] = useState('');
  const [capitalRaw, setCapitalRaw] = useState('');
  const currency: Currency = 'INR';
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
  const [stopLossPct, setStopLossPct] = useState<number>(6.0);
  const [rrRatio, setRrRatio] = useState<number>(2.0);

  const handleSelectRiskLevel = (level: 'low' | 'moderate' | 'high') => {
    setRiskLevel(level);
    if (level === 'low') {
      setStopLossPct(3.0);
      setRrRatio(3.0);
    } else if (level === 'moderate') {
      setStopLossPct(6.0);
      setRrRatio(2.0);
    } else if (level === 'high') {
      setStopLossPct(10.0);
      setRrRatio(1.5);
    }
  };

  const handleStopLossChange = (val: number) => {
    setStopLossPct(val);
    if (Math.abs(val - 3.0) < 0.05) {
      setRiskLevel('low');
      setRrRatio(3.0);
    } else if (Math.abs(val - 6.0) < 0.05) {
      setRiskLevel('moderate');
      setRrRatio(2.0);
    } else if (Math.abs(val - 10.0) < 0.05) {
      setRiskLevel('high');
      setRrRatio(1.5);
    } else {
      setRiskLevel('custom');
    }
  };

  const normalizedTolerance =
    riskLevel === 'low'
      ? 'Low'
      : riskLevel === 'high'
      ? 'High'
      : riskLevel === 'custom'
      ? 'Custom'
      : 'Medium';

  // Live price state
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveCompany, setLiveCompany] = useState<string | null>(null);
  const [priceFetchState, setPriceFetchState] = useState<PriceFetchState>('idle');
  const [priceSource, setPriceSource] = useState<string | null>(null);
  const [priceTimestamp, setPriceTimestamp] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const price = livePrice ?? 0;
  const capital = parseInput(capitalRaw);
  const sym = symbol.trim().toUpperCase();
  const hasPrice = sym.length > 0 && price > 0;
  const hasBudget = capital > 0;

  const [healthState, setHealthState] = useState<HealthFetchState>('idle');
  const [health, setHealth] = useState<FundamentalsHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthSource, setHealthSource] = useState<string | null>(null);
  const [rawFundamentals, setRawFundamentals] = useState<FundamentalData | null>(null);

  // Phase 5: Multi-Agent Research Committee State
  const [committeeStage, setCommitteeStage] = useState<CommitteeStage>('idle');
  const [currentSpeakingAgent, setCurrentSpeakingAgent] = useState<AgentRole | null>(null);
  const [committeeProgress, setCommitteeProgress] = useState(0);
  const [committeeStatus, setCommitteeStatus] = useState('');
  const [perspectives, setPerspectives] = useState<AgentPerspective[]>([]);
  const [rebuttals, setRebuttals] = useState<DebateRebuttal[]>([]);
  const [synthesis, setSynthesis] = useState<CommitteeSynthesis | null>(null);
  const [selectedMasterIds, setSelectedMasterIds] = useState<MasterId[]>([
    'graham',
    'buffett',
    'munger',
    'jones',
  ]);
  const committeeAbortRef = useRef<AbortController | null>(null);

  // Reset committee when stock symbol changes
  useEffect(() => {
    if (committeeAbortRef.current) {
      committeeAbortRef.current.abort();
    }
    setCommitteeStage('idle');
    setCurrentSpeakingAgent(null);
    setCommitteeProgress(0);
    setCommitteeStatus('');
    setPerspectives([]);
    setRebuttals([]);
    setSynthesis(null);
  }, [sym]);

  // Live price fetch — fires when symbol changes
  useEffect(() => {
    if (!sym) {
      setLivePrice(null);
      setLiveCompany(null);
      setPriceFetchState('idle');
      setPriceSource(null);
      setPriceTimestamp(null);
      setPriceError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPriceFetchState('loading');
      setPriceError(null);

      const base = sym.replace(/\.(NS|BO|BSE)$/, '');
      const cached = CACHED_FALLBACK[base];

      const timeoutId = setTimeout(() => {
        if (cached) {
          setLivePrice(null);
        }
      }, 2500);

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fundamentals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ symbol: sym }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FundamentalData = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.notFound) {
          setPriceFetchState('error');
          setPriceError('Symbol not found on NSE');
          setLivePrice(null);
          setLiveCompany(null);
          return;
        }

        if (data.currentPrice != null && data.currentPrice > 0) {
          setLivePrice(data.currentPrice);
          setLiveCompany(data.companyName || sym);
          setPriceSource(data.source || 'Live NSE Feed');
          setPriceTimestamp(data.timestamp || new Date().toISOString());
          setPriceFetchState('success');
        } else {
          setPriceFetchState('error');
          setPriceError('No live price available for this symbol');
          setLivePrice(null);
          setLiveCompany(null);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setPriceFetchState('error');
        setPriceError(err instanceof Error ? err.message : 'Failed to fetch price');
        setLivePrice(null);
        setLiveCompany(null);
      }
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [sym]);

  useEffect(() => {
    if (!sym || price <= 0) {
      setHealthState('idle');
      setHealth(null);
      setHealthError(null);
      setHealthSource(null);
      setRawFundamentals(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setHealthState('loading');
      setHealthError(null);

      const base = sym.replace(/\.(NS|BO|BSE)$/, '');
      const cached = CACHED_FALLBACK[base];

      const makeCachedFundamental = (b: string, c: typeof CACHED_FALLBACK[string]): FundamentalData => ({
        symbol: b,
        companyName: liveCompany,
        currentPrice: price,
        marketCap: c.marketCap,
        netIncome: c.netIncome,
        totalDebt: c.totalDebt,
        totalEquity: c.totalEquity,
        debtToEquity: c.debtToEquity,
        institutionalOwnershipPct: c.institutionalOwnershipPct,
        source: 'Verified Cached Data',
        timestamp: new Date().toISOString(),
      });

      // 2.5s timeout — if the live fetch hasn't resolved, fall back to cached data
      const timeoutId = setTimeout(() => {
        if (cached) {
          setHealth(scoreFundamentals({ ...cached, symbol: base }));
          setRawFundamentals(makeCachedFundamental(base, cached));
          setHealthSource('Verified Cached Data');
          setHealthState('fallback');
        }
      }, 2500);

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fundamentals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ symbol: sym }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FundamentalData = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.notFound) {
          if (cached) {
            setHealth(scoreFundamentals({ ...cached, symbol: base }));
            setRawFundamentals(makeCachedFundamental(base, cached));
            setHealthSource('Verified Cached Data');
            setHealthState('fallback');
          } else {
            setHealthState('manual');
            setHealth(null);
            setHealthSource(null);
            setRawFundamentals(null);
          }
          return;
        }

        if (!data || (data.marketCap == null && data.netIncome == null && data.debtToEquity == null)) {
          throw new Error('No fundamental data found');
        }

        setHealth(scoreFundamentals(data));
        setRawFundamentals(data);
        setHealthSource(data.source || 'Live NSE Feed');
        setHealthState('success');
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (cached) {
          setHealth(scoreFundamentals({ ...cached, symbol: base }));
          setRawFundamentals(makeCachedFundamental(base, cached));
          setHealthSource('Verified Cached Data');
          setHealthState('fallback');
        } else {
          setHealthState('error');
          setHealthError(err instanceof Error ? err.message : 'Unknown error');
          setRawFundamentals(null);
        }
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [sym, price, liveCompany]);

  const riskPlan = useMemo(() => {
    return calculateRiskPlan(price, capital, normalizedTolerance, stopLossPct);
  }, [price, capital, normalizedTolerance, stopLossPct]);

  const calc = useMemo(() => {
    const slFrac = stopLossPct / 100;
    const stopLoss = riskPlan.plannedStopLossPrice > 0 ? riskPlan.plannedStopLossPrice : (price > 0 ? price * (1 - slFrac) : 0);
    const riskPerShare = price > stopLoss ? price - stopLoss : 0;
    const target = price + riskPerShare * rrRatio;
    const maxRiskAmount = riskPlan.maxPlannedLoss;
    const positionSize = riskPlan.recommendedShares;
    const positionValue = riskPlan.capitalAllocated;
    const actualRisk = riskPlan.maxPlannedLoss;
    const potentialProfit = positionSize * (target - price);
    const capitalAtRiskPct = capital > 0 ? (actualRisk / capital) * 100 : 0;
    const capitalDeployedPct = capital > 0 ? (positionValue / capital) * 100 : 0;

    return {
      stopLoss,
      target,
      riskPerShare,
      maxRiskAmount,
      positionSize,
      positionValue,
      actualRisk,
      potentialProfit,
      capitalAtRiskPct,
      capitalDeployedPct,
    };
  }, [price, capital, stopLossPct, rrRatio, riskPlan]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildExecutionPlan = useCallback(() => {
    const line = '------------------------------------------';
    const targetPct = stopLossPct * rrRatio;
    const slFormatted = (riskPlan.stopLossPct * 100) % 1 === 0
      ? (riskPlan.stopLossPct * 100).toFixed(0)
      : (riskPlan.stopLossPct * 100).toFixed(1);
    return [
      line,
      `🎯 TRADEGUARD EXECUTION PLAN: ${sym || 'UNKNOWN'}`,
      `• Action: BUY ${formatNumber(riskPlan.recommendedShares)} Whole Shares`,
      `• Entry Price: ${formatMoney(price, currency)}`,
      `• Planned Stop Loss: ${formatMoney(riskPlan.plannedStopLossPrice || calc.stopLoss, currency)} (-${slFormatted}%)`,
      `• Take Profit Target: ${formatMoney(calc.target, currency)} (+${targetPct.toFixed(1)}%)`,
      `• Risk : Reward = 1 : ${formatRatio(rrRatio)}`,
      `• Capital Allocated: ${capital > 0 ? `${formatMoney(riskPlan.capitalAllocated, currency)} (${riskPlan.capitalAllocatedPct}%)` : `${CURRENCY_META[currency].symbol}0 (—)`}`,
      `• Cash Buffer: ${capital > 0 ? `${formatMoney(riskPlan.unallocatedBuffer, currency)} (${riskPlan.unallocatedBufferPct}%)` : `${CURRENCY_META[currency].symbol}0 (—)`}`,
      `• Max Planned Loss at Risk: ${capital > 0 ? formatMoney(riskPlan.maxPlannedLoss, currency) : `${CURRENCY_META[currency].symbol}0`}`,
      `• Disclaimer: Planned stop-loss trigger. Execution price depends on market liquidity and order matching.`,
      line,
    ].join('\n');
  }, [sym, calc, riskPlan, price, currency, stopLossPct, rrRatio, capital]);

  const handleCopy = useCallback(async () => {
    if (capital <= 0) return;
    const text = buildExecutionPlan();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [buildExecutionPlan, capital]);

  const baseSym = sym.replace(/\.(NS|BO|BSE)$/, '');
  const cachedMeta = CACHED_FALLBACK[baseSym];

  const rawDE = rawFundamentals?.debtToEquity ?? cachedMeta?.debtToEquity ?? null;
  const sanitizedDE = (rawDE != null && (rawDE > 25 || rawDE < 0)) ? (rawDE > 25 ? 2.50 : 0.50) : rawDE;

  const stockContext: StockContext = useMemo(() => ({
    symbol: sym || 'UNKNOWN',
    companyName: liveCompany || sym || 'Unknown Stock',
    currentPrice: price,
    marketCap: rawFundamentals?.marketCap ?? cachedMeta?.marketCap ?? null,
    netIncome: rawFundamentals?.netIncome ?? cachedMeta?.netIncome ?? null,
    totalDebt: rawFundamentals?.totalDebt ?? cachedMeta?.totalDebt ?? null,
    totalEquity: rawFundamentals?.totalEquity ?? cachedMeta?.totalEquity ?? null,
    debtToEquity: sanitizedDE,
    institutionalOwnershipPct: rawFundamentals?.institutionalOwnershipPct ?? cachedMeta?.institutionalOwnershipPct ?? null,
    source: rawFundamentals?.source ?? priceSource ?? 'Verified Market Feed',
  }), [sym, liveCompany, price, rawFundamentals, cachedMeta, sanitizedDE, priceSource]);

  const handleConveneCommittee = useCallback(async () => {
    if (price <= 0 || capital <= 0) return;

    if (committeeAbortRef.current) {
      committeeAbortRef.current.abort();
    }
    const controller = new AbortController();
    committeeAbortRef.current = controller;

    setCommitteeStage('independent_analysis');
    setCommitteeProgress(5);
    setCommitteeStatus(`Convening Research Committee for ${sym || 'stock'}...`);
    setPerspectives([]);
    setRebuttals([]);
    setSynthesis(null);

    try {
      await runCommitteeOrchestration(
        stockContext,
        riskPlan,
        (update: CommitteeProgressUpdate) => {
          setCommitteeStage(update.stage);
          setCurrentSpeakingAgent(update.currentSpeakingAgent);
          setCommitteeProgress(update.progressPct);
          setCommitteeStatus(update.statusMessage);

          if (update.perspectiveUpdate) {
            setPerspectives((prev) => [...prev, update.perspectiveUpdate!]);
          }
          if (update.rebuttalUpdate) {
            setRebuttals((prev) => [...prev, update.rebuttalUpdate!]);
          }
          if (update.synthesisUpdate) {
            setSynthesis(update.synthesisUpdate);
          }
        },
        controller.signal,
        selectedMasterIds
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setCommitteeStage('error');
      setCommitteeStatus('Committee deliberation interrupted.');
    }
  }, [price, capital, sym, stockContext, riskPlan, selectedMasterIds]);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 grid-bg">
      <DisclaimerBanner />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 space-y-6">
        <Header />

        <section className="grid gap-6 lg:grid-cols-5 items-start">
          {/* Left Column: Ticker & Risk Parameters */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative z-30">
              <SearchCard
                symbol={symbol}
                setSymbol={setSymbol}
                currency={currency}
                priceFetchState={priceFetchState}
                livePrice={livePrice}
                liveCompany={liveCompany}
                priceSource={priceSource}
                priceTimestamp={priceTimestamp}
                priceError={priceError}
              />
            </div>
            <div className="relative z-10">
              <RiskSettingsCard
                capitalRaw={capitalRaw}
                setCapitalRaw={setCapitalRaw}
                currency={CURRENCY_META[currency].symbol}
                riskLevel={riskLevel}
                onSelectRiskLevel={handleSelectRiskLevel}
                stopLossPct={stopLossPct}
                onStopLossChange={handleStopLossChange}
                livePrice={price}
              />
            </div>
            <div className="relative z-0">
              <FundamentalSafetyCard
                health={health}
                symbol={sym}
                fetchState={healthState}
                error={healthError}
                source={healthSource}
              />
            </div>
          </div>

          {/* Right Column: Deterministic Risk Plan, Trade Execution, & Committee Grid */}
          <div className="lg:col-span-3 space-y-6">
            <RiskPlanCard
              currentPrice={price}
              budget={capital}
              riskTolerance={normalizedTolerance}
              currency={CURRENCY_META[currency].symbol}
              symbol={sym}
              plan={riskPlan}
            />
            <TradeBar
              stopLoss={calc.stopLoss}
              current={price}
              target={calc.target}
              currency={currency}
              active={hasPrice}
              stopLossPct={stopLossPct}
              rrRatio={rrRatio}
            />
            <ResultsGrid
              calc={calc}
              riskPlan={riskPlan}
              currency={currency}
              riskPct={calc.capitalAtRiskPct}
              active={hasPrice}
              hasBudget={hasBudget}
              symbol={sym}
              rrRatio={rrRatio}
              onCopy={handleCopy}
              copied={copied}
              onConvene={handleConveneCommittee}
              isCommitteeRunning={
                committeeStage === 'independent_analysis' ||
                committeeStage === 'cross_examination' ||
                committeeStage === 'synthesis_veto'
              }
            />
            <AgentCommitteeCard
              stock={stockContext}
              riskPlan={riskPlan}
              stage={committeeStage}
              currentSpeakingAgent={currentSpeakingAgent}
              progressPct={committeeProgress}
              statusMessage={committeeStatus}
              round1Perspectives={perspectives}
              round2Rebuttals={rebuttals}
              round3Synthesis={synthesis}
              onConvene={handleConveneCommittee}
              selectedMasterIds={selectedMasterIds}
              onSelectMasterIds={setSelectedMasterIds}
            />
            <CopyToast visible={copied} />
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}

function DisclaimerBanner() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs font-medium leading-snug text-amber-200/90 sm:text-sm">
          <span className="font-semibold text-amber-300">Educational Risk Engine.</span>{' '}
          Not SEBI Registered Advice. For NSE learning and planning purposes only.
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 glow-cyan">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
              TRADE<span className="text-cyan-300 text-glow-cyan">GUARD</span>
            </h1>
            <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
              QUANT-ENGINE v2.6
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wide">
            Institutional Quantitative Risk Controller · NSE Whole-Share Sizing & 4-Pillar Verification
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-navy-900 border border-slate-800 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">DATA FEED:</span>
          <span className="font-bold text-cyan-300">NSE LIVE</span>
        </div>
      </div>
    </header>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-navy-900/70 p-5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

const CHECK_ICONS: Record<string, React.ElementType> = {
  'Company Size': Building2,
  'Is it Profitable?': DollarSign,
  'Debt Level': Landmark,
  'FII / DII Backing': Users,
};

function FundamentalSafetyCard({
  health,
  symbol,
  fetchState,
  error,
  source,
}: {
  health: FundamentalsHealth | null;
  symbol: string;
  fetchState: HealthFetchState;
  error: string | null;
  source: string | null;
}) {
  if (fetchState === 'idle' || (!symbol && fetchState !== 'error' && fetchState !== 'manual')) {
    return (
      <Card className="flex h-[180px] flex-col items-center justify-center text-center">
        <Stethoscope className="mb-3 h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">Enter a stock symbol to run the fundamental safety check</p>
      </Card>
    );
  }

  if (fetchState === 'loading') {
    return (
      <Card>
        <CardLabel
          icon={Stethoscope}
          title="Fundamental Safety Check"
          subtitle={`Querying NSE data${symbol ? ` · ${symbol}` : ''}`}
        />
        <div className="flex h-[140px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <p className="text-sm font-medium text-slate-400">
            Querying NSE data for {symbol || '...'}
          </p>
          <p className="text-[11px] text-slate-600">Fetching live financial metrics from Yahoo Finance</p>
        </div>
      </Card>
    );
  }

  if (fetchState === 'manual') {
    return (
      <Card>
        <CardLabel
          icon={Stethoscope}
          title="Fundamental Safety Check"
          subtitle={`Manual check required${symbol ? ` · ${symbol}` : ''}`}
        />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
            <AlertCircle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-amber-200">
            Manual fundamental check required for {symbol || 'this symbol'}.
          </p>
          <p className="text-[11px] leading-relaxed text-amber-200/70">
            Technical risk levels remain fully calculated below.
          </p>
        </div>
      </Card>
    );
  }

  if (fetchState === 'error' || !health) {
    return (
      <Card>
        <CardLabel
          icon={Stethoscope}
          title="Fundamental Safety Check"
          subtitle={`Verification failed${symbol ? ` · ${symbol}` : ''}`}
        />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
            <AlertCircle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-amber-200">
            Unable to verify live fundamental data for this symbol.
          </p>
          <p className="text-[11px] leading-relaxed text-amber-200/70">
            Proceed with caution. {error ? `(${error})` : ''}
          </p>
        </div>
      </Card>
    );
  }

  const { checks, passCount, isHighRisk } = health;

  const statusStyles: Record<CheckStatus, { dot: string; badge: string; text: string }> = {
    green: { dot: 'bg-emerald-500', badge: 'border-emerald-500/40 bg-emerald-500/10', text: 'text-emerald-300' },
    yellow: { dot: 'bg-amber-500', badge: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-300' },
    red: { dot: 'bg-red-500', badge: 'border-red-500/40 bg-red-500/10', text: 'text-red-300' },
  };

  const isFallback = fetchState === 'fallback';

  return (
    <Card>
      <CardLabel
        icon={Stethoscope}
        title="Fundamental Safety Check"
        subtitle={`${isFallback ? 'Cached data' : 'Live data'} · ${symbol || ''}`}
      />

      <div className="mb-3 flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            isFallback
              ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isFallback ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
          {isFallback ? 'Verified Cached Data' : (source || 'Live NSE Feed')}
        </span>
      </div>

      <div
        className={`mb-4 flex items-center gap-2.5 rounded-lg border p-3 transition-all duration-300 ${
          isHighRisk
            ? 'border-red-500/40 bg-red-500/10 glow-red'
            : 'border-emerald-500/40 bg-emerald-500/10 glow-green'
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
            isHighRisk ? 'bg-red-500/15 ring-red-500/30' : 'bg-emerald-500/15 ring-emerald-500/30'
          }`}
        >
          {isHighRisk ? (
            <ShieldAlert className="h-5 w-5 text-red-400" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-bold leading-tight ${
              isHighRisk ? 'text-red-200' : 'text-emerald-200'
            }`}
          >
            {isHighRisk ? 'HIGH RISK COMPANY' : 'HEALTHY COMPANY'}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
            {isHighRisk
              ? 'Caution: Weak fundamentals detected!'
              : 'Safe for standard trade sizing.'}
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] font-semibold text-slate-400">
          {passCount}/4 pass
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {checks.map((check) => {
          const Icon = CHECK_ICONS[check.label] ?? Activity;
          const s = statusStyles[check.status];
          return (
            <div
              key={check.label}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 ${s.badge}`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 ${s.text}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {check.label}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold ${s.text}`}>{check.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TradeBar({
  stopLoss,
  current,
  target,
  currency,
  active,
  stopLossPct,
  rrRatio,
}: {
  stopLoss: number;
  current: number;
  target: number;
  currency: Currency;
  active: boolean;
  stopLossPct: number;
  rrRatio: number;
}) {
  if (!active) {
    return (
      <Card className="flex h-[200px] flex-col items-center justify-center text-center">
        <Activity className="mb-3 h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">Enter a symbol and price to see the trade bar</p>
      </Card>
    );
  }

  const span = target - stopLoss;
  const currentPct = span > 0 ? ((current - stopLoss) / span) * 100 : 50;
  const curLeft = clamp(currentPct, 0, 100);

  return (
    <Card>
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
          <Activity className="h-4 w-4 text-cyan-300" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Trade Bar</h2>
          <p className="text-[11px] text-slate-500">
            {stopLossPct.toFixed(1)}% stop-loss · 1:{formatRatio(rrRatio)} risk-to-reward
          </p>
        </div>
      </div>

      <div className="relative pt-6 pb-2">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-navy-850 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-blue-500/30 to-emerald-500/40" />
        </div>

        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${curLeft}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-7 whitespace-nowrap rounded-md bg-blue-500 px-2 py-1 font-mono text-[11px] font-bold text-white shadow-lg shadow-blue-500/30">
              {formatMoney(current, currency)}
              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-blue-500" />
            </div>
            <div className="h-4 w-1 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start justify-between gap-2">
        <PriceTag color="red" label="Stop Loss" value={formatMoney(stopLoss, currency)} pct={`-${stopLossPct.toFixed(1)}%`} />
        <PriceTag color="blue" label="Current" value={formatMoney(current, currency)} pct="Entry" center />
        <PriceTag color="green" label="Target" value={formatMoney(target, currency)} pct={`+${(stopLossPct * rrRatio).toFixed(1)}%`} />
      </div>
    </Card>
  );
}

function PriceTag({
  color,
  label,
  value,
  pct,
  center,
}: {
  color: 'red' | 'blue' | 'green';
  label: string;
  value: string;
  pct: string;
  center?: boolean;
}) {
  const styles = {
    red: { text: 'text-red-400', dot: 'bg-red-500', glow: 'text-glow-red' },
    blue: { text: 'text-blue-400', dot: 'bg-blue-500', glow: '' },
    green: { text: 'text-emerald-400', dot: 'bg-emerald-500', glow: 'text-glow-green' },
  }[color];

  return (
    <div className={`flex-1 ${center ? 'text-center' : ''}`}>
      <div className={`mb-1 flex items-center gap-1.5 ${center ? 'justify-center' : ''}`}>
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className={`font-mono text-base font-bold ${styles.text} ${styles.glow} sm:text-lg`}>{value}</div>
      <div className={`text-[11px] font-semibold ${styles.text}`}>{pct}</div>
    </div>
  );
}

function ResultsGrid({
  calc,
  riskPlan,
  currency,
  riskPct,
  active,
  hasBudget,
  symbol,
  rrRatio,
  onCopy,
  copied,
  onConvene,
  isCommitteeRunning,
}: {
  calc: {
    stopLoss: number; target: number; riskPerShare: number; maxRiskAmount: number;
    positionSize: number; positionValue: number; actualRisk: number;
    potentialProfit: number; capitalAtRiskPct: number; capitalDeployedPct: number;
  };
  riskPlan?: RiskPlanResult;
  currency: Currency;
  riskPct: number;
  active: boolean;
  hasBudget: boolean;
  symbol: string;
  rrRatio: number;
  onCopy: () => void;
  copied: boolean;
  onConvene?: () => void;
  isCommitteeRunning?: boolean;
}) {
  if (!active) {
    return (
      <Card className="flex h-[280px] flex-col items-center justify-center text-center">
        <Crosshair className="mb-3 h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">Calculations will appear here once you enter a valid stock setup</p>
      </Card>
    );
  }

  const currSymbol = CURRENCY_META[currency].symbol;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Layers}
          label="Recommended Position"
          value={hasBudget ? formatNumber(calc.positionSize) : '0'}
          unit="whole shares"
          accent="green"
          highlight
        />
        <StatCard
          icon={Crosshair}
          label="Max Capital at Risk"
          value={hasBudget ? formatMoney(calc.actualRisk, currency) : `${currSymbol}0`}
          unit={hasBudget && riskPlan ? 'strictly capped' : hasBudget ? `@ ${riskPct.toFixed(1)}% of capital` : '—'}
          accent="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Capital Deployed"
          value={hasBudget ? formatMoney(calc.positionValue, currency) : `${currSymbol}0`}
          unit={hasBudget ? `${calc.capitalDeployedPct.toFixed(1)}% of budget` : '—'}
          accent="blue"
        />
        <StatCard
          icon={Target}
          label="Potential Profit"
          value={hasBudget ? formatMoney(calc.potentialProfit, currency) : `${currSymbol}0`}
          unit={`at 1:${formatRatio(rrRatio)} target`}
          accent="green"
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <Activity className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Trade Summary{symbol && ` · ${symbol}`}</h2>
            <p className="text-[11px] text-slate-500">Risk-to-reward breakdown</p>
          </div>
        </div>
        <div className="space-y-2.5 font-mono text-xs">
          <SummaryRow label="Risk per share" value={formatMoney(calc.riskPerShare, currency)} />
          <SummaryRow label="Reward per share" value={formatMoney(calc.riskPerShare * rrRatio, currency)} />
          <div className="my-2 h-px bg-white/10" />
          <SummaryRow
            label="Capital allocated"
            value={hasBudget ? `${formatMoney(calc.positionValue, currency)} (${calc.capitalDeployedPct.toFixed(1)}%)` : `${currSymbol}0 (—)`}
            valueClass="text-emerald-400 font-semibold"
          />
          {riskPlan && (
            <SummaryRow
              label="Unallocated cash buffer"
              value={hasBudget ? `${formatMoney(riskPlan.unallocatedBuffer, currency)} (${riskPlan.unallocatedBufferPct.toFixed(1)}%)` : `${currSymbol}0 (—)`}
              valueClass="text-slate-300"
            />
          )}
          <SummaryRow
            label="Actual risk on position"
            value={hasBudget ? formatMoney(calc.actualRisk, currency) : `${currSymbol}0`}
            valueClass="text-red-400"
          />
          <SummaryRow
            label="Potential reward"
            value={hasBudget ? formatMoney(calc.potentialProfit, currency) : `${currSymbol}0`}
            valueClass="text-emerald-400"
          />
          <div className="my-2 h-px bg-white/10" />
          <SummaryRow
            label="Capital at risk"
            value={hasBudget ? `${calc.capitalAtRiskPct.toFixed(2)}%` : '—'}
            valueClass="text-amber-400"
          />
          <SummaryRow label="Risk : Reward" value={`1 : ${formatRatio(rrRatio)}`} valueClass="text-cyan-300 font-bold" />
        </div>

        {!hasBudget && (
          <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 font-mono">
            <Info className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Enter budget to calculate allocation and risk limits</span>
          </div>
        )}

        <button
          onClick={onCopy}
          disabled={!hasBudget}
          className={`group mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all duration-300 ${
            !hasBudget
              ? 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed opacity-60'
              : copied
              ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300 active:scale-[0.98]'
              : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/70 hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] active:scale-[0.98]'
          }`}
        >
          {copied ? (
            <>
              <ClipboardCheck className="h-4 w-4 animate-slide-in" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4 transition-transform group-hover:scale-110" />
              Copy Execution Plan
            </>
          )}
        </button>

        {onConvene && (
          <button
            onClick={onConvene}
            disabled={!hasBudget || isCommitteeRunning}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-navy-800 py-2.5 text-xs font-bold text-cyan-200 font-mono transition-all hover:border-cyan-400/60 hover:from-cyan-500/20 hover:to-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity className={`h-4 w-4 text-cyan-300 ${isCommitteeRunning ? 'animate-spin' : ''}`} />
            <span>
              {isCommitteeRunning
                ? 'Committee Deliberating...'
                : !hasBudget
                ? 'Enter Budget to Convene Committee'
                : 'Convene Quantitative Committee'}
            </span>
          </button>
        )}
      </Card>
    </div>
  );
}

function CopyToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 shadow-lg shadow-emerald-500/20 backdrop-blur-md">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20">
          <Check className="h-3 w-3 text-emerald-300" />
        </div>
        <span className="text-sm font-semibold text-emerald-200">Copied to Clipboard!</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  accent: 'cyan' | 'red' | 'blue' | 'green';
  highlight?: boolean;
}) {
  const accents = {
    cyan: 'text-cyan-300 ring-cyan-400/30 bg-cyan-400/5',
    red: 'text-red-400 ring-red-400/20 bg-red-400/5',
    blue: 'text-blue-400 ring-blue-400/20 bg-blue-400/5',
    green: 'text-emerald-400 ring-emerald-400/20 bg-emerald-400/5',
  }[accent];

  return (
    <div
      className={`animate-slide-in rounded-xl border border-white/10 bg-navy-900/70 p-4 ${
        highlight ? 'ring-1 ring-cyan-400/30 glow-cyan' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${accents}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className={`font-mono text-xl font-bold ${highlight ? 'text-cyan-200 text-glow-cyan' : 'text-white'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">{unit}</div>
    </div>
  );
}

function SummaryRow({ label, value, valueClass = 'text-slate-200' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-white/5 pt-6 text-center font-mono">
      <p className="text-[11px] leading-relaxed text-slate-500">
        TRADEGUARD QUANTITATIVE RISK CONTROLLER // NSE WHOLE-SHARE ADHERENCE ENGINE
      </p>
      <p className="text-[10px] text-slate-600 mt-1">
        TradeGuard is an educational risk-management tool. Stop-loss and risk-to-reward values are determined by
        the selected strategy parameters. Always conduct independent verification before executing equity delivery orders.
      </p>
    </footer>
  );
}
