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
}

const client = new OpenAI({
  apiKey:process.env.OPENAI_API_KEY || "",
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
4. Macro Analysis (Policy/Economy impact)
5. General Investment Guide (Professional-grade strategy)

### THE "BREADCRUMB" RULE (Process: true)
Since you only see the Title/Description, look for these "High-Signal" breadcrumbs:
- MENTION OF SPECIFIC ENTITIES: Tickers, specific company names (TCS, Adani, PhonePe), or C-suite titles (CEO, MD, Founder).
- BUSINESS CONCEPTS: Scaling, Unit Economics, IPO Valuation, Regulatory Policy, Domicile, Market Share, or Supply Chain.
- STRATEGIC PIVOTS: Entry into new sectors (e.g., Coal to Nuclear), M&A activity, or Business Model shifts.
- PEER BENCHMARKING: Comparison between two companies (e.g., X vs Y).
- If  title indicate that it is an interview, then it is automatically a high-probability decision-grade, even if description is light on details. Interviews with senior leaders (e.g., Kalpana Morparia) are especially valuable for insights on Governance/Banking.
- If title indicate a details thesis on a company or a sector, then it is automatically a high-probability decision-grade, even if description is light on details. Business model discussions (e.g., "Restaurant Scaling") are just as valuable as raw data.
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

### SPECIAL OVERRIDES (DO NOT REJECT)
- STRATEGIC ROUNDUPS: Do not reject "Weekly Roundups" or "Friday Podcasts" if the description mentions specific strategic topics (e.g., Adani's Nuclear unit or PhonePe's IPO).
- VETERAN TITANS: Do not reject interviews with senior leaders (e.g., Kalpana Morparia) even if the description sounds personal; their insights on Governance/Banking are high-value.
- QUALITATIVE STRATEGY: Business model discussions (e.g., "Restaurant Scaling") are just as valuable as raw data.

Respond ONLY in JSON: {"process": boolean, "reason": "concise explanation"}
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
): Promise<FilterResult> {
  const durationSeconds = parseISODurationToSeconds(video.duration);

  if (durationSeconds !== undefined && durationSeconds < 300) {
    return {
      process: false,
      stage: "hard_filter",
      reason: `Video too short (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s) — minimum duration is 5 minutes`,
    };
  }

  const hardRejectReason = applyHardFilters(video.title, video.description);
  if (hardRejectReason) {
    return {
      process: false,
      stage: "hard_filter",
      reason: hardRejectReason,
    };
  }

  const llmResult = await applyLLMFilter(video);
  return llmResult;
}
