export interface NSEStock {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  exchange: 'NSE';
}

export const NSE_STOCKS: NSEStock[] = [
  // --- TATA GROUP ---
  { symbol: 'TATAMOTORS.NS', displaySymbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Automobile', exchange: 'NSE' },
  { symbol: 'TATASTEEL.NS', displaySymbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals & Mining', exchange: 'NSE' },
  { symbol: 'TCS.NS', displaySymbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'TATACONSUM.NS', displaySymbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', sector: 'FMCG', exchange: 'NSE' },
  { symbol: 'TATAPOWER.NS', displaySymbol: 'TATAPOWER', name: 'Tata Power Co Ltd', sector: 'Power & Energy', exchange: 'NSE' },
  { symbol: 'TATACHEM.NS', displaySymbol: 'TATACHEM', name: 'Tata Chemicals Ltd', sector: 'Chemicals', exchange: 'NSE' },
  { symbol: 'TATAELXSI.NS', displaySymbol: 'TATAELXSI', name: 'Tata Elxsi Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'TATACOMM.NS', displaySymbol: 'TATACOMM', name: 'Tata Communications Ltd', sector: 'Telecommunications', exchange: 'NSE' },
  { symbol: 'TITAN.NS', displaySymbol: 'TITAN', name: 'Titan Company Ltd', sector: 'Consumer Discretionary', exchange: 'NSE' },
  { symbol: 'TRENT.NS', displaySymbol: 'TRENT', name: 'Trent Ltd', sector: 'Retail', exchange: 'NSE' },

  // --- NIFTY 50 GIANTS ---
  { symbol: 'RELIANCE.NS', displaySymbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Oil & Gas / Retail', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', displaySymbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking & Financial', exchange: 'NSE' },
  { symbol: 'INFY.NS', displaySymbol: 'INFY', name: 'Infosys Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', displaySymbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking & Financial', exchange: 'NSE' },
  { symbol: 'HINDUNILVR.NS', displaySymbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', exchange: 'NSE' },
  { symbol: 'ITC.NS', displaySymbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG & Cigarettes', exchange: 'NSE' },
  { symbol: 'SBIN.NS', displaySymbol: 'SBIN', name: 'State Bank of India', sector: 'Public Sector Bank', exchange: 'NSE' },
  { symbol: 'BHARTIARTL.NS', displaySymbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecommunications', exchange: 'NSE' },
  { symbol: 'KOTAKBANK.NS', displaySymbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking & Financial', exchange: 'NSE' },
  { symbol: 'LT.NS', displaySymbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure & Capital Goods', exchange: 'NSE' },
  { symbol: 'AXISBANK.NS', displaySymbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking & Financial', exchange: 'NSE' },
  { symbol: 'MARUTI.NS', displaySymbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', exchange: 'NSE' },
  { symbol: 'BAJFINANCE.NS', displaySymbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Financial Services / NBFC', exchange: 'NSE' },
  { symbol: 'BAJAJFINSV.NS', displaySymbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'Financial Services', exchange: 'NSE' },
  { symbol: 'ASIANPAINT.NS', displaySymbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Consumer Discretionary', exchange: 'NSE' },
  { symbol: 'SUNPHARMA.NS', displaySymbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
  { symbol: 'WIPRO.NS', displaySymbol: 'WIPRO', name: 'Wipro Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'HCLTECH.NS', displaySymbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'TECHM.NS', displaySymbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'Information Technology', exchange: 'NSE' },
  { symbol: 'POWERGRID.NS', displaySymbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', sector: 'Power Transmission', exchange: 'NSE' },
  { symbol: 'NTPC.NS', displaySymbol: 'NTPC', name: 'NTPC Ltd', sector: 'Power & Utilities', exchange: 'NSE' },
  { symbol: 'ONGC.NS', displaySymbol: 'ONGC', name: 'Oil and Natural Gas Corporation Ltd', sector: 'Oil & Gas Exploration', exchange: 'NSE' },
  { symbol: 'COALINDIA.NS', displaySymbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining & Metals', exchange: 'NSE' },
  { symbol: 'ADANIENT.NS', displaySymbol: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Diversified Conglomerate', exchange: 'NSE' },
  { symbol: 'ADANIPORTS.NS', displaySymbol: 'ADANIPORTS', name: 'Adani Ports and SEZ Ltd', sector: 'Ports & Logistics', exchange: 'NSE' },
  { symbol: 'ULTRACEMCO.NS', displaySymbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Cement & Building Materials', exchange: 'NSE' },
  { symbol: 'NESTLEIND.NS', displaySymbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG & Food Products', exchange: 'NSE' },
  { symbol: 'GRASIM.NS', displaySymbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Diversified / Textiles', exchange: 'NSE' },
  { symbol: 'JSWSTEEL.NS', displaySymbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals & Mining', exchange: 'NSE' },
  { symbol: 'HINDALCO.NS', displaySymbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metals & Aluminum', exchange: 'NSE' },
  { symbol: 'CIPLA.NS', displaySymbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharmaceuticals', exchange: 'NSE' },
  { symbol: 'DRREDDY.NS', displaySymbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", sector: 'Pharmaceuticals', exchange: 'NSE' },
  { symbol: 'APOLLOHOSP.NS', displaySymbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', sector: 'Healthcare & Hospitals', exchange: 'NSE' },
  { symbol: 'EICHERMOT.NS', displaySymbol: 'EICHERMOT', name: 'Eicher Motors Ltd', sector: 'Automobile / Royal Enfield', exchange: 'NSE' },
  { symbol: 'HEROMOTOCO.NS', displaySymbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', sector: 'Automobile', exchange: 'NSE' },
  { symbol: 'M&M.NS', displaySymbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Automobile & Tractors', exchange: 'NSE' },
  { symbol: 'BRITANNIA.NS', displaySymbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'FMCG & Bakery', exchange: 'NSE' },
  { symbol: 'BPCL.NS', displaySymbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Oil & Refining', exchange: 'NSE' },
  { symbol: 'INDUSINDBK.NS', displaySymbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', sector: 'Banking & Financial', exchange: 'NSE' },
  { symbol: 'DIVISLAB.NS', displaySymbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", sector: 'Pharmaceuticals / API', exchange: 'NSE' },
  { symbol: 'VBL.NS', displaySymbol: 'VBL', name: 'Varun Beverages Ltd', sector: 'FMCG / Beverages', exchange: 'NSE' },

  // --- DEFENCE & PSU LEADERS ---
  { symbol: 'HAL.NS', displaySymbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Aerospace & Defence', exchange: 'NSE' },
  { symbol: 'BEL.NS', displaySymbol: 'BEL', name: 'Bharat Electronics Ltd', sector: 'Defence Electronics', exchange: 'NSE' },
  { symbol: 'MAZDOCK.NS', displaySymbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders Ltd', sector: 'Defence & Shipbuilding', exchange: 'NSE' },
  { symbol: 'COCHINSHIP.NS', displaySymbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd', sector: 'Shipbuilding & Marine', exchange: 'NSE' },
  { symbol: 'BHEL.NS', displaySymbol: 'BHEL', name: 'Bharat Heavy Electricals Ltd', sector: 'Capital Goods & Power', exchange: 'NSE' },

  // --- RAILWAYS & INFRASTRUCTURE ---
  { symbol: 'IRCTC.NS', displaySymbol: 'IRCTC', name: 'Indian Railway Catering & Tourism Corp', sector: 'Railways & Tourism', exchange: 'NSE' },
  { symbol: 'RVNL.NS', displaySymbol: 'RVNL', name: 'Rail Vikas Nigam Ltd', sector: 'Rail Infrastructure', exchange: 'NSE' },
  { symbol: 'IRFC.NS', displaySymbol: 'IRFC', name: 'Indian Railway Finance Corporation', sector: 'Financial Services / Rail', exchange: 'NSE' },

  // --- HIGH-MOMENTUM & RETAIL FAVORITES ---
  { symbol: 'ZOMATO.NS', displaySymbol: 'ZOMATO', name: 'Zomato Ltd', sector: 'Internet & Food Delivery', exchange: 'NSE' },
  { symbol: 'JIOFIN.NS', displaySymbol: 'JIOFIN', name: 'Jio Financial Services Ltd', sector: 'Financial Services & Fintech', exchange: 'NSE' },
  { symbol: 'SUZLON.NS', displaySymbol: 'SUZLON', name: 'Suzlon Energy Ltd', sector: 'Renewable Wind Energy', exchange: 'NSE' },
  { symbol: 'IREDA.NS', displaySymbol: 'IREDA', name: 'Indian Renewable Energy Dev Agency', sector: 'Renewable Power Finance', exchange: 'NSE' },
  { symbol: 'NHPC.NS', displaySymbol: 'NHPC', name: 'NHPC Ltd', sector: 'Hydro Power Utilities', exchange: 'NSE' },
  { symbol: 'PFC.NS', displaySymbol: 'PFC', name: 'Power Finance Corporation Ltd', sector: 'NBFC / Power Finance', exchange: 'NSE' },
  { symbol: 'RECLTD.NS', displaySymbol: 'RECLTD', name: 'REC Ltd', sector: 'NBFC / Rural Power', exchange: 'NSE' },
  { symbol: 'DMART.NS', displaySymbol: 'DMART', name: 'Avenue Supermarts Ltd (DMart)', sector: 'Retail & Supermarkets', exchange: 'NSE' },
  { symbol: 'CUPID.NS', displaySymbol: 'CUPID', name: 'Cupid Ltd', sector: 'Healthcare & Wellness', exchange: 'NSE' },
  { symbol: 'PAYTM.NS', displaySymbol: 'PAYTM', name: 'One97 Communications Ltd (Paytm)', sector: 'Fintech & Digital Payments', exchange: 'NSE' },
  { symbol: 'NYKAA.NS', displaySymbol: 'NYKAA', name: 'FSN E-Commerce Ventures Ltd (Nykaa)', sector: 'E-Commerce & Beauty', exchange: 'NSE' },
  { symbol: 'POLICYBZR.NS', displaySymbol: 'POLICYBZR', name: 'PB Fintech Ltd (Policybazaar)', sector: 'Fintech & Insurtech', exchange: 'NSE' },
  { symbol: 'CDSL.NS', displaySymbol: 'CDSL', name: 'Central Depository Services Ltd', sector: 'Capital Market Infrastructure', exchange: 'NSE' },
  { symbol: 'BSE.NS', displaySymbol: 'BSE', name: 'BSE Ltd', sector: 'Stock Exchange', exchange: 'NSE' },
  { symbol: 'ANGELONE.NS', displaySymbol: 'ANGELONE', name: 'Angel One Ltd', sector: 'Fintech Broking', exchange: 'NSE' },
  { symbol: 'MOTHERSON.NS', displaySymbol: 'MOTHERSON', name: 'Samvardhana Motherson International Ltd', sector: 'Auto Components', exchange: 'NSE' },
  { symbol: 'DIXON.NS', displaySymbol: 'DIXON', name: 'Dixon Technologies India Ltd', sector: 'Electronics Manufacturing', exchange: 'NSE' },
  { symbol: 'POLYCAB.NS', displaySymbol: 'POLYCAB', name: 'Polycab India Ltd', sector: 'Cables & Electricals', exchange: 'NSE' },
  { symbol: 'DLF.NS', displaySymbol: 'DLF', name: 'DLF Ltd', sector: 'Real Estate Development', exchange: 'NSE' },
  { symbol: 'GODREJPROP.NS', displaySymbol: 'GODREJPROP', name: 'Godrej Properties Ltd', sector: 'Real Estate Development', exchange: 'NSE' },
];

/**
 * Searches the curated stock database matching query against both ticker symbol and company name.
 * Sorts exact matches and prefix matches to the top.
 */
export function searchStocks(query: string, limit = 6): NSEStock[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = NSE_STOCKS.filter((stock) => {
    const sym = stock.displaySymbol.toLowerCase();
    const name = stock.name.toLowerCase();
    const fullSym = stock.symbol.toLowerCase();
    const sec = stock.sector.toLowerCase();

    return sym.includes(q) || name.includes(q) || fullSym.includes(q) || sec.includes(q);
  });

  // Relevance ranking
  return matched
    .sort((a, b) => {
      const aSym = a.displaySymbol.toLowerCase();
      const bSym = b.displaySymbol.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // 1. Exact symbol match
      if (aSym === q && bSym !== q) return -1;
      if (bSym === q && aSym !== q) return 1;

      // 2. Symbol starts with query
      const aSymStarts = aSym.startsWith(q);
      const bSymStarts = bSym.startsWith(q);
      if (aSymStarts && !bSymStarts) return -1;
      if (!aSymStarts && bSymStarts) return 1;

      // 3. Name starts with query
      const aNameStarts = aName.startsWith(q);
      const bNameStarts = bName.startsWith(q);
      if (aNameStarts && !bNameStarts) return -1;
      if (!aNameStarts && bNameStarts) return 1;

      // 4. Alphabetical by displaySymbol
      return aSym.localeCompare(bSym);
    })
    .slice(0, limit);
}
