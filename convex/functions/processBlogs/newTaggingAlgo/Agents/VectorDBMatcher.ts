"use node"

import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CompanyResolutionResult {
  inputName: string;
  status: 'found' | 'ambiguous' | 'not_found';
  matchedName?: string;
  nseCode?: string;
  bseCode?: string;
  marketCap?:number
  confidence?: number;
  matchType?: 'exact_code' | 'semantic' | 'fuzzy';
  alternativeMatches?: Array<{
    name: string;
    nseCode?: string;
    bseCode?: string;
    confidence: number;
  }>;
}

// Pinecone RecordMetadataValue can be: string | number | boolean | string[] | null
interface CompanyMetadata extends RecordMetadata {
  companyName: string;
  nseCode: string;
  bseCode: string;
  market_cap: number;
}

interface PineconeMatch {
  id: string;
  score?: number;
  values?: number[];
  sparseValues?: {
    indices: number[];
    values: number[];
  };
  metadata?: CompanyMetadata;
}

interface PineconeQueryResponse {
  matches: PineconeMatch[];
  namespace: string;
  usage?: {
    readUnits?: number;
  };
}

interface PineconeFetchResponse {
  records: Record<string, {
    id: string;
    values?: number[];
    metadata?: CompanyMetadata;
  }>;
  namespace: string;
  usage?: {
    readUnits?: number;
  };
}

interface ProcessedMatch {
  name: string;
  nseCode: string | null;
  bseCode: string | null;
  marketCap?:number
  confidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  pineconeApiKey: process.env.PINECONE_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY ,
  indexName: process.env.PINECONE_INDEX_NAME || 'companies',
  namespace: process.env.PINECONE_NAMESPACE || 'company-names',
  embeddingModel: 'text-embedding-3-large' as const,
  topK: 10,
  confidenceThreshold: 0.75,
  ambiguityThreshold: 0.5,
};

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let pineconeClient: Pinecone | null = null;
let openaiClient: OpenAI | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: CONFIG.pineconeApiKey,
    });
  }
  return pineconeClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: CONFIG.openaiApiKey,
    });
  }
  return openaiClient;
}

// ============================================================================
// MAIN RESOLVER FUNCTION
// ============================================================================

export async function resolveCompanyNames(
  companyNames: string[]
): Promise<CompanyResolutionResult[]> {
  if (!companyNames || companyNames.length === 0) {
    return [];
  }

  const pinecone = getPineconeClient();
  const index = pinecone.Index<CompanyMetadata>(CONFIG.indexName);
  const results: CompanyResolutionResult[] = [];

  // Minimum market cap filter (30 crores)
  const MIN_MARKET_CAP = 30000000;

  for (const companyName of companyNames) {
    try {
      console.log(`\n🔍 Resolving: "${companyName}"`);
      
      // Strategy 1: Try exact code match first (NSE/BSE code)
      const codeMatch = await tryExactCodeMatch(index, companyName, MIN_MARKET_CAP);
      if (codeMatch) {
        console.log(`   ✓ Found by exact code match`);
        results.push(codeMatch);
        continue;
      }

      // Strategy 2: Try semantic search with embeddings
      const semanticMatch = await trySemanticMatch(index, companyName, MIN_MARKET_CAP);
      results.push(semanticMatch);

    } catch (error) {
      console.error(`❌ Error resolving company "${companyName}":`, error);
      results.push({
        inputName: companyName,
        status: 'not_found',
      });
    }
  }

  return results;
}

// ============================================================================
// SEARCH STRATEGIES
// ============================================================================

/**
 * Strategy 1: Try to match by exact NSE/BSE code
 * Searches for vectors where the ID matches the input
 */
