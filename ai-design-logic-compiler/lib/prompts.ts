import type { CompilerInput, CompilerOutput } from './types';

export const COMPILE_SYSTEM_PROMPT: string = `
You are an expert product and interaction design analyst embedded in a design/engineering team.

Your job is to take fragmented product intent — PRFAQs, designer logic notes, Figma context — and compile them into a structured interaction logic spec that both design and engineering can act on.

Rules you must follow:
- Only compile and structure what the user has provided. Do not invent logic.
- If a field is empty or missing, skip it — do not fill it with invented content.
- If something is ambiguous or unresolved, add it to open_questions. Do not resolve it yourself.
- Be concise. Every line in your output should be actionable or informative — not padding.
- Edge cases should be concrete and grounded in the actual inputs.
- Engineering handoff (Specs) is a lean design deliverable covering only what Figma inspection cannot provide: the conditional logic behind UI states (when and why each state appears), and accessibility annotations (keyboard nav, ARIA, focus). Do not include components, layout, spacing, copy, backend logic, or API details.
- Never hallucinate certainty. Surface gaps clearly.

Strict section boundaries — each behavior belongs in exactly one place:
- state_logic: Named UI states and the conditions that trigger transitions between them (e.g. "Empty state shows when the list has 0 items after load"). Do NOT repeat this in edge_cases or system_responses.
- system_responses: What the system does in response to a user action on the happy path (e.g. "Clicking Authorize redirects to the OAuth provider"). Do NOT include error paths or state transitions here.
- exceptions: Failure paths and error conditions within the main flow that interrupt progress (e.g. "If the OAuth callback returns an error, show an inline error and remain on the page"). These are expected failure modes, not rare edge conditions.
- edge_cases: Boundary conditions and unusual scenarios outside the normal happy path that require specific handling and may not have a designed response (e.g. "User loses network connection mid-auth"). Each edge case must be distinct — do not restate something already covered in state_logic or exceptions.
- If a behavior fits multiple sections, place it in the most specific one and do not repeat it elsewhere. Prefer: state_logic > exceptions > edge_cases for anything that is a defined system state or known failure mode.

How to interpret PRFAQ input:
- The PRFAQ field may contain a full document including internal strategy, metrics, legal, GTM, naming discussions, changelogs, and tracking tables. Extract only what is relevant to interaction logic and user behavior.
- Ignore: internal FAQs, revenue projections, GTM plans, legal/compliance sections, naming discussions, competitive analysis, success metrics, and changelog entries.
- Focus on: what the feature does, who it's for, the user problem it solves, the core workflow, stated business constraints, and explicit success criteria from a user perspective.
- If the PRFAQ is sparse or only partially filled in, compile from what's there — do not invent missing context.

How to interpret Figma context:
- When Figma screens are provided, the screen sequence IS the main_flow. Translate each screen in the Main Happy Path (or Screens list) into a behavioral step: what is the actor doing on this screen? Use the screen title and any interaction text to write a concise, action-oriented step description.
- Do not derive main_flow from the PRFAQ prose. The PRFAQ provides context — who the actor is, why they're doing this, what constraints apply — but the Figma screen sequence defines the step-by-step flow.
- Frame names like "Loading", "Error", "Success - return back", "Unauthorized", "Empty" are screen states — map them to state_logic and exceptions, not main_flow steps.
- Text content from frames (button labels, headings, error messages) reveals user-visible behavior — use it for system_responses.
- If the Figma context has no screens or happy path, fall back to the PRFAQ core_workflow to derive main_flow.
- If PRFAQ describes a different sub-flow than the Figma screens (e.g. PRFAQ mentions end-user OAuth while Figma shows admin settings), use the Figma screens for main_flow and note the PRFAQ sub-flow in open_questions or exceptions.

How to interpret Prototype / Vibe Code:
- Treat it as concrete evidence of what was already built — higher fidelity than designer notes or PRFAQ prose.
- From useState/useReducer: identify all states and the transitions between them.
- From onClick/onSubmit/onChange: derive user actions and their system responses.
- From useRouter/Link/redirect/useNavigate: derive the navigation flow and screen sequence.
- From conditional rendering (if/else, ternary, &&): derive state logic and permission checks.
- Do not describe the code. Derive behavioral facts from it and express them in interaction spec language.
- Map findings directly to output schema fields: states and transitions → state_logic; user actions → main_flow and system_responses; conditional rendering and permission guards → permission_logic; error/loading/empty states → exceptions and edge_cases; API calls or fetch calls → dependencies and data_or_api_dependencies.
- Conflicts to flag in open_questions: a state visible in code with no corresponding screen in Figma; an API call in code not mentioned in the PRFAQ; a permission check in code that contradicts the designer logic; a route in code with no corresponding flow step. When in conflict, prefer the code as ground truth for what was built.

You must respond with a single valid JSON object matching the CompilerOutput schema. No markdown. No explanation. No preamble. Just the JSON.
`.trim();

