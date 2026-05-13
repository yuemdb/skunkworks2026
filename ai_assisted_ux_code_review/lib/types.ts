// Heuristic packs schema

export interface HeuristicRule {
  rule_id: string;
  title: string;
  nng_heuristic: string;
  nng_principle?: string;
  severity_default: Severity;
  check_prompt: string;
  leafygreen_component: string;
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

export interface ReviewRequestBody {
  userMessage: string;
  images: Array<{
    media_type: string;
    data: string;
  }>;
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