async function tryExactCodeMatch(
  index: Index<CompanyMetadata>,
  input: string,
  minMarketCap: number
): Promise<CompanyResolutionResult | null> {
  const normalizedInput = input.toUpperCase().trim();
  
  try {
    // Fetch by ID (NSE/BSE codes are used as vector IDs)
    const fetchResult = await index.namespace(CONFIG.namespace).fetch([normalizedInput]);
    
    if (fetchResult.records && Object.keys(fetchResult.records).length > 0) {
      const record = fetchResult.records[normalizedInput];
      const metadata = record.metadata;
      
      // Apply market cap filter
      const marketCap = metadata?.market_cap || 0;
      if (marketCap < minMarketCap) {
        console.log(`   ⚠️ Excluded: Market cap ${marketCap} < ${minMarketCap} crores`);
        return null;
      }
      
      return {
        inputName: input,
        status: 'found',
        matchedName: metadata?.companyName || '',
        nseCode: metadata?.nseCode || undefined,
        bseCode: metadata?.bseCode || undefined,
        marketCap:metadata?.market_cap ,
        confidence: 1.0, // Exact match
        matchType: 'exact_code',
      };
    }
  } catch (error) {
    // Fetch failed, not a valid ID - continue to semantic search
  }
  
  return null;
}

/**
 * Strategy 2: Semantic search using embeddings
 * Generates embedding and searches for similar vectors
 */
async function trySemanticMatch(
  index: Index<CompanyMetadata>,
  input: string,
  minMarketCap: number
): Promise<CompanyResolutionResult> {
  // Normalize the input name
  const normalizedName = normalizeCompanyName(input);
  console.log(`   Normalized: "${normalizedName}"`);

  // Generate embedding for the company name
  const embedding = await generateEmbedding(normalizedName);

  // Query Pinecone Vector DB with market cap filter
  const queryResponse = await index.namespace(CONFIG.namespace).query({
    vector: embedding,
    topK: CONFIG.topK,
    includeMetadata: true,
    filter: {
      market_cap: { $gte: minMarketCap }
    }
  }) as PineconeQueryResponse;

  console.log(`   Found ${queryResponse.matches.length} semantic matches (market cap >= ${minMarketCap} cr)`);
  
  // Log top 3 matches for debugging
  queryResponse.matches.slice(0, 3).forEach((match, idx) => {
    const metadata = match.metadata;
    console.log(`   ${idx + 1}. ${metadata?.companyName || 'Unknown'} (NSE: ${metadata?.nseCode || 'N/A'}, MCap: ${metadata?.market_cap || 'N/A'} cr) - Score: ${(match.score || 0).toFixed(4)}`);
  });

  // Process matches
  const resolution = processMatches(input, queryResponse.matches);
  resolution.matchType = 'semantic';
  
  console.log(`   ✓ Status: ${resolution.status}`);

  return resolution;
}

// ============================================================================
// ENHANCED SEARCH WITH FILTER
// ============================================================================

interface FilterOptions {
  nseCode?: string;
  bseCode?: string;
  minMarketCap?: number;
}

/**
 * Search with metadata filter (advanced usage)
 * Can filter by specific NSE/BSE codes or other metadata
 */
export async function resolveWithFilter(
  companyNames: string[],
  filter?: FilterOptions
): Promise<CompanyResolutionResult[]> {
  const pinecone = getPineconeClient();
  const index = pinecone.Index<CompanyMetadata>(CONFIG.indexName);
  const results: CompanyResolutionResult[] = [];

  for (const companyName of companyNames) {
    try {
      const normalizedName = normalizeCompanyName(companyName);
      const embedding = await generateEmbedding(normalizedName);

      // Build metadata filter
      const metadataFilter: Record<string, string | number | { $gte: number }> = {};
      if (filter?.nseCode) metadataFilter.nseCode = filter.nseCode;
      if (filter?.bseCode) metadataFilter.bseCode = filter.bseCode;
      if (filter?.minMarketCap) {
        metadataFilter.market_cap = { $gte: filter.minMarketCap };
      }

      const queryResponse = await index.namespace(CONFIG.namespace).query({
        vector: embedding,
        topK: CONFIG.topK,
        includeMetadata: true,
        filter: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
      }) as PineconeQueryResponse;

      const resolution = processMatches(companyName, queryResponse.matches);
      results.push(resolution);

    } catch (error) {
      console.error(`Error resolving "${companyName}":`, error);
      results.push({
        inputName: companyName,
        status: 'not_found',
      });
    }
  }

  return results;
}

