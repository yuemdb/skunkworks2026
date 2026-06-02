// ─── Input Schemas ────────────────────────────────────────────────────────────

export interface PRFAQInput {
  feature_name: string;
  feature_goal: string;
  user_problem: string;
  primary_users: string;
  core_workflow: string;
  business_constraints: string;
  success_criteria: string;
}

export interface DesignerRule {
  rule_id: string;
  actor: string;
  trigger: string;
  conditions: string;
  system_behavior: string;
  user_visible_behavior: string;
  failure_or_exception: string;
  rationale: string;
  source: string;
}

export interface DesignerLogicInput {
  rules: DesignerRule[];
  raw_text: string;
}

export interface FigmaContextInput {
  screens: string;
  entry_point: string;
  main_happy_path: string;
  notable_states: string;
  key_interactions: string;
  annotations_or_notes: string;
  known_gaps: string;
}

export interface UpdateInput {
  update_title: string;
  decision_change: string;
  affected_area: string;
  reason: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CompilerInput {
  prfaq: PRFAQInput;
  designer_logic: DesignerLogicInput;
  figma_context: FigmaContextInput;
  prototype_code?: string;
  update?: UpdateInput;
  compilation_mode: 'initial' | 'recompile';
}

// ─── Output Schemas ───────────────────────────────────────────────────────────

export interface InteractionLogicSpec {
  feature_summary: string;
  actors: string[];
  preconditions: string[];
  main_flow: string[];
  state_logic: string[];
  permission_logic: string[];
  system_responses: string[];
  exceptions: string[];
  dependencies: string[];
}

export interface EdgeCaseItem {
  id: string;
  scenario: string;
  trigger: string;
  expected_behavior: string;
  user_impact: string;
  source: string;
}

export interface EngineeringHandoff {
  ui_states: string[];
  accessibility: string[];
}

export interface OpenQuestions {
  ambiguities: string[];
  missing_decisions: string[];
  assumptions_that_need_validation: string[];
  design_questions: string[];
}

export interface WhatChanged {
  new_decision: string;
  sections_changed: string[];
  before_after_summary: { section: string; before: string; after: string }[];
  new_edge_cases: string[];
  handoff_changes: string[];
}

export interface CompilerOutput {
  interaction_logic: InteractionLogicSpec;
  edge_cases: EdgeCaseItem[];
  engineering_handoff: EngineeringHandoff;
  open_questions: OpenQuestions;
  what_changed?: WhatChanged;
  compiled_at: string;
  compilation_mode: 'initial' | 'recompile';
}

// ─── Empty state helpers ──────────────────────────────────────────────────────

export const emptyPRFAQ: PRFAQInput = {
  feature_name: '',
  feature_goal: '',
  user_problem: '',
  primary_users: '',
  core_workflow: '',
  business_constraints: '',
  success_criteria: '',
};

export const emptyFigmaContext: FigmaContextInput = {
  screens: '',
  entry_point: '',
  main_happy_path: '',
  notable_states: '',
  key_interactions: '',
  annotations_or_notes: '',
  known_gaps: '',
};

export const emptyUpdate: UpdateInput = {
  update_title: '',
  decision_change: '',
  affected_area: '',
  reason: '',
  source: '',
  priority: 'medium',
};

export const emptyInput: CompilerInput = {
  prfaq: emptyPRFAQ,
  designer_logic: { rules: [], raw_text: '' },
  figma_context: emptyFigmaContext,
  prototype_code: undefined,
  update: emptyUpdate,
  compilation_mode: 'initial',
};
