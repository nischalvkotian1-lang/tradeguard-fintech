import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Loader2,
  TrendingUp,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { searchStocks, NSEStock } from '../data/nseStocks';

export interface SearchCardProps {
  symbol: string;
  setSymbol: (v: string) => void;
  currency: 'INR';
  priceFetchState: 'idle' | 'loading' | 'success' | 'error';
  livePrice: number | null;
  liveCompany: string | null;
  priceSource: string | null;
  priceTimestamp: string | null;
  priceError: string | null;
  onSelectStock?: (stock: NSEStock) => void;
  className?: string;
}

function formatMoney(value: number, currency = '₹') {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return `${currency}${formatted}`;
}

export const SearchCard: React.FC<SearchCardProps> = ({
  symbol,
  setSymbol,
  currency,
  priceFetchState,
  livePrice,
  liveCompany,
  priceSource,
  priceTimestamp,
  priceError,
  onSelectStock,
  className = '',
}) => {
  const [query, setQuery] = useState(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query state with external symbol changes (e.g., initial or cleared)
  useEffect(() => {
    setQuery(symbol);
  }, [symbol]);

  // Search results
  const suggestions = useMemo(() => {
    return searchStocks(query, 6);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (stock: NSEStock) => {
    setQuery(stock.displaySymbol);
    setSymbol(stock.displaySymbol);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onSelectStock) {
      onSelectStock(stock);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSymbol(val);
    setIsOpen(val.trim().length > 0);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setSymbol(query.trim().toUpperCase());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else {
          setSymbol(query.trim().toUpperCase());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setSymbol('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const isLive = priceFetchState === 'success' && priceSource && !priceSource.includes('Cached');

  return (
    <div className={`rounded-2xl border border-white/10 bg-navy-900/70 p-5 backdrop-blur-sm relative z-30 ${className}`}>
      {/* Header Label */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
          <Search className="h-4 w-4 text-cyan-300" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Step 1: Stock Setup</h2>
          <p className="text-[11px] text-slate-500">Search NSE symbol or company name</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Autocomplete Search Input */}
        <div ref={containerRef} className="relative z-40">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            <span>NSE Stock Symbol</span>
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (query.trim().length > 0 && suggestions.length > 0) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. TATAMOTORS, RELIANCE, INFY..."
              autoComplete="off"
              spellCheck="false"
              className="w-full rounded-lg border border-white/10 bg-navy-850 py-2.5 pl-10 pr-9 font-mono text-sm font-semibold uppercase tracking-wider text-white placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
                title="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Menu */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] overflow-hidden rounded-xl border border-emerald-500/30 bg-[#0c1425] shadow-2xl shadow-black/80 ring-1 ring-white/10 animate-slide-in">
              <div className="border-b border-white/5 bg-[#080d19] px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-emerald-400">
                  NSE Market Matches
                </span>
                <span className="text-slate-400">{suggestions.length} results</span>
              </div>

              <ul className="max-h-60 overflow-y-auto divide-y divide-white/5 py-1">
                {suggestions.map((stock, idx) => {
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <li key={stock.symbol}>
                      <button
                        type="button"
                        onClick={() => handleSelect(stock)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition ${
                          isHighlighted
                            ? 'bg-emerald-500/15 text-white'
                            : 'hover:bg-white/5 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-emerald-400 tracking-wide">
                              {stock.displaySymbol}
                            </span>
                            <span className="rounded bg-[#060a12] px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                              {stock.exchange}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-400 mt-0.5">
                            {stock.name}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-white/5 hidden sm:inline-block">
                            {stock.sector}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isHighlighted ? 'translate-x-0.5 text-emerald-400' : 'text-slate-600'
                            }`}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-white/5 bg-[#080d19] px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>↑↓ to navigate</span>
                <span>Enter to select</span>
                <span>Esc to close</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Price State Views */}
        {priceFetchState === 'loading' && (
          <div className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-cyan-200">Fetching live NSE price...</p>
              <p className="text-[11px] text-slate-500">Querying Yahoo Finance for {query.trim().toUpperCase() || '...'}</p>
            </div>
          </div>
        )}

        {priceFetchState === 'success' && livePrice != null && (
          <div className="rounded-lg border border-white/10 bg-navy-850 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{liveCompany || query.trim().toUpperCase()}</p>
                <p className="font-mono text-[10px] text-slate-500">{query.trim().toUpperCase()}.NS</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  isLive
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isLive ? 'Live NSE Feed' : 'Verified Cached Data'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-cyan-300 text-glow-cyan">
                {formatMoney(livePrice, currency === 'INR' ? '₹' : '₹')}
              </span>
              <span className="text-[11px] text-slate-500">per share</span>
            </div>
            {priceTimestamp && (
              <p className="mt-2 text-[10px] text-slate-600">
                Updated: {new Date(priceTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        )}

        {priceFetchState === 'error' && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Could not fetch live price</p>
              <p className="text-[11px] leading-relaxed text-amber-200/70">
                {priceError || 'Unknown error'}. Check the symbol or select from the dropdown.
              </p>
            </div>
          </div>
        )}

        {priceFetchState === 'idle' && (
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-navy-850/50 p-4">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            <p className="text-xs text-slate-500">Type a stock symbol or company name above to view suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchCard;
