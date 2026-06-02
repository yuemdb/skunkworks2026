// Heuristic packs schema

export interface HeuristicRule {
  rule_id: string;
  title: string;
  nng_heuristic: string;
  nng_principle?: string;
  severity_default: Severity;
  check_prompt: string;
  leafygreen_component?: string;
  leafygreen_url?: string;
}

export interface HeuristicPack {
  pack_id: string;
  pack_name: string;
  description: string;
  source?: string;
  priority_rules?: string[];
  rules: HeuristicRule[];
}

export interface HeuristicPacksData {
  schema_version: string;
  schema_description?: string;
  packs: HeuristicPack[];
}

// Review API contract

export type Severity = 'Critical' | 'Warning' | 'Suggestion' | 'Accessibility';

/**
 * All context (URLs, feature intent, pack selection, custom rules) is pre-formatted
 * into userMessage as a single string by the client. Images are passed separately as
 * base64 because the model API requires them as distinct content blocks.
 *
 * figmaUrl: when present, the server fetches the Figma node screenshot + structure
 * and injects them into the LLM request before the userMessage.
 */
export interface ReviewRequestBody {
  userMessage: string;
  images: Array<{
    media_type: string;
    data: string;
  }>;
  /** Optional Figma design/proto URL. Server fetches actual design context if set. */
  figmaUrl?: string;
}

export interface Finding {
  severity: Severity;
  title: string;
  why: string;
  recommendation: string;
  evidence: string;
}

export interface ReviewSummary {
  assessment: string;
  risk_themes: string[];
  packs_applied: string[];
  confidence: 'High' | 'Medium' | 'Low';
  confidence_reason: string;
}

export interface ReviewResponse {
  summary: ReviewSummary;
  findings: Finding[];
  open_questions: string[];
}

// UI state

export type ReviewState =
  | { status: 'idle' }
  | { status: 'loading'; step: string }
  | { status: 'results'; data: ReviewResponse }
  | { status: 'error'; message: string };
