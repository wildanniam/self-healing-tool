export type Action = 'click' | 'fill';
export type Mode = 'ranker-only' | 'full';
export type SemanticOutcome = 'unassessed' | 'correct' | 'incorrect';
export interface Task { description: string; scope?: string }
export type SpecEvidenceSource = 'label' | 'text' | 'nearestLabel' | 'placeholder' | 'ariaLabel' | 'name' | 'title' | 'role' | 'tag' | 'type' | 'id' | 'dataTestId' | 'dataTest' | 'dataCy' | 'classes' | 'rowContext' | 'parentContext' | 'containerContext' | 'container' | 'href' | 'formAction';
export interface TargetContract {
  schemaVersion: 1; requirementId: string; revision: string; intent: string; action: Action;
  status: 'active' | 'retired' | 'unknown';
  allOf: { sources: SpecEvidenceSource[]; anyOf: string[] }[];
  provenance?: { fileName: string; sha256: string };
}
export interface TargetSpecOptions { mode: 'context' | 'enforce'; contract: TargetContract | null; expectedRevision: string }
export interface SpecContext {
  contract: TargetContract | null; expectedRevision: string;
  applicability: 'applicable' | 'retired' | 'unknown' | 'missing' | 'revision-mismatch' | 'action-mismatch' | 'sanitized';
  policy: 'all-clauses-positive-token-phrase-v1';
}
export interface SpecDecision {
  outcome: 'accepted' | 'refused' | 'unknown'; reason: string;
  clauses: { index: number; matched: boolean; source: SpecEvidenceSource | null }[];
  observed?: Partial<Record<SpecEvidenceSource, string | string[]>>;
}
export interface SpecEvent {
  mode: TargetSpecOptions['mode']; requirementId: string | null; revision: string | null;
  expectedRevision: string; provenance?: TargetContract['provenance']; applicability: SpecContext['applicability'];
  decision: SpecDecision | null;
}
export interface Config {
  mode: Mode; model: 'gpt-4o-mini' | 'gpt-4o-mini-2024-07-18';
  maxTokens: number; temperature: number; maxAttempts: number;
  actionTimeoutMs: number; recoveryTimeoutMs: number; providerTimeoutMs: number;
  domMaxChars: number; payloadMaxChars: number; maxCandidates: number;
}
export interface CandidateFeatures {
  id?: string; name?: string; placeholder?: string; role?: string; ariaLabel?: string;
  dataTestId?: string; dataTest?: string; dataCy?: string; title?: string; classes?: string[];
  text?: string; nearestLabel?: string; rowContext?: string; parentContext?: string; containerContext?: string;
  localActionContext?: string; ownerContext?: string; ownerStatus?: 'identified' | 'missing' | 'ambiguous'; ownerSources?: string[];
  visible?: boolean; disabled?: boolean;
  href?: string; formAction?: string;
}
export interface ValidationFeedback { selector: string; count: number; reason: string }
export interface Candidate {
  selector: string; tag: string; type: string; label: string;
  container: string; containerKind: string; order: number; score: number;
  features?: CandidateFeatures; suggestedLocators?: string[]; duplicateCount?: number;
}
export interface Context {
  action: Action; task: Task; candidates: Candidate[];
  method?: string; failure?: { originalSelector: string; classification: string }; cleanedDom?: string; feedback?: ValidationFeedback[];
  targetSpec?: SpecContext;
  coverage: { scanned?: number; ineligible?: number; locatorCheckedCandidates?: number; unaddressable?: number; beforeBudget?: number; budgetOmitted?: number; discovered: number; included: number; omitted: number; textTruncated: boolean; domChars: number; payloadChars: number; domLimit: number; payloadLimit: number; candidateLimit: number };
}
export interface Usage { inputTokens: number; outputTokens: number }
export interface ProviderMetadata { returnedModel: string | null; finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call' | null }
export interface ProviderResponse { output: string; usage: Usage | null; transportAttempted?: boolean; metadata?: ProviderMetadata | null }
export interface Provider {
  readonly kind: 'offline' | 'openai';
  readonly configuration?: Readonly<Config>;
  select(context: Readonly<Context>, signal: AbortSignal): Promise<ProviderResponse>;
}
export type FailureKind = 'none' | 'original' | 'context' | 'provider' | 'parse' | 'validation' | 'action' | 'budget' | 'abstained' | 'spec';
export interface Attempt {
  id: string; number: number; selector: string | null;
  candidateAccepted: boolean; actionExecuted: boolean;
  failure: FailureKind; reason: string; usage: Usage | null;
  providerMetadata?: ProviderMetadata | null;
  specDecision?: SpecDecision;
  proposedSelector?: string | null; validations?: ValidationFeedback[]; inputSha256?: string; inputCoverage?: Context['coverage'];
  inputContext?: Context;
  observationRefresh?: {
    policy: 'null-refresh-once-v1'; outcome: 'changed' | 'unchanged' | 'failed' | 'time-limit';
    previousSha256: string; refreshedSha256?: string; context?: Context; durationMs: number;
  };
  providerCalled: boolean; transportAttempted: boolean | null; durationMs: number; providerMs: number; actionMs: number;
}
export interface Assessment {
  eventId: string; attemptId?: string; semantic: SemanticOutcome;
  wrongEffect: boolean; targetInCandidates?: boolean; evidenceRef?: string;
}
export interface Event {
  id: string; action: Action; originalSelector: string; task: Task;
  originalFailure: { name: string; classification: string } | null;
  recoveryTriggered: boolean; actionExecuted: boolean;
  stopReason: 'original-success' | 'nonrecoverable' | 'recovered' | 'attempt-limit' | 'time-limit' | 'abstained' | 'context-failure' | 'provider-failure' | 'spec-refused' | 'spec-unknown';
  failure: FailureKind; originalMs: number; internalMs: number; retryMs: number; totalMs: number;
  context: Context | null; attempts: Attempt[]; semantic: SemanticOutcome;
  targetSpec?: SpecEvent;
}
export interface Run {
  schemaVersion: 1; id: string; repeatOf: string | null; createdAt: string;
  config: Readonly<Config>; provider: 'none' | 'offline' | 'openai';
  events: Event[]; assessments: Assessment[];
}
