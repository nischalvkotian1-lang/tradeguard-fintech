export interface FinancialTerm {
  term: string;
  aliases: string[];
  title: string;
  shortDefinition: string;
  analogy: string;
  detailedExplanation: string;
  category: 'Valuation' | 'Solvency' | 'Quality & Moat' | 'Risk & Execution';
}

/**
 * Built-in Financial Terms Dictionary for instant offline answers
 * with plain-English definitions and everyday real-world analogies.
 */
export const FINANCIAL_DICTIONARY: Record<string, FinancialTerm> = {
  pe_ratio: {
    term: 'P/E Ratio',
    aliases: ['pe', 'p/e', 'pe ratio', 'p/e ratio', 'price to earnings', 'price to earnings ratio'],
    title: 'Price-to-Earnings Ratio (P/E)',
    shortDefinition: 'Measures how many rupees investors pay for every ₹1 of profit the company earns yearly.',
    analogy: 'Imagine buying a local sweet shop making ₹10 lakh annual profit. If the owner demands ₹2 crore to sell the shop, the P/E is 20x (₹2 Cr / ₹10 Lakh).',
    detailedExplanation:
      'A lower P/E indicates you are paying less per rupee of earnings (value territory), while a high P/E means the market is pricing in aggressive future profit growth. Benjamin Graham preferred a P/E below 15–20x to avoid paying for speculative narrative.',
    category: 'Valuation',
  },
  pb_ratio: {
    term: 'P/B Ratio',
    aliases: ['pb', 'p/b', 'pb ratio', 'p/b ratio', 'price to book', 'price to book ratio', 'book value'],
    title: 'Price-to-Book Ratio (P/B)',
    shortDefinition: 'Compares the stock market price to the net physical asset value (book value) per share.',
    analogy: 'If a company sold all its factories, buildings, and inventory today and paid off every bank loan, whatever cash remains is its "Book Value". A P/B of 1.0 means you pay exactly ₹1 for ₹1 of net liquidation assets.',
    detailedExplanation:
      'A P/B below 1.5x gives conservative investors a tangible floor of physical assets, protecting your principal against downside liquidation risk. In contrast, asset-light tech firms often trade at higher P/B multiples due to intangible software moats.',
    category: 'Valuation',
  },
  graham_number: {
    term: 'Graham Number',
    aliases: ['graham number', 'graham formula', '22.5', 'benjamin graham formula', 'intrinsic value formula'],
    title: 'Graham Number',
    shortDefinition: 'The maximum defensive price a conservative investor should pay for an equity share.',
    analogy: 'Think of the Graham Number like the maximum fair rent for an apartment based strictly on carpet area and location, completely ignoring speculative hype.',
    detailedExplanation:
      'The formula is: **√(22.5 × EPS × Book Value per Share)**. Benjamin Graham considered 22.5 to be the mathematical ceiling because an investor should never exceed both a P/E of 15 and a P/B of 1.5 (15 × 1.5 = 22.5). When a stock trades below this number, it carries a quantifiable margin of safety.',
    category: 'Valuation',
  },
  margin_of_safety: {
    term: 'Margin of Safety',
    aliases: ['margin of safety', 'mos', 'safety margin', 'discount to intrinsic value'],
    title: 'Margin of Safety (MoS)',
    shortDefinition: 'The percentage discount between a stock\'s current price and its calculated intrinsic worth.',
    analogy: 'Imagine being able to buy an authentic ₹100 note for only ₹70. That ₹30 gap is your margin of safety.',
    detailedExplanation:
      'Margin of Safety is the central cornerstone of value investing. It cushions your capital against bad luck, managerial mistakes, economic recessions, or calculation errors. If you buy at a 30% discount to fair value, the business can underperform your forecast and you can still preserve your principal.',
    category: 'Valuation',
  },
  debt_to_equity: {
    term: 'Debt-to-Equity Ratio',
    aliases: ['debt to equity', 'd/e', 'de ratio', 'debt to equity ratio', 'leverage', 'debt'],
    title: 'Debt-to-Equity Ratio (D/E)',
    shortDefinition: 'Compares total borrowed bank debt against total net worth contributed by shareholders.',
    analogy: 'If you buy a ₹1 crore home with ₹20 lakh of your own savings and an ₹80 lakh bank loan, your leverage is high (D/E = 4.0). If you lose your job, the EMI becomes toxic.',
    detailedExplanation:
      'A D/E below 0.5–0.8x indicates a conservative financial fortress. When D/E exceeds 1.5x in cyclical sectors, the company becomes fragile because fixed loan interest must be serviced even if sales plummet to zero during a market downturn.',
    category: 'Solvency',
  },
  economic_moat: {
    term: 'Economic Moat',
    aliases: ['moat', 'economic moat', 'buffett moat', 'wide moat', 'competitive advantage'],
    title: 'Economic Moat',
    shortDefinition: 'A structural, enduring competitive advantage that protects a business from rivals.',
    analogy: 'Just like a deep water moat surrounded a medieval castle to keep out invaders, a business moat stops competitors from stealing market share and high profits.',
    detailedExplanation:
      'Identified by Warren Buffett, moats come from strong consumer brands (e.g. Fevicol, Titan), high switching costs, network effects, or patents. Companies with wide moats generate high Return on Equity (ROE > 15%) and can raise prices during inflation without losing unit sales.',
    category: 'Quality & Moat',
  },
  inversion: {
    term: 'Inversion',
    aliases: ['inversion', 'invert', 'munger inversion', 'charlie munger inversion', 'inversion mental model'],
    title: 'Inversion (Munger\'s Mental Model)',
    shortDefinition: 'Solving problems backwards by identifying every way to fail and systematically avoiding them.',
    analogy: 'If you want to help India win a cricket match, first write down all the ways to throw the match away (reckless run-outs, dropped catches) and forbid them. Defense first, brilliance second.',
    detailedExplanation:
      'Charlie Munger famously advised: "Invert, always invert." In stock investing, instead of dreaming how much money you might make, invert: "How does this company go bankrupt or suffer permanent capital loss?" If you eliminate high debt, dubious accounting, and overpaying, what remains is resilient capital compounding.',
    category: 'Quality & Moat',
  },
  binding_veto: {
    term: 'Binding Veto',
    aliases: ['binding veto', 'veto', 'ptj veto', 'paul tudor jones veto', 'sovereign veto', 'risk veto'],
    title: 'Paul Tudor Jones Binding Veto',
    shortDefinition: 'The sovereign authority of the Risk Controller to cancel any trade that violates downside asymmetry.',
    analogy: 'Even if the ship\'s navigators (Graham and Buffett) see treasure ahead, the chief safety engineer (Jones) pulls the emergency brake if the hull has a crack that could sink the vessel.',
    detailedExplanation:
      'Paul Tudor Jones enforces defensive asymmetry: every trade must have at least a 1:1.5 risk-to-reward ratio and a strictly enforced stop-loss floor. If a stock possesses uncapped downside or the trade budget cannot purchase at least 1 whole share, PTJ exercises a binding veto override to prevent catastrophic capital destruction.',
    category: 'Risk & Execution',
  },
  gtt_stop_loss: {
    term: 'GTT Stop-Loss',
    aliases: ['gtt', 'stop loss', 'stop-loss', 'gtt order', 'gtt stop loss', 'good till triggered'],
    title: 'Good-Till-Triggered (GTT) Stop-Loss',
    shortDefinition: 'An automated exchange order floor that remains active for up to a year to limit downside loss.',
    analogy: 'Think of a GTT order like an automatic emergency parachute. If the market plunges while you are asleep or at work, your shares are automatically sold at your preset exit floor.',
    detailedExplanation:
      'Offered on Indian exchanges (NSE/BSE via brokers like Zerodha, Groww, AngelOne), a GTT stop-loss triggers a market or limit sell order when the price falls to your predetermined floor (e.g. -6%). This removes human emotion, fear, and hesitation, strictly enforcing the capital preservation rule.',
    category: 'Risk & Execution',
  },
  roe: {
    term: 'Return on Equity (ROE)',
    aliases: ['roe', 'return on equity'],
    title: 'Return on Equity (ROE)',
    shortDefinition: 'Measures how many rupees of profit a business produces for every ₹100 of shareholders\' equity.',
    analogy: 'If you invest ₹100 into a bakery and it produces ₹20 of net profit after all expenses at year-end, your ROE is a stellar 20%.',
    detailedExplanation:
      'Warren Buffett prefers businesses that consistently deliver an ROE above 15% with little or no debt. High ROE demonstrates outstanding capital reinvestment efficiency and compounding power.',
    category: 'Quality & Moat',
  },
  whole_share_sizing: {
    term: 'Whole Share Position Sizing',
    aliases: ['whole share', 'fractional share', 'whole shares', 'lot size', 'cash buffer', 'unallocated buffer'],
    title: 'Whole-Share Sizing & Cash Buffer',
    shortDefinition: 'Allocating capital strictly into full indivisible shares as required by Indian delivery rules.',
    analogy: 'If movie tickets cost ₹350 each and you bring ₹1,000, you can buy exactly 2 tickets (₹700). The remaining ₹300 stays in your wallet as your cash buffer.',
    detailedExplanation:
      'Unlike US markets, Indian exchanges (NSE/BSE) do not permit fractional shares in standard cash delivery. TradeGuard calculates: recommendedShares = Math.floor(budget / currentPrice), leaving the remainder safely in cash reserve.',
    category: 'Risk & Execution',
  },
  risk_reward_ratio: {
    term: 'Risk-to-Reward Ratio (R:R)',
    aliases: ['risk reward', 'r:r', 'rr ratio', 'risk to reward', 'asymmetry'],
    title: 'Risk-to-Reward Ratio (1:X)',
    shortDefinition: 'The mathematical comparison between the rupee amount at risk versus potential profit.',
    analogy: 'If you flip a coin where tails costs you ₹100 but heads pays you ₹250, you have an asymmetric 1:2.5 edge. Even if you only win half the time, you win big over time.',
    detailedExplanation:
      'Professional traders like Paul Tudor Jones refuse trades below a 1:1.5 or 1:2 ratio. By risking ₹1 (down to your stop-loss) to target ₹2 or ₹3 in profit, you preserve profitability even if your win rate is only 40–50%.',
    category: 'Risk & Execution',
  },
};

