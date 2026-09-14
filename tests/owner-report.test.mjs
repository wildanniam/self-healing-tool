import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportView } from '../dist/report.js';
import { projectCandidates } from '../dist/provider.js';
import { validateConfig } from '../dist/config.js';

test('normal report omits exact attempt/refresh contexts while preserving refresh accounting', () => {
  const context = { candidates: [{ label: 'LOCAL_DIAGNOSTIC_TEXT' }], cleanedDom: 'LOCAL_DIAGNOSTIC_DOM' };
  const view = reportView({ schemaVersion: 1, id: 'test', createdAt: '', repeatOf: null,
    config: validateConfig({}), provider: 'offline', assessments: [], events: [{
      id: 'event', action: 'click', originalSelector: '#old', task: { description: 'Open item' },
      recoveryTriggered: true, originalFailure: null, actionExecuted: false, stopReason: 'abstained', semantic: 'unassessed', failure: 'abstained',
      originalMs: 1, internalMs: 2, retryMs: 3, totalMs: 6, context, attempts: [{
        id: 'attempt', number: 1, selector: null, candidateAccepted: false, actionExecuted: false, failure: 'abstained', reason: 'unchanged',
        providerCalled: true, transportAttempted: false, usage: null, durationMs: 3, providerMs: 1, actionMs: 0,
        inputContext: context, observationRefresh: { policy: 'null-refresh-once-v1', outcome: 'unchanged', durationMs: 2,
          previousSha256: 'a'.repeat(64), refreshedSha256: 'a'.repeat(64), context },
      }],
    }] });
  assert.ok(!JSON.stringify(view).includes('LOCAL_DIAGNOSTIC'));
  const attempt = view.events[0].attempts[0];
  assert.ok(!('inputContext' in attempt)); assert.ok(!('context' in attempt.observationRefresh));
  assert.equal(attempt.observationRefresh.durationMs, 2);
  assert.equal(attempt.observationRefresh.outcome, 'unchanged');
});

test('wire projection preserves distinct bounded owner and local-action evidence', () => {
  const features = { localActionContext: 'Operations', ownerContext: 'Entity one', ownerStatus: 'identified', ownerSources: ['heading:h2', 'heading:h2'] };
  const projected = projectCandidates([{ selector: '#a', tag: 'button', label: 'Open', type: '', container: 'Entity one', containerKind: 'article', order: 0, score: 10, features }]);
  assert.deepEqual(projected[0].features, { ...features, ownerSources: ['heading:h2'] });
});
