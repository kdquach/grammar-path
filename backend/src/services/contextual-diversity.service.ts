/**
 * Contextual Diversity Engine
 * Phase 3.4C.3: Evidence Quality, Multi-Tier Similarity, and Context Independence
 *
 * Implements 5 linguistic signals:
 * 1. S_norm: Normalized Sentence / Template Similarity
 * 2. S_slot: Blank-Slot Syntactic Alignment
 * 3. S_dist: Distractor Morphological Overlap
 * 4. S_rule: Grammar Rule & Concept Overlap
 * 5. S_sem:  Semantic & Workplace Scenario Similarity
 *
 * Provides Contextual Distance (D_ctx) and Context Equivalence Clustering.
 */

export interface QuestionForDiversityAnalysis {
  id: string;
  prompt: string;
  options: Array<{ optionKey: string; optionText: string; isCorrect: boolean }>;
  unitNumber?: number | null;
  conceptId?: string | null;
  primarySkill?: string | null;
  ruleReference?: string | null;
}

export type QuestionPairRelationship =
  | "EXACT_DUPLICATE"
  | "TEMPLATE_DUPLICATE"
  | "SAME_RULE_NOVEL_CONTEXT"
  | "DIFFERENT_RULE_SIMILAR_CONTEXT"
  | "INDEPENDENT";

export interface DiversitySignalMetrics {
  sNorm: number;    // 0.00 to 1.00: Normalized Template Similarity
  sSlot: number;    // 0.00 to 1.00: Blank-Slot Syntactic Alignment
  sDist: number;    // 0.00 to 1.00: Distractor Morphological Overlap
  sRule: number;    // 0.00 to 1.00: Grammar Rule & Concept Overlap
  sSem: number;     // 0.00 to 1.00: Semantic Scenario Similarity
  sCarrier: number; // 0.00 to 1.00: Combined Carrier Context Similarity
  dCtx: number;     // 0.00 to 1.00: Contextual Distance (1 - sCarrier)
  relationship: QuestionPairRelationship;
  isUncertain: boolean;
  uncertaintyReason?: string;
  workplaceDomainA: string;
  workplaceDomainB: string;
}

export interface ContextClusterResult {
  clusterId: string;
  domain: string;
  items: QuestionForDiversityAnalysis[];
}

export interface ConceptContextInventory {
  conceptId: string;
  conceptCode?: string;
  conceptName?: string;
  unitNumber: number;
  distinctQuestionCount: number;
  independentContextCount: number; // K_ctx
  isEvidenceSufficient: boolean;   // K_ctx >= 3 AND >= 3 approved latest items
  clusters: ContextClusterResult[];
}

// Workplace domain keywords for TOEIC Part 5
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  it_technology: [
    "server", "network", "software", "hardware", "computer", "database", "it",
    "technician", "system", "cybersecurity", "code", "internet", "device", "firewall",
    "router", "backup", "installation", "developer", "programming"
  ],
  marketing_sales: [
    "marketing", "campaign", "client", "customer", "sales", "advertising", "ad",
    "presentation", "product", "market", "promotion", "consumer", "brand", "retail",
    "merchandise", "commercial", "publicity", "billboard", "brochure"
  ],
  logistics_shipping: [
    "shipping", "customs", "freight", "warehouse", "cargo", "port", "delivery",
    "courier", "packages", "transportation", "logistics", "transit", "shipment",
    "carrier", "vessel", "maritime", "dock", "inventory", "distribution"
  ],
  finance_accounting: [
    "budget", "invoice", "revenue", "quarterly", "financial", "accountant", "cost",
    "audit", "fiscal", "expense", "profits", "tax", "payroll", "expenditure",
    "earnings", "billing", "reimbursement", "voucher", "transaction"
  ],
  corporate_management: [
    "director", "manager", "meeting", "board", "conference", "executive", "employee",
    "contract", "policy", "staff", "personnel", "reception", "supervisor", "committee",
    "headquarters", "memorandum", "annual", "consultant", "corporate"
  ],
  manufacturing_production: [
    "factory", "plant", "assembly", "equipment", "production", "manufacturing",
    "facility", "machinery", "quality", "inspection", "robotic", "maintenance",
    "operator", "output", "materials", "industrial", "warehouse"
  ],
  human_resources: [
    "recruitment", "interview", "resume", "hiring", "applicant", "candidate",
    "benefits", "training", "orientation", "probation", "performance", "appraisal",
    "promotion", "resignation", "pension", "salary"
  ],
  hospitality_travel: [
    "hotel", "flight", "airline", "reservation", "guest", "restaurant", "travel",
    "ticket", "airport", "shuttle", "suite", "amenities", "accommodations", "banquet"
  ],
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with",
  "by", "of", "from", "is", "are", "was", "were", "be", "been", "being", "have",
  "has", "had", "do", "does", "did", "this", "that", "these", "those", "it",
  "its", "they", "them", "their", "he", "him", "his", "she", "her", "hers",
  "we", "us", "our", "ours", "i", "me", "my", "you", "your", "yours"
]);

