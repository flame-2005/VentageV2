import OpenAI from "openai";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface VideoInput {
  title: string;
  description: string;
  thumbnailUrl?: string; // optional — used if available
}

interface FilterResult {
  process: boolean;
  stage: "hard_filter" | "llm_filter";
  reason: string;
  confidence?: number; // only for LLM filter
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─────────────────────────────────────────────
// Stage 1 — Rule-Based Hard Filter (free, instant)
// ─────────────────────────────────────────────

const BLACKLIST_KEYWORDS = [
  // Lifestyle / non-financial
  "vlog",
  "day in my life",
  "storytime",
  "morning routine",
  "motivation",
  "motivational",
  "life lessons",
  "life advice",
  "success mindset",
  "self help",
  "self-help",
  "productivity tips",
  "habits of",

  // Wrong interview types
  "interview with investor",
  "interview with economist",
  "interview with journalist",
  "interview with author",
  "investing guru",
  "investment legend",
  "billionaire mindset",

  // Personality / biography focus
  "warren buffett story",
  "rakesh jhunjhunwala life",
  "biography",
  "untold story",
  "rise of",
  "journey of",
  "from zero to",
  "how i became",

  // Entertainment / reaction
  "reaction",
  "reacting to",
  "watch me",
  "challenge",
  "prank",
  "unboxing",

  // Generic non-analytical
  "top 10 tips",
  "beginners guide to investing",
  "how to get rich",
  "passive income secrets",
  "make money online",
];
function applyHardFilters(title: string, description: string): string | null {
  const combined = `${title} ${description}`.toLowerCase();

  // // 1. Reject if too short (likely a promo/teaser with no real content signal)
  // if (description.trim().length < 80) {
  //   return `Description too short (${description.trim().length} chars) — likely a promo or teaser with no analytical content`;
  // }

  // 2. Reject if blacklisted keywords found in title (title is the strongest signal)
  const titleLower = title.toLowerCase();
  for (const kw of BLACKLIST_KEYWORDS) {
    if (titleLower.includes(kw)) {
      return `Title contains disqualifying keyword: "${kw}"`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Stage 2 — LLM Pre-classifier (binary only)
// ─────────────────────────────────────────────

const PRE_FILTER_SYSTEM_PROMPT = `
You are a senior screener for a Hedge Fund. You only have the Title and Description to decide if a video provides "Decision-Grade" financial and strategic information.

### GOAL
Identify if the content provides enough analytical depth to be classified into: 
1. Company Analysis/Update (Thesis, DRHP, or Earnings)
2. Sector Analysis (Industry structure/dynamics)
3. Management Interview (C-suite executive talk)

### THE "BREADCRUMB" RULE (Process: true)
Since you only see the Title/Description, look for these "High-Signal" breadcrumbs:
- MENTION OF SPECIFIC ENTITIES: Tickers, specific company names (TCS, Adani, PhonePe), or C-suite titles (CEO, MD, Founder).
- BUSINESS CONCEPTS: Scaling, Unit Economics, IPO Valuation, Regulatory Policy, Domicile, Market Share, or Supply Chain.
- STRATEGIC PIVOTS: Entry into new sectors (e.g., Coal to Nuclear), M&A activity, or Business Model shifts.
- PEER BENCHMARKING: Comparison between two companies (e.g., X vs Y).
- If  title indicate that it is an interview, then it is automatically a high-probability decision-grade, even if description is light on details. Interviews with senior leaders (e.g., Kalpana Morparia) are especially valuable for insights on Governance/Banking.
- If title indicate a details thesis on a company or a sector, then it is automatically a high-probability decision-grade, even if description is light on details. Business model discussions (e.g., "Restaurant Scaling") are just as valuable as raw data.
- NAMED ENTITY QUALIFIER: A company name alone is NOT a breadcrumb unless it appears alongside 
  financial context — revenue, margins, market share, valuation, earnings, or strategic positioning. 
  A company named in a workforce, cultural, or technology adoption story does not qualify.
- INSTITUTIONAL FORMAT SIGNALS:
  Titles containing:
  "Fireside Chat"
  "Management Interaction"
  "Investor Presentation"
  "Earnings Call"
  "Concall"
  "AGM"
  "Analyst Meet"
  "B&K", "ICICI Direct", "Motilal Oswal", etc.

These are automatically high-probability decision-grade.

### REJECTION CRITERIA (Process: false)
- PURE LIFESTYLE: "How to stay motivated," "My morning routine," "Life lessons."
- RETAIL CLICKBAIT: "100x Multibagger," "Stock Market Crash tomorrow," "Target price 500."
- AMATEUR GOSSIP: General news headlines without a "Why" or "Impact" analysis.
- CELEBRITY FOCUS: Interviews about a person's "Success Story" that don't mention business strategy or sector data.
- MACRO/POLICY COMMENTARY: Videos about RBI policy, budget analysis, GDP data, or economic indicators 
  without direct linkage to a specific company's financials or sector impact.
- GENERIC STRATEGY GUIDES: "How to build a portfolio", "Asset allocation strategies", 
  "Long-term vs short-term investing" — even if professionally presented.
- WORKFORCE/TECH ADOPTION COMMENTARY: Videos about employee sentiment, hiring trends, 
  developer experience, or tool adoption (e.g., "engineers don't want AI contracts", 
  "developers resist automation") are NOT decision-grade even if large companies are named. 
  The test: are the named companies being ANALYZED financially, or merely REFERENCED as examples 
  of a broader social/tech trend? If the latter, reject with high confidence (90+).

### SPECIAL OVERRIDES (DO NOT REJECT)
- STRATEGIC ROUNDUPS: Do not reject "Weekly Roundups" or "Friday Podcasts" if the description mentions specific strategic topics (e.g., Adani's Nuclear unit or PhonePe's IPO).
- VETERAN TITANS: Do not reject interviews with senior leaders (e.g., Kalpana Morparia) even if the description sounds personal; their insights on Governance/Banking are high-value.
- QUALITATIVE STRATEGY: Business model discussions (e.g., "Restaurant Scaling") are just as valuable as raw data.

### CONFIDENCE SCORE GUIDELINES
Assign a confidence score (0–100) reflecting certainty that this video is NOISE (not decision-grade):

- 95–100: Definitive noise — explicit lifestyle, clickbait, or zero financial signal. No debate possible.
- 80–94: Strong noise signal — title/description has clear non-analytical intent with minor ambiguity.
- 60–79: Leaning noise — some financial terms present but context is shallow or generic.
- 40–59: Genuinely ambiguous — real analytical signals exist alongside noise.
- 20–39: Leaning decision-grade — named entities, business concepts, or strategic framing present.
- 5–19: Strong decision-grade — multiple breadcrumbs, institutional format, or C-suite interview signals.
- 0–4: Definitive decision-grade — explicit earnings call, concall, DRHP, analyst meet, or named senior executive interview.

So: process: true should almost always pair with confidence < 40, and process: false should almost always pair with confidence > 60.

Respond ONLY in JSON: {"process": boolean, "confidence": number, "reason": "concise explanation"}
`.trim();

async function applyLLMFilter(video: VideoInput): Promise<FilterResult> {
  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

  userContent.push({
    type: "text",
    text: `Video Title: ${video.title}\n\nVideo Description:\n${video.description}`,
  });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // cheap + fast — just a binary gate
    max_tokens: 150,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PRE_FILTER_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const rawText = response.choices[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(rawText.trim());
    return {
      process: parsed.process === true,
      stage: "llm_filter",
      reason: parsed.reason ?? "No reason provided",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    };
  } catch {
    // If parsing fails, default to disqualify (safe fallback)
    return {
      process: false,
      stage: "llm_filter",
      reason: `LLM response could not be parsed — raw: ${rawText.slice(0, 100)}`,
    };
  }
}

export function parseISODurationToSeconds(
  duration?: string,
): number | undefined {
  if (!duration) return undefined;

  // Handles formats like: PT1H2M30S, PT4M10S, PT50S
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}

// ─────────────────────────────────────────────
// Main exported function
// ─────────────────────────────────────────────

export async function shouldProcessVideo(
  video: VideoInput & { duration?: string },
  pubDate: string,
): Promise<FilterResult> {
  const durationSeconds = parseISODurationToSeconds(video.duration);

  if (durationSeconds !== undefined && durationSeconds < 300) {
    return {
      process: false,
      stage: "hard_filter",
      reason: `Video too short (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s) — minimum duration is 5 minutes`,
      confidence: 100, // hard filter, so 100% confidence
    };
  }

  // reject all videos whchi are olde than 3 years, as they are unlikely to be relevant for current tagging
  const publishedDate = new Date(pubDate);
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  if (publishedDate < threeYearsAgo) {
    return {
      process: false,
      stage: "hard_filter",
      reason: `Video is older than 3 years (${pubDate}) — only considering videos from the last 3 years`,
      confidence: 100, // hard filter, so 100% confidence
    };
  }

  const hardRejectReason = applyHardFilters(video.title, video.description);
  if (hardRejectReason) {
    return {
      process: false,
      stage: "hard_filter",
      reason: hardRejectReason,
      confidence: 100, // hard filter, so 100% confidence
    };
  }

  const llmResult = await applyLLMFilter(video);
  return llmResult;
}