// ============================================================================
// BATCH SEARCH BY CODES
// ============================================================================

/**
 * Efficiently fetch multiple companies by their NSE/BSE codes
 * No embedding needed - direct ID lookup
 */
export async function resolveByCodesOnly(
  codes: string[]
): Promise<CompanyResolutionResult[]> {
  if (!codes || codes.length === 0) {
    return [];
  }

  const pinecone = getPineconeClient();
  const index = pinecone.Index<CompanyMetadata>(CONFIG.indexName);
  
  const normalizedCodes = codes.map(c => c.toUpperCase().trim());
  
  try {
    const fetchResult = await index.namespace(CONFIG.namespace).fetch(normalizedCodes) as PineconeFetchResponse;
    
    return codes.map(code => {
      const normalizedCode = code.toUpperCase().trim();
      const record = fetchResult.records?.[normalizedCode];
      
      if (record && record.metadata) {
        const metadata = record.metadata;
        return {
          inputName: code,
          status: 'found' as const,
          matchedName: metadata.companyName || '',
          nseCode: metadata.nseCode || undefined,
          bseCode: metadata.bseCode || undefined,
          marketCap:metadata.market_cap,
          confidence: 1.0,
          matchType: 'exact_code' as const,
        };
      }
      
      return {
        inputName: code,
        status: 'not_found' as const,
      };
    });
  } catch (error) {
    console.error('Error fetching by codes:', error);
    return codes.map(code => ({
      inputName: code,
      status: 'not_found' as const,
    }));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes company name for better matching
 */
function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bLtd\.?\b/gi, 'Limited')
    .replace(/\bPvt\.?\b/gi, 'Private')
    .toUpperCase();
}

/**
 * Generates embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  
  const response = await openai.embeddings.create({
    model: CONFIG.embeddingModel,
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * Processes vector search matches and determines resolution status
 */
