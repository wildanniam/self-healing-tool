import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTraceability } from './check-traceability.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'spec-audit-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ['README.md', 'DEVELOPMENT.md', 'AGENTS.md', 'DESIGN.md', '.env.example', 'docs', 'openspec', '.github', 'src', 'tests', 'examples', 'scripts', 'package.json', 'tsconfig.json', 'playwright.config.ts']) cpSync(join(source, path), join(root, path), { recursive: true });
  return root;
}
function editRegister(root, mutate) {
  const path = join(root, 'docs/traceability.json');
  const register = JSON.parse(readFileSync(path, 'utf8'));
  mutate(register);
  writeFileSync(path, JSON.stringify(register));
}

test('the checked-in traceability register is internally consistent', () => {
  assert.deepEqual(checkTraceability(source).errors, []);
});

test('an omitted requirement cannot disappear from the audit', (t) => {
  const root = fixture(t);
  editRegister(root, (data) => data.requirements.splice(data.requirements.findIndex((r) => r.id === 'HEAL-001'), 1));
  assert.match(checkTraceability(root).errors.join('\n'), /unregistered requirement HEAL-001/);
});

test('missing scenario coverage and unknown decisions fail', (t) => {
  const root = fixture(t);
  editRegister(root, (data) => { data.requirements[0].scenarios.pop(); data.requirements[0].decisions = ['D999']; });
  const errors = checkTraceability(root).errors.join('\n');
  assert.match(errors, /scenario coverage differs/);
  assert.match(errors, /unknown decision D999/);
});

test('verified status requires passing evidence, not a status edit', (t) => {
  const root = fixture(t);
  editRegister(root, (data) => { const r = data.requirements.find((r) => r.id === 'HEAL-001'); r.status = 'verified'; r.evidence = []; });
  assert.match(checkTraceability(root).errors.join('\n'), /verified without passing evidence/);
});

test('a checked task requires its own completion evidence record', (t) => {
  const root = fixture(t);
  const file = join(root, 'openspec/changes/build-self-healing-tool/tasks.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('- [ ] 1.1', '- [x] 1.1'));
  editRegister(root, data => { data.completedTasks = data.completedTasks.filter(t => t.task !== '1.1'); });
  assert.match(checkTraceability(root).errors.join('\n'), /Checked task 1.1 has no completion record/);
});

test('broken local links fail', (t) => {
  const root = fixture(t);
  const file = join(root, 'README.md');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n[Missing](docs/no-such-file.md)\n');
  assert.match(checkTraceability(root).errors.join('\n'), /broken relative link docs\/no-such-file.md/);
});

test('a real-shaped evidence record can support a completed task', (t) => {
  const root = fixture(t);
  const path = join(root, 'openspec/changes/build-self-healing-tool/tasks.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('- [ ] 1.1', '- [x] 1.1'));
  editRegister(root, (data) => {
    const req = data.requirements.find((r) => r.id === 'INT-005');
    req.status = 'verified';
    req.evidence = [{ id: 'EV-TEST-ONLY', kind: 'verification', ref: 'docs/verification-plan.md', summary: 'Synthetic checker fixture; never a project evidence record', scenarios: req.scenarios, command: 'fixture', environment: 'test', date: '2026-09-07', result: 'pass' }];
    data.completedTasks = [...data.completedTasks.filter(t => t.task !== '1.1'), { task: '1.1', evidence: ['EV-TEST-ONLY'] }];
  });
  assert.deepEqual(checkTraceability(root).errors, []);
});
