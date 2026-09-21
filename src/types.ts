export type Action = 'click' | 'fill';
export type Mode = 'ranker-only' | 'full';
export type SemanticOutcome = 'unassessed' | 'correct' | 'incorrect';
export interface Task { description: string; scope?: string }
export interface Config {
  mode: Mode; model: 'gpt-4o-mini' | 'gpt-4o-mini-2024-07-18';
  maxTokens: number; temperature: number; maxAttempts: number;
  actionTimeoutMs: number; recoveryTimeoutMs: number; providerTimeoutMs: number;
  domMaxChars: number; payloadMaxChars: number; maxCandidates: number;
}
export interface Candidate {
  selector: string; tag: string; type: string; label: string;
  container: string; containerKind: string; order: number; score: number;
}
export interface Context {
  action: Action; task: Task; candidates: Candidate[];
  coverage: { discovered: number; included: number; omitted: number; textTruncated: boolean; domChars: number; payloadChars: number; domLimit: number; payloadLimit: number; candidateLimit: number };
}
export interface Usage { inputTokens: number; outputTokens: number }
export interface ProviderResponse { output: string; usage: Usage | null; transportAttempted?: boolean }
export interface Provider {
  readonly kind: 'offline' | 'openai';
  readonly configuration?: Readonly<Config>;
  select(context: Readonly<Context>, signal: AbortSignal): Promise<ProviderResponse>;
}
export type FailureKind = 'none' | 'original' | 'context' | 'provider' | 'parse' | 'validation' | 'action' | 'budget' | 'abstained';
export interface Attempt {
  id: string; number: number; selector: string | null;
  candidateAccepted: boolean; actionExecuted: boolean;
  failure: FailureKind; reason: string; usage: Usage | null;
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
  stopReason: 'original-success' | 'nonrecoverable' | 'recovered' | 'attempt-limit' | 'time-limit' | 'abstained' | 'context-failure' | 'provider-failure';
  failure: FailureKind; originalMs: number; internalMs: number; retryMs: number; totalMs: number;
  context: Context | null; attempts: Attempt[]; semantic: SemanticOutcome;
}
export interface Run {
  schemaVersion: 1; id: string; repeatOf: string | null; createdAt: string;
  config: Readonly<Config>; provider: 'none' | 'offline' | 'openai';
  events: Event[]; assessments: Assessment[];
}