/**
 * Normalizes a prompt by replacing blanks with [BLANK], lowercasing, and stripping punctuation.
 */
export function normalizePromptSkeleton(prompt: string): string {
  return prompt
    .replace(/_{2,}|\[___\]|\[blank\]|\.\.\./gi, "[BLANK]")
    .toLowerCase()
    .replace(/[^a-z0-9\s\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes Levenshtein distance between two strings.
 */
export function computeLevenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[s2.length][s1.length];
}

/**
 * Extracts word 2-grams (bigrams) from a normalized string.
 */
export function extractBigrams(normalized: string): Set<string> {
  const words = normalized.split(/\s+/).filter(Boolean);
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

/**
 * Jaccard similarity between two Sets.
 */
export function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount > 0 ? intersectionCount / unionCount : 0.0;
}

/**
 * Signal 1: S_norm — Normalized Template / Sentence Similarity (0.0 to 1.0)
 */
export function computeTemplateSimilarity(promptA: string, promptB: string): number {
  const normA = normalizePromptSkeleton(promptA);
  const normB = normalizePromptSkeleton(promptB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const bigramsA = extractBigrams(normA);
  const bigramsB = extractBigrams(normB);
  const jaccard = jaccardSimilarity(bigramsA, bigramsB);

  const maxLen = Math.max(normA.length, normB.length);
  const levDist = computeLevenshteinDistance(normA, normB);
  const levSim = maxLen > 0 ? Math.max(0, 1 - levDist / maxLen) : 0;

  return Math.round((0.50 * jaccard + 0.50 * levSim) * 1000) / 1000;
}

/**
 * Extracts left and right token windows around the [BLANK] token.
 */
export function extractBlankContextWindow(prompt: string, windowSize: number = 3): { left: string[]; right: string[] } {
  const norm = normalizePromptSkeleton(prompt);
  const tokens = norm.split(/\s+/).filter(Boolean);
  const blankIdx = tokens.indexOf("[blank]");

  if (blankIdx === -1) {
    return { left: [], right: [] };
  }

  const left = tokens.slice(Math.max(0, blankIdx - windowSize), blankIdx);
  const right = tokens.slice(blankIdx + 1, Math.min(tokens.length, blankIdx + 1 + windowSize));
  return { left, right };
}

/**
 * Signal 2: S_slot — Blank-Slot Syntactic Alignment (0.0 to 1.0)
 */
export function computeSlotAlignment(promptA: string, promptB: string): number {
  const winA = extractBlankContextWindow(promptA, 3);
  const winB = extractBlankContextWindow(promptB, 3);

  if (winA.left.length === 0 || winB.left.length === 0) {
    return 0.0;
  }

  const leftSetA = new Set(winA.left);
  const leftSetB = new Set(winB.left);
  const rightSetA = new Set(winA.right);
  const rightSetB = new Set(winB.right);

  const simLeft = jaccardSimilarity(leftSetA, leftSetB);
  const simRight = jaccardSimilarity(rightSetA, rightSetB);

  return Math.round((0.50 * simLeft + 0.50 * simRight) * 1000) / 1000;
}

/**
 * Classifies a prompt into a workplace domain.
 */
export function classifyWorkplaceDomain(prompt: string): string {
  const words = prompt.toLowerCase().replace(/[^a-z]/g, " ").split(/\s+/).filter(Boolean);
  const scores: Record<string, number> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let matchCount = 0;
    for (const word of words) {
      if (keywords.includes(word)) matchCount++;
    }
    if (matchCount > 0) scores[domain] = matchCount;
  }

  let bestDomain = "general_business";
  let maxScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

/**
 * Signal 3: S_sem — Semantic & Workplace Scenario Similarity (0.0 to 1.0)
 */
export function computeSemanticSimilarity(promptA: string, promptB: string): { similarity: number; domainA: string; domainB: string } {
  const domainA = classifyWorkplaceDomain(promptA);
  const domainB = classifyWorkplaceDomain(promptB);

  const wordsA = new Set(
    promptA
      .toLowerCase()
      .replace(/[^a-z]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
  const wordsB = new Set(
    promptB
      .toLowerCase()
      .replace(/[^a-z]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );

  const domainMatch = domainA === domainB && domainA !== "general_business" ? 1.0 : 0.0;
  const contentJaccard = jaccardSimilarity(wordsA, wordsB);

  const sim = Math.round((0.50 * domainMatch + 0.50 * contentJaccard) * 1000) / 1000;
  return { similarity: sim, domainA, domainB };
}

/**
 * Extracts grammatical suffixes from options to determine distractor morphology profile.
 */
export function extractOptionMorphologyProfile(options: Array<{ optionText: string }>): Set<string> {
  const affixes = new Set<string>();
  for (const opt of options) {
    const text = opt.optionText.trim().toLowerCase();
    if (text.endsWith("ing")) affixes.add("ing");
    else if (text.endsWith("ed")) affixes.add("ed");
    else if (text.endsWith("es") || text.endsWith("s")) affixes.add("s");
    else if (text.endsWith("tion") || text.endsWith("sion")) affixes.add("tion");
    else if (text.endsWith("ly")) affixes.add("ly");
    else if (text.endsWith("ive")) affixes.add("ive");
    else if (text.endsWith("ment")) affixes.add("ment");
    else affixes.add("base_form");
  }
  return affixes;
}

/**
 * Signal 4: S_dist — Distractor Morphological Overlap (0.0 to 1.0)
 */
export function computeDistractorMorphologicalOverlap(
  optionsA: Array<{ optionText: string }>,
  optionsB: Array<{ optionText: string }>
): number {
  if (!optionsA.length || !optionsB.length) return 0.0;

  const affixesA = extractOptionMorphologyProfile(optionsA);
  const affixesB = extractOptionMorphologyProfile(optionsB);

  return Math.round(jaccardSimilarity(affixesA, affixesB) * 1000) / 1000;
}

/**
 * Signal 5: S_rule — Grammar Rule & Concept Overlap (0.0 to 1.0)
 */
export function computeRuleOverlap(itemA: QuestionForDiversityAnalysis, itemB: QuestionForDiversityAnalysis): number {
  let score = 0.0;

  if (itemA.conceptId && itemB.conceptId && itemA.conceptId === itemB.conceptId) {
    score += 0.50;
  }
  if (itemA.unitNumber && itemB.unitNumber && itemA.unitNumber === itemB.unitNumber) {
    score += 0.20;
  }
  if (itemA.primarySkill && itemB.primarySkill && itemA.primarySkill === itemB.primarySkill) {
    score += 0.15;
  }
  if (itemA.ruleReference && itemB.ruleReference && itemA.ruleReference === itemB.ruleReference) {
    score += 0.15;
  }

  return Math.round(score * 1000) / 1000;
}

/**
 * Evaluates full multi-tier diversity metrics between two question items.
 */
export function evaluatePairwiseDiversity(
  itemA: QuestionForDiversityAnalysis,
  itemB: QuestionForDiversityAnalysis
): DiversitySignalMetrics {
  const sNorm = computeTemplateSimilarity(itemA.prompt, itemB.prompt);
  const sSlot = computeSlotAlignment(itemA.prompt, itemB.prompt);
  const sDist = computeDistractorMorphologicalOverlap(itemA.options, itemB.options);
  const sRule = computeRuleOverlap(itemA, itemB);
  const { similarity: sSem, domainA, domainB } = computeSemanticSimilarity(itemA.prompt, itemB.prompt);

  // Combined Carrier Context Similarity:
  // sCarrier = max(S_norm, 0.60 * S_slot + 0.40 * S_sem)
  const sCarrier = Math.round(Math.max(sNorm, 0.60 * sSlot + 0.40 * sSem) * 1000) / 1000;
  const dCtx = Math.round((1.0 - sCarrier) * 1000) / 1000;

  // Uncertainty detection
  let isUncertain = false;
  let uncertaintyReason: string | undefined;

  const contentTokens = normalizePromptSkeleton(itemA.prompt).split(/\s+/).filter(Boolean);
  if (contentTokens.length < 6) {
    isUncertain = true;
    uncertaintyReason = "prompt_too_short_for_confident_diversity_assessment";
  } else if (!extractBlankContextWindow(itemA.prompt).left.length) {
    isUncertain = true;
    uncertaintyReason = "blank_slot_position_unresolved";
  }

  // Determine relationship category
  let relationship: QuestionPairRelationship = "INDEPENDENT";

  const optionsTextA = itemA.options.map((o) => o.optionText.trim().toLowerCase()).sort().join("|");
  const optionsTextB = itemB.options.map((o) => o.optionText.trim().toLowerCase()).sort().join("|");

  if (sNorm >= 0.95 && optionsTextA === optionsTextB) {
    relationship = "EXACT_DUPLICATE";
  } else if (sNorm >= 0.85) {
    relationship = "TEMPLATE_DUPLICATE";
  } else if (sRule >= 0.70 && dCtx >= 0.50) {
    relationship = "SAME_RULE_NOVEL_CONTEXT"; // Ideal Transfer!
  } else if (sRule < 0.50 && sCarrier >= 0.70) {
    relationship = "DIFFERENT_RULE_SIMILAR_CONTEXT";
  } else {
    relationship = dCtx >= 0.50 ? "INDEPENDENT" : "TEMPLATE_DUPLICATE";
  }

  return {
    sNorm,
    sSlot,
    sDist,
    sRule,
    sSem,
    sCarrier,
    dCtx,
    relationship,
    isUncertain,
    uncertaintyReason,
    workplaceDomainA: domainA,
    workplaceDomainB: domainB,
  };
}

/**
 * Partitions a collection of questions into Independent Context Clusters using D_ctx >= 0.50.
 * Two items belong to the same cluster if D_ctx < 0.50 (sCarrier > 0.50).
 */
export function clusterQuestionsIntoIndependentContexts(
  items: QuestionForDiversityAnalysis[]
): ContextClusterResult[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [
      {
        clusterId: `cluster-1`,
        domain: classifyWorkplaceDomain(items[0].prompt),
        items: [items[0]],
      },
    ];
  }

  // Graph connected components algorithm
  const n = items.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const metrics = evaluatePairwiseDiversity(items[i], items[j]);
      // If distance < 0.50 (contextually similar), group them into the same equivalence class
      if (metrics.dCtx < 0.50) {
        union(i, j);
      }
    }
  }

  const clusterMap = new Map<number, QuestionForDiversityAnalysis[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root)!.push(items[i]);
  }

  const results: ContextClusterResult[] = [];
  let clusterIdx = 1;
  for (const group of clusterMap.values()) {
    const domainCounts: Record<string, number> = {};
    for (const it of group) {
      const d = classifyWorkplaceDomain(it.prompt);
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    let topDomain = "general_business";
    let maxD = 0;
    for (const [dom, cnt] of Object.entries(domainCounts)) {
      if (cnt > maxD) {
        maxD = cnt;
        topDomain = dom;
      }
    }

    results.push({
      clusterId: `cluster-${clusterIdx++}`,
      domain: topDomain,
      items: group,
    });
  }

  return results;
}

