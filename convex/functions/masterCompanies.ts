import { action } from "../_generated/server";
import { api } from "../_generated/api";

// Type definitions
interface ZerodhaInstrument {
  instrument_token: string | number;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: string;
  expiry: string;
  strike: string;
  tick_size: string;
  lot_size: string;
  instrument_type: string;
  segment: string;
  exchange: string;
}

interface NSERecord {
  SYMBOL: string;
  'NAME OF COMPANY': string;
  SERIES: string;
  'DATE OF LISTING': string;
  'PAID UP VALUE': string;
  'MARKET LOT': string;
  'ISIN NUMBER': string;
  'FACE VALUE': string;
}

interface ProcessedCompany {
  bse_code: string | null;
  nse_code: string;
  name: string;
  instrument_token: number;
  isin: string | null;
  exchange: string;
  record_hash: string;
  created_at: string;
  updated_at: string;
  market_cap: number | null;
}

// Action to refresh master company details
export const refreshMasterCompanyDetails = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting master company details refresh...');

      // Step 1: Fetch data from Zerodha API
      console.log('Fetching data from Zerodha API...');
      const zerodhaResponse = await fetch('https://api.kite.trade/instruments');
      
      if (!zerodhaResponse.ok) {
        throw new Error(`Failed to fetch Zerodha data: ${zerodhaResponse.status}`);
      }
      
      const zerodhaCsv = await zerodhaResponse.text();
      const zerodhaData = parseCSV<ZerodhaInstrument>(zerodhaCsv);

      // Step 2: Fetch ISIN data from NSE
      console.log('Fetching ISIN data from NSE...');
      const nseResponse = await fetch('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
      let nseData: NSERecord[] = [];
      
      if (nseResponse.ok) {
        const nseCsv = await nseResponse.text();
        nseData = parseCSV<NSERecord>(nseCsv);
      } else {
        console.warn('Failed to fetch NSE ISIN data, proceeding without ISIN values');
      }

      // Step 3: Process and merge data
      console.log('Processing and merging data...');
      const processedData = processInstrumentData(zerodhaData, nseData);

      if (processedData.length === 0) {
        throw new Error('No valid records to insert after processing');
      }

      // Step 4: Delete all existing records and insert new ones
      console.log(`Deleting old records and inserting ${processedData.length} new records...`);
      
      await ctx.runMutation(api.functions.masterCompany.replaceAllCompanies, {
        companies: processedData
      });

      console.log('Successfully completed refresh');

      return {
        success: true,
        message: 'Successfully refreshed master company details',
        total_count: processedData.length,
        sample: processedData.slice(0, 5)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Processing error:', error);
      return {
        success: false,
        message: `Data processing failed: ${errorMessage}`,
        error: errorMessage
      };
    }
  },
});

// Helper function to parse CSV data
function parseCSV<T>(csvText: string): T[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => {
    const trimmed = h.trim();
    return trimmed.replace(/^"|"$/g, '');
  });

  const data: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    if (values.length !== headers.length) {
      continue;
    }

    const row: Record<string, string | null> = {};
    headers.forEach((header, index) => {
      const value = values[index] || null;
      if (value && typeof value === 'string') {
        row[header] = value.replace(/^"|"$/g, '');
      } else {
        row[header] = value;
      }
    });
    data.push(row as T);
  }

  return data;
}

// Helper function to process instrument data
function processInstrumentData(
  zerodhaData: ZerodhaInstrument[], 
  nseData: NSERecord[]
): ProcessedCompany[] {
  console.log(`Processing ${zerodhaData.length} zerodha records and ${nseData.length} NSE records`);

  // Filter for equities on NSE and BSE
  const equities = zerodhaData.filter(
    (row) =>
      (row.exchange === 'NSE' || row.exchange === 'BSE') &&
      row.instrument_type === 'EQ' &&
      !row.tradingsymbol?.includes('INAV')
  );

  console.log(`Filtered equities: ${equities.length} records`);

  // Create NSE ISIN lookup map
  const nseMap = new Map<string, string>();
  nseData.forEach((row) => {
    const series = row.SERIES;
    const symbol = row.SYMBOL;
    const isin = row['ISIN NUMBER'];

    if (series === 'EQ' && symbol && isin) {
      nseMap.set(symbol, isin);
    }
  });

  console.log(`Created ISIN map with ${nseMap.size} entries`);

  // Group by tradingsymbol to merge NSE and BSE data
  const grouped = new Map<string, ZerodhaInstrument[]>();
  equities.forEach((row) => {
    const symbol = row.tradingsymbol;
    if (!grouped.has(symbol)) {
      grouped.set(symbol, []);
    }
    grouped.get(symbol)!.push(row);
  });

  const processedRecords: ProcessedCompany[] = [];
  let isinMatches = 0;

  for (const [symbol, records] of grouped) {
    let nseRow: ZerodhaInstrument | undefined = undefined;
    let bseRow: ZerodhaInstrument | undefined = undefined;

    for (const record of records) {
      if (record.exchange === 'NSE') nseRow = record;
      if (record.exchange === 'BSE') bseRow = record;
    }

    const primaryRow = nseRow ?? bseRow;
    if (!primaryRow) continue;

    // Skip records with unwanted names
    const name = primaryRow.name || '';
    if (
      name.includes('%') ||
      name === 'NIPPON INDIA MUTUAL FUND' ||
      name.startsWith('GOI TBILL') ||
      !name
    ) {
      continue;
    }

    // Get ISIN from NSE data
    const isin = nseMap.get(primaryRow.tradingsymbol) || null;
    if (isin) {
      isinMatches++;
    }

    // Generate record hash
    const bseToken = bseRow?.exchange_token ?? '';
    const hashString = `${bseToken}|${primaryRow.tradingsymbol}|${name}|${primaryRow.instrument_token}`;

    const record: ProcessedCompany = {
      bse_code: bseRow?.exchange_token ?? null,
      nse_code: primaryRow.tradingsymbol,
      name: name,
      instrument_token: typeof primaryRow.instrument_token === 'string' 
        ? parseInt(primaryRow.instrument_token, 10) 
        : primaryRow.instrument_token,
      isin: isin,
      exchange: primaryRow.exchange,
      record_hash: hashString,
      market_cap: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    processedRecords.push(record);
  }

  console.log(`Processed ${processedRecords.length} valid records with ${isinMatches} ISIN matches`);
  return processedRecords;
}