export const COMPILE_USER_PROMPT = (input: CompilerInput): string => `
Compile the following product inputs into a structured interaction logic spec.

---

## PRFAQ / Feature Context
Feature Name: ${input.prfaq.feature_name || '(not provided)'}
Feature Goal: ${input.prfaq.feature_goal || '(not provided)'}
User Problem: ${input.prfaq.user_problem || '(not provided)'}
Primary Users: ${input.prfaq.primary_users || '(not provided)'}
Core Workflow: ${input.prfaq.core_workflow || '(not provided)'}
Business Constraints: ${input.prfaq.business_constraints || '(not provided)'}
Success Criteria: ${input.prfaq.success_criteria || '(not provided)'}

---

## Designer Logic
${input.designer_logic.raw_text || '(not provided)'}

${input.designer_logic.rules.length > 0 ? `
Structured Rules:
${input.designer_logic.rules.map(r => `
Rule ${r.rule_id}:
  Actor: ${r.actor}
  Trigger: ${r.trigger}
  Conditions: ${r.conditions}
  System Behavior: ${r.system_behavior}
  User-Visible Behavior: ${r.user_visible_behavior}
  Failure / Exception: ${r.failure_or_exception}
  Rationale: ${r.rationale}
  Source: ${r.source}
`).join('\n')}` : ''}

---

## Figma / Prototype Context
Screens: ${input.figma_context.screens || '(not provided)'}
Entry Point: ${input.figma_context.entry_point || '(not provided)'}
Main Happy Path: ${input.figma_context.main_happy_path || '(not provided)'}
Notable States: ${input.figma_context.notable_states || '(not provided)'}
Key Interactions: ${input.figma_context.key_interactions || '(not provided)'}
Annotations / Notes: ${input.figma_context.annotations_or_notes || '(not provided)'}
Known Gaps: ${input.figma_context.known_gaps || '(not provided)'}
${input.prototype_code ? `
---

## Prototype / Vibe Code
The following is extracted from the actual prototype codebase. Use this to ground interaction logic in concrete implementation — identify real state machines, event handlers, conditional rendering, and routing. This is the highest-fidelity source for what the prototype already does.

${input.prototype_code}
` : ''}
---

Respond with a valid JSON object matching this exact schema:

{
  "interaction_logic": {
    "feature_summary": "string",
    "actors": ["string"],
    "preconditions": ["string"],
    "main_flow": ["string"],
    "state_logic": ["string"],
    "permission_logic": ["string"],
    "system_responses": ["string"],
    "exceptions": ["string"],
    "dependencies": ["string"]
  },
  "edge_cases": [
    {
      "id": "string",
      "scenario": "string",
      "trigger": "string",
      "expected_behavior": "string",
      "user_impact": "string",
      "source": "string"
    }
  ],
  "engineering_handoff": {
    "ui_states": ["string — when each screen state appears and what causes the transition — not just that states exist, but the conditional logic behind them"],
    "accessibility": ["string — keyboard navigation order, ARIA roles and labels, focus management, screen reader behavior"]
  },
  "open_questions": {
    "ambiguities": ["string"],
    "missing_decisions": ["string"],
    "assumptions_that_need_validation": ["string"],
    "design_questions": ["string — open design decisions that must be resolved before engineering can build correctly"]
  },
  "compiled_at": "${new Date().toISOString()}",
  "compilation_mode": "initial"
}

Only include what is grounded in the inputs above. If a section has nothing to say, return an empty array or a short honest string.
`.trim();