/**
 * Searches the local financial dictionary for exact or fuzzy match.
 */
export function findLocalTerm(query: string): FinancialTerm | null {
  const clean = query.trim().toLowerCase().replace(/[?.,!]/g, '');

  // 1. Direct key match
  for (const [key, termObj] of Object.entries(FINANCIAL_DICTIONARY)) {
    if (key === clean || termObj.term.toLowerCase() === clean) {
      return termObj;
    }
  }

  // 2. Exact alias match
  for (const termObj of Object.values(FINANCIAL_DICTIONARY)) {
    if (termObj.aliases.some((a) => a.toLowerCase() === clean)) {
      return termObj;
    }
  }

  // 3. Substring / inclusion match (e.g. "what is pe ratio" -> contains "pe ratio")
  for (const termObj of Object.values(FINANCIAL_DICTIONARY)) {
    if (
      termObj.aliases.some((a) => clean.includes(a.toLowerCase())) ||
      clean.includes(termObj.term.toLowerCase())
    ) {
      return termObj;
    }
  }

  // 4. Word-level fuzzy match
  const words = clean.split(/\s+/).filter((w) => w.length > 2);
  for (const termObj of Object.values(FINANCIAL_DICTIONARY)) {
    for (const w of words) {
      if (termObj.aliases.some((a) => a.toLowerCase().includes(w))) {
        return termObj;
      }
    }
  }

  return null;
}

