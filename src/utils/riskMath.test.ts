import { describe, it, expect } from 'vitest';
import {
  calculateGrahamNumber,
  calculateMarginOfSafety,
  checkGrahamMultiplier,
  checkBuffettRoe,
  checkBuffettOperatingMargin,
  checkMungerInterestCoverage,
  calculateInterestCoverageRatio,
  checkMungerSolvency,
  calculateWholeShares,
  calculateStopLossPrice,
  calculateMaxRupeeDownside,
  calculateCapitalAllocated,
  calculateUnallocatedBuffer,
  calculateRiskRewardRatio,
  evaluateTudorJonesVerdict,
} from './riskMath';
import { calculateRiskPlan } from './riskEngine';

describe('TradeGuard Financial Mathematics Engine', () => {
  describe('1. Benjamin Graham Valuation & Margin of Safety', () => {
    it('calculates the Graham Number correctly for standard profitable companies', () => {
      // sqrt(22.5 * 50 * 200) = sqrt(225000) = 474.3416... -> 474.34
      const grahamNo = calculateGrahamNumber(50, 200);
      expect(grahamNo).toBe(474.34);
    });

    it('returns 0 for negative EPS or negative Book Value', () => {
      expect(calculateGrahamNumber(-15, 200)).toBe(0);
      expect(calculateGrahamNumber(50, -100)).toBe(0);
      expect(calculateGrahamNumber(-20, -50)).toBe(0);
    });

    it('returns 0 for zero inputs', () => {
      expect(calculateGrahamNumber(0, 200)).toBe(0);
      expect(calculateGrahamNumber(50, 0)).toBe(0);
      expect(calculateGrahamNumber(0, 0)).toBe(0);
    });

    it('handles NaN and Infinity gracefully without throwing', () => {
      expect(calculateGrahamNumber(NaN, 100)).toBe(0);
      expect(calculateGrahamNumber(50, Infinity)).toBe(0);
      expect(calculateGrahamNumber(Infinity, -Infinity)).toBe(0);
    });

    it('calculates Margin of Safety percentage against intrinsic value', () => {
      // ((500 - 400) / 500) * 100 = 20.0%
      expect(calculateMarginOfSafety(400, 500)).toBe(20.0);
      // ((500 - 600) / 500) * 100 = -20.0%
      expect(calculateMarginOfSafety(600, 500)).toBe(-20.0);
    });

    it('returns -100 for invalid prices or intrinsic values', () => {
      expect(calculateMarginOfSafety(0, 500)).toBe(-100);
      expect(calculateMarginOfSafety(400, 0)).toBe(-100);
      expect(calculateMarginOfSafety(-400, 500)).toBe(-100);
      expect(calculateMarginOfSafety(NaN, 500)).toBe(-100);
    });

    it('evaluates Graham Multiplier benchmark P/E * P/B <= 22.5', () => {
      // Exactly at benchmark 22.5
      expect(checkGrahamMultiplier(15, 1.5)).toBe(true);
      // Below benchmark
      expect(checkGrahamMultiplier(10, 2.0)).toBe(true);
      // Exceeds benchmark
      expect(checkGrahamMultiplier(25, 1.0)).toBe(false);
      // Negative / zero / invalid multiples
      expect(checkGrahamMultiplier(-5, 1.5)).toBe(false);
      expect(checkGrahamMultiplier(0, 1.5)).toBe(false);
      expect(checkGrahamMultiplier(NaN, 2.0)).toBe(false);
    });
  });

  describe('2. Warren Buffett Compounding & Return on Equity', () => {
    it('verifies the ROE >= 15.0% boundary threshold', () => {
      // Exactly at the 15.0% boundary
      expect(checkBuffettRoe(15.0)).toBe(true);
      // Above boundary
      expect(checkBuffettRoe(15.0001)).toBe(true);
      expect(checkBuffettRoe(24.5)).toBe(true);
      // Below boundary
      expect(checkBuffettRoe(14.999)).toBe(false);
      expect(checkBuffettRoe(10.0)).toBe(false);
      expect(checkBuffettRoe(0)).toBe(false);
      expect(checkBuffettRoe(-5.0)).toBe(false);
    });

    it('handles NaN and non-finite ROE inputs safely', () => {
      expect(checkBuffettRoe(NaN)).toBe(false);
      expect(checkBuffettRoe(Infinity)).toBe(false);
      expect(checkBuffettRoe(-Infinity)).toBe(false);
    });

    it('verifies sustainable operating margin >= 14.0%', () => {
      expect(checkBuffettOperatingMargin(14.0)).toBe(true);
      expect(checkBuffettOperatingMargin(22.0)).toBe(true);
      expect(checkBuffettOperatingMargin(13.99)).toBe(false);
      expect(checkBuffettOperatingMargin(-2.0)).toBe(false);
      expect(checkBuffettOperatingMargin(NaN)).toBe(false);
    });
  });

  describe('3. Charlie Munger Solvency & Interest Coverage', () => {
    it('verifies the ICR >= 3.0 boundary threshold', () => {
      // Exactly at boundary 3.0
      expect(checkMungerInterestCoverage(3.0)).toBe(true);
      // Above boundary
      expect(checkMungerInterestCoverage(3.01)).toBe(true);
      expect(checkMungerInterestCoverage(8.5)).toBe(true);
      // Below boundary
      expect(checkMungerInterestCoverage(2.999)).toBe(false);
      expect(checkMungerInterestCoverage(1.5)).toBe(false);
      expect(checkMungerInterestCoverage(0)).toBe(false);
      expect(checkMungerInterestCoverage(-1.0)).toBe(false);
    });

    it('handles NaN and invalid ICR values', () => {
      expect(checkMungerInterestCoverage(NaN)).toBe(false);
    });

    it('calculates Interest Coverage Ratio (EBIT / Interest Expense)', () => {
      expect(calculateInterestCoverageRatio(3000, 1000)).toBe(3.0);
      expect(calculateInterestCoverageRatio(4500, 1000)).toBe(4.5);
      // Division by zero defense
      expect(calculateInterestCoverageRatio(3000, 0)).toBe(0);
      // Negative EBIT
      expect(calculateInterestCoverageRatio(-500, 1000)).toBe(0);
      expect(calculateInterestCoverageRatio(NaN, 1000)).toBe(0);
    });

    it('evaluates Munger Solvency classification based on Debt-to-Equity', () => {
      // Pristine: <= 0.50
      expect(checkMungerSolvency(0.2)).toBe('PRISTINE');
      expect(checkMungerSolvency(0.5)).toBe('PRISTINE');
      // Adequate: 0.51 to 1.00
      expect(checkMungerSolvency(0.51)).toBe('ADEQUATE');
      expect(checkMungerSolvency(1.0)).toBe('ADEQUATE');
      // Overleveraged: > 1.00 or negative
      expect(checkMungerSolvency(1.01)).toBe('OVERLEVERAGED');
      expect(checkMungerSolvency(3.5)).toBe('OVERLEVERAGED');
      expect(checkMungerSolvency(-0.2)).toBe('OVERLEVERAGED');
      expect(checkMungerSolvency(NaN)).toBe('OVERLEVERAGED');
    });
  });

  describe('4. Paul Tudor Jones Whole-Share Position Sizing & Risk Controls', () => {
    it('calculates whole-share sizing for standard positive budget and price', () => {
      // ₹50,000 budget / ₹1,000 price = 50 whole shares
      expect(calculateWholeShares(50000, 1000)).toBe(50);
      // Whole-share quantization (discards fractions)
      expect(calculateWholeShares(50999, 1000)).toBe(50);
      expect(calculateWholeShares(10000, 3333)).toBe(3);
    });

    it('enforces whole-share minimum: returns 0 when budget < current price', () => {
      // Budget smaller than 1 share price
      expect(calculateWholeShares(999, 1000)).toBe(0);
      expect(calculateWholeShares(50, 1500)).toBe(0);
    });

    it('handles zero and negative budgets safely', () => {
      expect(calculateWholeShares(0, 1000)).toBe(0);
      expect(calculateWholeShares(-50000, 1000)).toBe(0);
    });

    it('handles zero and negative prices safely', () => {
      expect(calculateWholeShares(50000, 0)).toBe(0);
      expect(calculateWholeShares(50000, -500)).toBe(0);
    });

    it('handles NaN and Infinity safely', () => {
      expect(calculateWholeShares(NaN, 1000)).toBe(0);
      expect(calculateWholeShares(50000, NaN)).toBe(0);
      expect(calculateWholeShares(Infinity, 1000)).toBe(0);
    });

    it('calculates planned stop-loss price level with decimal or integer percent', () => {
      // 6% stop loss on ₹1,000 share
      expect(calculateStopLossPrice(1000, 0.06)).toBe(940);
      // Supports whole-number 6 representation as 6%
      expect(calculateStopLossPrice(1000, 6)).toBe(940);
      // 3% stop loss on ₹2,500.50
      expect(calculateStopLossPrice(2500.5, 0.03)).toBe(2425.49);
    });

    it('handles edge cases in stop-loss price calculation', () => {
      expect(calculateStopLossPrice(0, 0.06)).toBe(0);
      expect(calculateStopLossPrice(-1000, 0.06)).toBe(0);
      expect(calculateStopLossPrice(1000, 0)).toBe(1000);
      expect(calculateStopLossPrice(1000, -0.05)).toBe(1000);
      expect(calculateStopLossPrice(1000, 1.0)).toBe(0);
      expect(calculateStopLossPrice(NaN, 0.06)).toBe(0);
      expect(calculateStopLossPrice(1000, NaN)).toBe(1000);
    });

    it('calculates maximum rupee downside capital at risk', () => {
      // 50 shares * (₹1,000 - ₹940) = 50 * ₹60 = ₹3,000.00
      expect(calculateMaxRupeeDownside(50, 1000, 940)).toBe(3000.0);
      // 0 shares -> ₹0 loss
      expect(calculateMaxRupeeDownside(0, 1000, 940)).toBe(0);
      // Stop loss >= price -> ₹0 loss
      expect(calculateMaxRupeeDownside(50, 1000, 1050)).toBe(0);
      // Negative shares or prices
      expect(calculateMaxRupeeDownside(-10, 1000, 940)).toBe(0);
      expect(calculateMaxRupeeDownside(50, -1000, 940)).toBe(0);
      expect(calculateMaxRupeeDownside(NaN, 1000, 940)).toBe(0);
    });

    it('calculates deployed capital and uninvested cash buffer', () => {
      const shares = calculateWholeShares(50500, 1000); // 50
      const allocated = calculateCapitalAllocated(shares, 1000); // 50,000
      const buffer = calculateUnallocatedBuffer(50500, allocated); // 500

      expect(allocated).toBe(50000.0);
      expect(buffer).toBe(500.0);
    });

    it('calculates risk-to-reward ratio', () => {
      // Entry 1000, Stop 950 (Risk 50), Target 1100 (Reward 100) -> 1 : 2.0
      const rr = calculateRiskRewardRatio(1000, 950, 1100);
      expect(rr.ratio).toBe(2.0);
      expect(rr.formatted).toBe('1 : 2');
    });

    it('handles invalid inputs in risk-to-reward ratio calculation safely', () => {
      expect(calculateRiskRewardRatio(0, 950, 1100)).toEqual({ ratio: 0, formatted: '1 : 0' });
      expect(calculateRiskRewardRatio(NaN, 950, 1100)).toEqual({ ratio: 0, formatted: '1 : 0' });
      expect(calculateRiskRewardRatio(1000, NaN, 1100)).toEqual({ ratio: 0, formatted: '1 : 0' });
      expect(calculateRiskRewardRatio(1000, 950, NaN)).toEqual({ ratio: 0, formatted: '1 : 0' });
    });

    it('evaluates Paul Tudor Jones binding verdict logic', () => {
      // APPROVED: Healthy whole shares, moderate leverage, sound reward
      const approved = evaluateTudorJonesVerdict({
        budget: 50000,
        currentPrice: 1000,
        recommendedShares: 50,
        debtToEquity: 0.4,
        targetPrice: 1150,
        stopLossPrice: 940,
      });
      expect(approved).toBe('APPROVED');

      // VETOED: Budget less than 1 share price
      const vetoedBudget = evaluateTudorJonesVerdict({
        budget: 500,
        currentPrice: 1000,
        recommendedShares: 0,
        debtToEquity: 0.4,
      });
      expect(vetoedBudget).toBe('VETOED');

      // VETOED: Extreme catastrophic leverage (D/E > 2.5)
      const vetoedDebt = evaluateTudorJonesVerdict({
        budget: 50000,
        currentPrice: 1000,
        recommendedShares: 50,
        debtToEquity: 3.2,
      });
      expect(vetoedDebt).toBe('VETOED');

      // CONDITIONAL_APPROVAL: Moderate elevated leverage (D/E > 1.2)
      const condDebt = evaluateTudorJonesVerdict({
        budget: 50000,
        currentPrice: 1000,
        recommendedShares: 50,
        debtToEquity: 1.5,
      });
      expect(condDebt).toBe('CONDITIONAL_APPROVAL');

      // CONDITIONAL_APPROVAL: Asymmetric reward check fails (< 1.5x)
      const condReward = evaluateTudorJonesVerdict({
        budget: 50000,
        currentPrice: 1000,
        recommendedShares: 50,
        debtToEquity: 0.5,
        targetPrice: 1050, // Reward 50
        stopLossPrice: 940, // Risk 60 -> Ratio 0.8 (< 1.5)
      });
      expect(condReward).toBe('CONDITIONAL_APPROVAL');
    });

    it('calculates full deterministic risk plan with normal inputs', () => {
      const plan = calculateRiskPlan(1000, 50000, 'Medium');
      expect(plan.recommendedShares).toBe(50);
      expect(plan.capitalAllocated).toBe(50000);
      expect(plan.plannedStopLossPrice).toBe(940);
      expect(plan.maxPlannedLoss).toBe(3000);
      expect(plan.isBudgetInsufficient).toBe(false);
      expect(plan.steps).toHaveLength(5);
    });

    it('handles budget smaller than 1 share price in calculateRiskPlan', () => {
      const plan = calculateRiskPlan(1000, 500, 'Low');
      expect(plan.recommendedShares).toBe(0);
      expect(plan.capitalAllocated).toBe(0);
      expect(plan.isBudgetInsufficient).toBe(true);
      expect(plan.alertMessage).toMatch(/Whole share threshold not met/i);
    });

    it('handles zero price and zero budget in calculateRiskPlan', () => {
      const zeroPricePlan = calculateRiskPlan(0, 50000);
      expect(zeroPricePlan.alertMessage).toMatch(/Awaiting live stock price/i);

      const zeroBudgetPlan = calculateRiskPlan(1000, 0);
      expect(zeroBudgetPlan.alertMessage).toMatch(/Enter budget/i);
    });
  });
});