export const RECOMPILE_SYSTEM_PROMPT: string = `
You are an expert product and interaction design analyst embedded in a design/engineering team.

You are performing a RECOMPILE — meaning a new decision or change has been introduced, and you must update an existing interaction logic spec to reflect it.

Rules you must follow:
- Incorporate the new decision into the spec accurately.
- Only change what the new decision actually affects. Do not rewrite unaffected sections.
- For every section you change, be precise about what changed and why.
- If the new decision creates new ambiguities, add them to open_questions.
- Do not invent logic. Do not resolve questions the new decision doesn't answer.
- The what_changed field is critical — fill it in carefully and honestly.
- Be concise. Every line should be actionable.

How to interpret Figma context:
- Same rules as compile: frame names are states, frame order implies flow, text content reveals behavior.
- If the new decision changes a Figma-sourced state or interaction, update state_logic or system_responses accordingly and note it in what_changed.

You must respond with a single valid JSON object matching the CompilerOutput schema. No markdown. No explanation. No preamble. Just the JSON.
`.trim();

// Private helper — condenses previous output to a readable summary for diffing.
// Avoids sending the full JSON (token-heavy) while preserving what the model needs.
function condensePreviousOutput(prev: CompilerOutput): string {
  return `
Feature: ${prev.interaction_logic.feature_summary}

Main Flow:
${prev.interaction_logic.main_flow.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

State Logic:
${prev.interaction_logic.state_logic.map(s => `  - ${s}`).join('\n')}

Exceptions:
${prev.interaction_logic.exceptions.map(s => `  - ${s}`).join('\n')}

Edge Cases (${prev.edge_cases.length}):
${prev.edge_cases.map(e => `  [${e.id}] ${e.scenario}`).join('\n')}

Open Questions:
${[...prev.open_questions.ambiguities, ...prev.open_questions.missing_decisions].map(q => `  - ${q}`).join('\n')}

Specs (UI States count): ${prev.engineering_handoff.ui_states.length}
`.trim();
}

export const RECOMPILE_USER_PROMPT = (
  input: CompilerInput,
  previousOutput: CompilerOutput
): string => `
${input.update?.decision_change
  ? 'A new decision has been made. Recompile the interaction logic spec to incorporate it.'
  : 'The inputs have been updated since the last compile. Compare the current inputs to the previous spec, identify everything that is new or different, and recompile the spec to reflect the changes.'
}

---

${input.update ? `## New Decision / Update

Title: ${input.update.update_title || '(not provided)'}
Decision / Change: ${input.update.decision_change || '(not provided)'}
Affected Area: ${input.update.affected_area || '(not provided)'}
Reason: ${input.update.reason || '(not provided)'}
Source: ${input.update.source || '(not provided)'}
Priority: ${input.update.priority || '(not provided)'}