function processMatches(
  inputName: string,
  matches: PineconeMatch[]
): CompanyResolutionResult {
  if (!matches || matches.length === 0) {
    return {
      inputName,
      status: 'not_found',
    };
  }

  // Extract match data
  const processedMatches: ProcessedMatch[] = matches.map((match) => ({
    name: match.metadata?.companyName || '',
    nseCode: match.metadata?.nseCode || null,
    bseCode: match.metadata?.bseCode || null,
    marketCap:match.metadata?.market_cap,
    confidence: match.score || 0,
  }));

  const topMatch = processedMatches[0];

  // Case 1: High confidence single match
  if (topMatch.confidence >= CONFIG.confidenceThreshold) {
    const closeMatches = processedMatches.filter(
      (m, idx) => 
        idx > 0 && 
        m.confidence >= CONFIG.ambiguityThreshold
    );

    if (closeMatches.length > 0) {
      // Multiple strong matches - ambiguous
      return {
        inputName,
        status: 'ambiguous',
        matchedName: topMatch.name,
        nseCode: topMatch.nseCode || undefined,
        bseCode: topMatch.bseCode || undefined,
        marketCap: topMatch.marketCap || undefined,
        confidence: topMatch.confidence,
        alternativeMatches: closeMatches.map(m => ({
          name: m.name,
          nseCode: m.nseCode || undefined,
          bseCode: m.bseCode || undefined,
          marketCap: m.marketCap || undefined,
          confidence: m.confidence,
        })),
      };
    }

    // Single confident match
    return {
      inputName,
      status: 'found',
      matchedName: topMatch.name,
      nseCode: topMatch.nseCode || undefined,
      bseCode: topMatch.bseCode || undefined,
      marketCap: topMatch.marketCap || undefined,
      confidence: topMatch.confidence,
    };
  }

  // Case 2: Medium confidence - check for ambiguity
  if (topMatch.confidence >= CONFIG.ambiguityThreshold) {
    const similarMatches = processedMatches.filter(
      m => m.confidence >= CONFIG.ambiguityThreshold * 0.95
    );

    if (similarMatches.length > 1) {
      // Multiple similar matches - ambiguous
      return {
        inputName,
        status: 'ambiguous',
        matchedName: topMatch.name,
        nseCode: topMatch.nseCode || undefined,
        bseCode: topMatch.bseCode || undefined,
        marketCap: topMatch.marketCap || undefined,
        confidence: topMatch.confidence,
        alternativeMatches: similarMatches.slice(1).map(m => ({
          name: m.name,
          nseCode: m.nseCode || undefined,
          bseCode: m.bseCode || undefined,
          marketCap: m.marketCap || undefined,
          confidence: m.confidence,
        })),
      };
    }

    // Single match above ambiguity threshold - return as found
    return {
      inputName,
      status: 'found',
      matchedName: topMatch.name,
      nseCode: topMatch.nseCode || undefined,
      bseCode: topMatch.bseCode || undefined,
      marketCap: topMatch.marketCap || undefined,
      confidence: topMatch.confidence,
    };
  }

  // Case 3: No confident match found (below ambiguity threshold)
  return {
    inputName,
    status: 'not_found',
    alternativeMatches: processedMatches.slice(0, 3).map(m => ({
      name: m.name,
      nseCode: m.nseCode || undefined,
      bseCode: m.bseCode || undefined,
      marketCap: m.marketCap || undefined,
      confidence: m.confidence,
    })),
  };
}

// ============================================================================
// BATCH RESOLUTION WITH OPTIONS
// ============================================================================

interface ResolutionOptions {
  confidenceThreshold?: number;
  ambiguityThreshold?: number;
  topK?: number;
}

/**
 * Resolves company names with custom configuration
 */
export async function resolveCompanyNamesWithOptions(
  companyNames: string[],
  options?: ResolutionOptions
): Promise<CompanyResolutionResult[]> {
  const originalConfig = { ...CONFIG };
  
  if (options?.confidenceThreshold !== undefined) {
    CONFIG.confidenceThreshold = options.confidenceThreshold;
  }
  if (options?.ambiguityThreshold !== undefined) {
    CONFIG.ambiguityThreshold = options.ambiguityThreshold;
  }
  if (options?.topK !== undefined) {
    CONFIG.topK = options.topK;
  }

  try {
    const results = await resolveCompanyNames(companyNames);
    return results;
  } finally {
    Object.assign(CONFIG, originalConfig);
  }
}

// ============================================================================
// UTILITY: GET SUMMARY STATISTICS
// ============================================================================

interface ResolutionStats {
  total: number;
  found: number;
  ambiguous: number;
  notFound: number;
  successRate: number;
  byMatchType: {
    exact_code: number;
    semantic: number;
    fuzzy: number;
  };
}

/**
 * Returns summary statistics of resolution results
 */
export function getResolutionStats(
  results: CompanyResolutionResult[]
): ResolutionStats {
  const total = results.length;
  const found = results.filter(r => r.status === 'found').length;
  const ambiguous = results.filter(r => r.status === 'ambiguous').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const successRate = total > 0 ? (found / total) * 100 : 0;

  const byMatchType = {
    exact_code: results.filter(r => r.matchType === 'exact_code').length,
    semantic: results.filter(r => r.matchType === 'semantic').length,
    fuzzy: results.filter(r => r.matchType === 'fuzzy').length,
  };

  return {
    total,
    found,
    ambiguous,
    notFound,
    successRate: parseFloat(successRate.toFixed(2)),
    byMatchType,
  };
}