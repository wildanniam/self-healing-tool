import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { basename } from 'node:path';
import { ConfigurationError } from './config.js';
import { cleanContextText } from './privacy.js';
import type { Action, SpecContext, SpecDecision, SpecEvidenceSource, TargetContract, TargetSpecOptions } from './types.js';

export const SPEC_EVIDENCE_SOURCES: readonly SpecEvidenceSource[] = Object.freeze(['label', 'text', 'nearestLabel', 'placeholder', 'ariaLabel', 'name', 'title', 'role', 'tag', 'type', 'id', 'dataTestId', 'dataTest', 'dataCy', 'classes', 'rowContext', 'parentContext', 'containerContext', 'container', 'href', 'formAction']);
const MAX_CONTRACT_CHARS = 16000;
const MAX_FILE_BYTES = 65536;
const fail = () => { throw new ConfigurationError('target spec contract'); };
const tokens = (s: string) => s.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(k => typeof k !== 'string' || !keys.includes(k)) || Object.values(descriptors).some(d => !('value' in d))) return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]|```|=>|javascript:|\b(?:eval|Function)\s*\(|\bfunction\s*\(/i.test(value)) return fail();
  return value.trim();
}
function identifier(value: unknown): string {
  const s = text(value, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/@+\-]*$/.test(s)) return fail();
  return s;
}
function array(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max || Reflect.ownKeys(value).length !== value.length + 1 || Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !('value' in d))) return fail();
  return value;
}
/** Strict data-only projection. Unknown keys, accessors and executable values are rejected. */
export function validateTargetContract(input: unknown): TargetContract {
  const c = record(input, ['schemaVersion', 'requirementId', 'revision', 'intent', 'action', 'status', 'allOf', 'provenance']);
  if (c.schemaVersion !== 1 || !['click', 'fill'].includes(c.action as string) || !['active', 'retired', 'unknown'].includes(c.status as string)) return fail();
  const result: TargetContract = {
    schemaVersion: 1, requirementId: identifier(c.requirementId), revision: identifier(c.revision), intent: text(c.intent, 1000),
    action: c.action as Action, status: c.status as TargetContract['status'],
    allOf: array(c.allOf, c.status === 'active' ? 1 : 0, 12).map(value => {
      const clause = record(value, ['sources', 'anyOf']);
      const sources = array(clause.sources, 1, 8).map(value => {
        if (!SPEC_EVIDENCE_SOURCES.includes(value as SpecEvidenceSource)) return fail();
        return value as SpecEvidenceSource;
      });
      if (new Set(sources).size !== sources.length) return fail();
      return { sources, anyOf: array(clause.anyOf, 1, 8).map(value => { const phrase = text(value, 160); if (!tokens(phrase).length) return fail(); return phrase; }) };
    }),
  };
  if (c.provenance !== undefined) {
    const p = record(c.provenance, ['fileName', 'sha256']);
    const fileName = text(p.fileName, 160);
    if (fileName !== basename(fileName) || /[\\/]/.test(fileName) || typeof p.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.sha256)) return fail();
    result.provenance = { fileName, sha256: p.sha256 };
  }
  if (JSON.stringify(result).length > MAX_CONTRACT_CHARS) return fail();
  return result;
}
export function validateTargetSpecOptions(input: unknown): TargetSpecOptions {
  const v = record(input, ['mode', 'contract', 'expectedRevision']);
  if (!['context', 'enforce'].includes(v.mode as string)) return fail();
  return { mode: v.mode as TargetSpecOptions['mode'], expectedRevision: identifier(v.expectedRevision), contract: v.contract === null ? null : validateTargetContract(v.contract) };
}
/** Reads only this explicit file; never crawls a repository or executes Markdown. */
export async function loadTargetSpec(path: string): Promise<TargetContract> {
  if (typeof path !== 'string' || !path || path.length > 4096) return fail();
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_FILE_BYTES) return fail();
    const bytes = Buffer.alloc(MAX_FILE_BYTES + 1);
    let bytesRead = 0;
    while(bytesRead<bytes.length){
      const part=await file.read(bytes,bytesRead,bytes.length-bytesRead,bytesRead);
      if(!part.bytesRead)break;
      bytesRead+=part.bytesRead;
    }
    if (bytesRead > MAX_FILE_BYTES) return fail();
    const data = bytes.subarray(0, bytesRead), markdown = data.toString('utf8');
    const fences = [...markdown.matchAll(/^```self-healing-contract[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)];
    if (fences.length !== 1 || (markdown.match(/^```self-healing-contract\b/gm) ?? []).length !== 1) return fail();
    let parsed: unknown;
    try { parsed = JSON.parse(fences[0]![1]!); } catch { return fail(); }
    const contract = validateTargetContract(parsed);
    if (contract.provenance) return fail(); // File provenance must come from the loader.
    return validateTargetContract({ ...contract, provenance: { fileName: basename(path), sha256: createHash('sha256').update(data).digest('hex') } });
  } finally { await file.close(); }
}
/** Identical payload for context-only and enforce. Sanitized text never becomes matching evidence. */
export function buildSpecContext(options: TargetSpecOptions, action: Action, omitted: readonly string[]): SpecContext {
  let changed = false;
  const clean = (value: string) => { const result = cleanContextText(value, omitted); if (result !== value || /\[redacted/.test(result)) changed = true; return result; };
  const raw = options.contract;
  const expectedRevision = clean(options.expectedRevision);
  const contract: TargetContract | null = raw ? { ...raw,
    requirementId: clean(raw.requirementId), revision: clean(raw.revision), intent: clean(raw.intent),
    allOf: raw.allOf.map(c => ({ sources: [...c.sources], anyOf: c.anyOf.map(clean) })),
    ...(raw.provenance ? { provenance: { fileName: clean(raw.provenance.fileName), sha256: raw.provenance.sha256 } } : {}),
  } : null;
  const applicability: SpecContext['applicability'] = changed ? 'sanitized' : !raw ? 'missing' : raw.revision !== options.expectedRevision ? 'revision-mismatch' : raw.action !== action ? 'action-mismatch' : raw.status === 'active' ? 'applicable' : raw.status;
  return { contract, expectedRevision, applicability, policy: 'all-clauses-positive-token-phrase-v1' };
}
export type SpecEvidence = Partial<Record<SpecEvidenceSource, string | string[]>>;
export function evaluateSpecAdmission(spec: SpecContext, evidence: SpecEvidence): SpecDecision {
  if (spec.applicability !== 'applicable') return { outcome: spec.applicability === 'retired' ? 'refused' : 'unknown', reason: `spec_${spec.applicability.replaceAll('-', '_')}`, clauses: [] };
  const contains = (value: string, phrase: string) => {
    if (!value || /\[redacted/.test(value) || !phrase || /\[redacted/.test(phrase)) return false;
    const observed = tokens(value), required = tokens(phrase);
    return required.length > 0 && observed.some((_, start) => required.every((t, offset) => observed[start + offset] === t));
  };
  const clauses = spec.contract!.allOf.map((clause, index) => {
    const source = clause.sources.find(source => {
      const values = evidence[source];
      return (Array.isArray(values) ? values : [values ?? '']).some(value => clause.anyOf.some(phrase => contains(value, phrase)));
    }) ?? null;
    return { index, matched: source !== null, source };
  });
  const accepted = clauses.length > 0 && clauses.every(c => c.matched);
  const observed = Object.fromEntries([...new Set(spec.contract!.allOf.flatMap(c => c.sources))].map(source => [source, evidence[source] ?? '']));
  return { outcome: accepted ? 'accepted' : 'unknown', reason: accepted ? 'spec_evidence_matched' : 'spec_insufficient_evidence', clauses, observed };
}