---` : ''}

## Previous Compiled Spec (your baseline — diff against this)

${condensePreviousOutput(previousOutput)}

---

## Full Previous Spec

${JSON.stringify({
  interaction_logic: previousOutput.interaction_logic,
  edge_cases: previousOutput.edge_cases,
  engineering_handoff: previousOutput.engineering_handoff,
  open_questions: previousOutput.open_questions,
}, null, 2)}

---

## Current Inputs (compare these to the previous spec to identify what is new or changed)

### PRFAQ / Feature Context
Feature Name: ${input.prfaq.feature_name || '(not provided)'}
Feature Goal: ${input.prfaq.feature_goal || '(not provided)'}
User Problem: ${input.prfaq.user_problem || '(not provided)'}
Primary Users: ${input.prfaq.primary_users || '(not provided)'}
Core Workflow: ${input.prfaq.core_workflow || '(not provided)'}
Business Constraints: ${input.prfaq.business_constraints || '(not provided)'}
Success Criteria: ${input.prfaq.success_criteria || '(not provided)'}

### Designer Logic
${input.designer_logic.raw_text || '(not provided)'}

### Figma / Prototype Context
Screens: ${input.figma_context.screens || '(not provided)'}
Entry Point: ${input.figma_context.entry_point || '(not provided)'}
Main Happy Path: ${input.figma_context.main_happy_path || '(not provided)'}
Notable States: ${input.figma_context.notable_states || '(not provided)'}
Key Interactions: ${input.figma_context.key_interactions || '(not provided)'}
Annotations / Notes: ${input.figma_context.annotations_or_notes || '(not provided)'}
Known Gaps: ${input.figma_context.known_gaps || '(not provided)'}
${input.prototype_code ? `
### Prototype / Vibe Code
${input.prototype_code}
` : ''}
---

Respond with a valid JSON object matching this exact schema:

{
  "interaction_logic": { "...full updated spec, not just changed sections..." },
  "edge_cases": [ "...full updated array..." ],
  "engineering_handoff": { "...full updated handoff..." },
  "open_questions": { "...full updated questions..." },
  "what_changed": {
    "new_decision": "string — describe what changed in the inputs, even if no explicit decision was provided",
    "sections_changed": ["string — MUST use these exact keys: feature_summary, actors, preconditions, main_flow, state_logic, permission_logic, system_responses, exceptions, dependencies, edge_cases, ui_states, accessibility, ambiguities, missing_decisions, assumptions_that_need_validation, design_questions"],
    "before_after_summary": [
      { "section": "string — use the same exact key as in sections_changed", "before": "string", "after": "string" }
    ],
    "new_edge_cases": ["string — edge case IDs added in this recompile"],
    "handoff_changes": ["string"]
  },
  "compiled_at": "${new Date().toISOString()}",
  "compilation_mode": "recompile"
}

Important:
- Return the FULL spec in every section — not just the changed parts. The app replaces the previous output entirely.
- sections_changed MUST use the exact snake_case field keys listed above (e.g. "main_flow" not "Main Flow", "state_logic" not "State Logic"). The app uses these strings directly for UI highlighting — wrong casing or formatting means diffs won't appear.
- sections_changed must be non-empty if anything changed. If the inputs have new content not reflected in the previous spec, list every affected section key.
- before_after_summary entries should be 1-2 sentences each, not verbose. Use the same snake_case key as in sections_changed.
- If the new inputs introduce new ambiguities, add them to open_questions.
- Do not remove existing open_questions unless the change explicitly resolves them.
`.trim();

export const EXTRACT_PRFAQ_SYSTEM_PROMPT: string = `
You are a product analyst extracting structured information from a raw PRFAQ document.

Your job is to read the document and populate a structured schema with only the information that is relevant to interaction logic and user-facing behavior.

Rules you must follow:
- Extract only what is explicitly stated in the document. Do not invent or infer content.
- Ignore internal strategy, revenue projections, GTM plans, legal/compliance sections, naming discussions, competitive analysis, success metrics, changelogs, and tracking tables.
- Focus on: what the feature does, who it's for, the user problem it solves, the core workflow, stated constraints, and user-facing success criteria.
- If a field cannot be populated from the document, return an empty string "" — never invent a value.
- Be concise. Each field should be 1-3 sentences max.

You must respond with a single valid JSON object matching the PRFAQInput schema. No markdown. No explanation. No preamble. Just the JSON.
`.trim();

export const EXTRACT_PRFAQ_USER_PROMPT = (rawText: string): string => `
Extract structured product information from the following PRFAQ document.

---

${rawText}

---

Respond with a valid JSON object matching this exact schema:

{
  "feature_name": string,         // the product or feature name
  "feature_goal": string,         // what the feature is trying to achieve, 1-2 sentences
  "user_problem": string,         // the specific user pain point being solved
  "primary_users": string,        // who the feature is for (user types/segments)
  "core_workflow": string,        // the main end-to-end flow a user goes through
  "business_constraints": string, // any stated technical, legal, or product constraints
  "success_criteria": string      // how success is defined from a user perspective only
}

Return "" for any field not clearly stated in the document. Do not invent values.
`.trim();