/**
 * Formats a local dictionary response into a warm, engaging mentor explanation.
 */
export function formatLocalTermResponse(term: FinancialTerm, stockSymbol?: string): string {
  const stockContextNote = stockSymbol ? ` (Applicable to your analysis of **${stockSymbol}**)` : '';

  return [
    `🎓 **${term.title}**${stockContextNote}:`,
    ``,
    `💡 **What it means:** ${term.shortDefinition}`,
    ``,
    `🍎 **Everyday Analogy:** ${term.analogy}`,
    ``,
    `🔍 **Deep-Dive:** ${term.detailedExplanation}`,
  ].join('\n');
}

/**
 * Resolves a financial query by querying Gemini LLM if configured,
 * or falling back instantly to the built-in financial dictionary.
 */
export async function askFinancialMentor(
  query: string,
  context?: { symbol?: string; debateContext?: string }
): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) {
    return 'Please ask a question or tap one of the suggested terms above!';
  }

  // 1. Check local dictionary first for sub-millisecond instant offline answer
  const matchedTerm = findLocalTerm(trimmed);

  // Check if Gemini API Key is provided via Vite environment
  const apiKey = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
    : undefined;

  // If online with Gemini API Key, enhance the answer or answer novel questions
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const stockInfo = context?.symbol ? `Currently analyzing Indian stock: ${context.symbol}.` : '';
      const debateInfo = context?.debateContext ? `Recent committee debate context: ${context.debateContext}.` : '';

      const prompt = `You are "FinSense Mentor", a friendly, warm, and highly engaging Dalal Street & Wall Street teacher for retail beginners.
Your goal is to demystify financial, fundamental, and quantitative trading terminology into crystal-clear plain English.

User Question: "${trimmed}"
${stockInfo}
${debateInfo}

Rules:
1. Explain the concept in 2 to 3 crisp, clear sentences without circular jargon.
2. ALWAYS include an everyday, real-world analogy (e.g. buying a sweet shop, car brakes, home loan).
3. If relevant, mention how Benjamin Graham, Warren Buffett, Charlie Munger, or Paul Tudor Jones use this concept.
4. Keep the tone encouraging, concise, and structured with bold highlights.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 20) {
          return text.trim();
        }
      }
    } catch {
      // Fallback silently to offline dictionary on fetch error or timeout
    }
  }

  // If local dictionary matched
  if (matchedTerm) {
    return formatLocalTermResponse(matchedTerm, context?.symbol);
  }

  // Helpful conversational fallback for unmatched financial questions
  return [
    `🎓 **FinSense Mentor Insight:**`,
    ``,
    `You asked about: **"${trimmed}"**.`,
    ``,
    `While that exact term isn't in our instant quick-dictionary yet, here are the foundational principles our committee focuses on:`,
    `• **Valuation (Graham):** Never overpay; insist on a tangible Margin of Safety where market price is below intrinsic value.`,
    `• **Quality (Buffett):** Look for businesses with durable pricing power, high ROE (>15%), and economic moats.`,
    `• **Solvency (Munger):** Invert: avoid companies with dangerous debt-to-equity that could face insolvency during credit freezes.`,
    `• **Tactical Risk (Jones):** Enforce strict whole-share sizing with a non-negotiable stop-loss floor and at least 1:1.5 risk-to-reward.`,
    ``,
    `💡 *Tip: Try asking about "Graham Number", "P/E Ratio", "Margin of Safety", "Debt to Equity", "Moat", or "Binding Veto"!*`,
  ].join('\n');
}
