import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('TradeGuard App Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Accessibility & Semantic Landmarks', () => {
    it('renders the skip to main content navigation link for keyboard users', () => {
      render(<App />);
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('renders essential semantic landmarks: header, main, and footer', () => {
      render(<App />);
      expect(screen.getByRole('banner')).toBeInTheDocument(); // <header>
      expect(screen.getByRole('main')).toBeInTheDocument(); // <main id="main-content">
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // <footer>
    });
  });

  describe('2. Ticker Search & Input Sanitization', () => {
    it('renders the stock search input with accessible label and placeholder', () => {
      render(<App />);
      const searchInput = screen.getByLabelText(/search nse stock symbol/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('id', 'ticker-search-input');
    });

    it('sanitizes ticker search input: auto-uppercases and filters disallowed characters', () => {
      render(<App />);
      const searchInput = screen.getByLabelText(/search nse stock symbol/i) as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'tatamotors!@#' } });
      // Should sanitize to uppercase TATAMOTORS and strip !@#
      expect(searchInput.value).toBe('TATAMOTORS');
    });

    it('displays autocomplete results when typing a recognized stock ticker', async () => {
      render(<App />);
      const searchInput = screen.getByLabelText(/search nse stock symbol/i);

      fireEvent.change(searchInput, { target: { value: 'RELIANCE' } });

      await waitFor(() => {
        expect(screen.getByText(/NSE Market Matches/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Budget Input Updates & Preset Chips', () => {
    it('renders the trade capital allocation input with accessible label and helper text', () => {
      render(<App />);
      const budgetInput = screen.getByLabelText(/trade capital allocation in ₹/i);
      expect(budgetInput).toBeInTheDocument();
      expect(budgetInput).toHaveAttribute('id', 'budget-input');
      expect(budgetInput).toHaveAttribute('aria-describedby', 'budget-helper-text');
    });

    it('updates budget state cleanly when numeric input is entered', () => {
      render(<App />);
      const budgetInput = screen.getByLabelText(/trade capital allocation in ₹/i) as HTMLInputElement;

      fireEvent.change(budgetInput, { target: { value: '50000' } });
      expect(budgetInput.value).toBe('50000');
    });

    it('rejects negative numbers and non-numeric characters in budget input', () => {
      render(<App />);
      const budgetInput = screen.getByLabelText(/trade capital allocation in ₹/i) as HTMLInputElement;

      fireEvent.change(budgetInput, { target: { value: '-25000abc' } });
      // Non-digits stripped, negative sign stripped -> 25000
      expect(budgetInput.value).toBe('25000');
    });

    it('updates capital allocation when quick budget preset chips are clicked', () => {
      render(<App />);
      const budgetInput = screen.getByLabelText(/trade capital allocation in ₹/i) as HTMLInputElement;
      const chip50k = screen.getByRole('button', { name: /set capital to ₹50,000/i });

      fireEvent.click(chip50k);
      expect(budgetInput.value).toBe('50000');

      const chip1L = screen.getByRole('button', { name: /set capital to ₹1,00,000/i });
      fireEvent.click(chip1L);
      expect(budgetInput.value).toBe('100000');
    });
  });

  describe('4. The 4-Pillar Committee Cards & Market Masters', () => {
    it('renders all 4 Market Master committee cards with role titles', () => {
      render(<App />);

      expect(screen.getByTestId('committee-card-graham')).toBeInTheDocument();
      expect(screen.getByTestId('committee-card-buffett')).toBeInTheDocument();
      expect(screen.getByTestId('committee-card-munger')).toBeInTheDocument();
      expect(screen.getByTestId('committee-card-jones')).toBeInTheDocument();

      expect(screen.getByText('Benjamin Graham')).toBeInTheDocument();
      expect(screen.getByText('Warren Buffett')).toBeInTheDocument();
      expect(screen.getByText('Charlie Munger')).toBeInTheDocument();
      expect(screen.getByText('Paul Tudor Jones')).toBeInTheDocument();
    });

    it('provides meaningful, WCAG-compliant alt text for all 4 investor portraits', () => {
      render(<App />);

      expect(screen.getByAltText('Benjamin Graham - Valuation Pillar')).toBeInTheDocument();
      expect(screen.getByAltText('Warren Buffett - Compounding Pillar')).toBeInTheDocument();
      expect(screen.getByAltText('Charlie Munger - Quality Pillar')).toBeInTheDocument();
      expect(screen.getByAltText('Paul Tudor Jones - Risk Management Pillar')).toBeInTheDocument();
    });

    it('allows toggling masters on and off in the research committee lineup', () => {
      render(<App />);
      const grahamBtn = screen.getByTestId('committee-card-graham');

      // Initially active (aria-pressed=true)
      expect(grahamBtn).toHaveAttribute('aria-pressed', 'true');

      // Click to toggle off
      fireEvent.click(grahamBtn);
      expect(grahamBtn).toHaveAttribute('aria-pressed', 'false');

      // Click to toggle back on
      fireEvent.click(grahamBtn);
      expect(grahamBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('5. Verdict Banner & Position Sizing Output Panels', () => {
    it('renders the position sizing output panel with role="status" and aria-live="polite"', () => {
      render(<App />);
      const statusPanel = screen.getByRole('status', {
        name: /deterministic position sizing calculation/i,
      });
      expect(statusPanel).toBeInTheDocument();
      expect(statusPanel).toHaveAttribute('aria-live', 'polite');
    });

    it('renders the dynamic Verdict Banner status with live region attributes', () => {
      render(<App />);
      const verdictPill = screen.getByTestId('verdict-banner-pill');
      expect(verdictPill).toBeInTheDocument();
      expect(verdictPill).toHaveAttribute('role', 'status');
      expect(verdictPill).toHaveAttribute('aria-live', 'polite');
    });

    it('displays BLOCKED / VETOED when budget is 0 or less than share price', () => {
      render(<App />);
      const verdictPill = screen.getByTestId('verdict-banner-pill');
      // When budget is empty / 0, risk controller vetoes execution due to zero shares
      expect(verdictPill).toHaveTextContent(/BLOCKED \/ VETOED/i);
    });

    it('switches to APPROVED when stock is selected and sufficient budget is allocated', async () => {
      render(<App />);

      const searchInput = screen.getByLabelText(/search nse stock symbol/i);
      fireEvent.change(searchInput, { target: { value: 'RELIANCE' } });

      // Click the autocomplete match
      const stockItem = await screen.findByText(/reliance industries/i);
      fireEvent.click(stockItem);

      const budgetInput = screen.getByLabelText(/trade capital allocation in ₹/i);
      fireEvent.change(budgetInput, { target: { value: '100000' } });

      await waitFor(
        () => {
          const verdictPill = screen.getByTestId('verdict-banner-pill');
          expect(verdictPill).toHaveTextContent(/APPROVED/i);
        },
        { timeout: 3000 }
      );
    });
  });
});
