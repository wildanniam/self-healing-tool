import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(path, 'utf8');
const strings = (value) => Array.isArray(value) && value.every((x) => typeof x === 'string' && x.length > 0);
const unique = (values) => new Set(values).size === values.length;
const equalSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const walk = (path) => !existsSync(path) ? [] : statSync(path).isFile() ? [path]
  : readdirSync(path).sort().flatMap((name) => walk(join(path, name)));

export function checkTraceability(root) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const localRef = (ref) => {
    const path = resolve(root, ref.split('#')[0]);
    return !relative(root, path).split(sep).includes('..') && existsSync(path);
  };
  const register = JSON.parse(read(join(root, 'docs/traceability.json')));
  check(register.version === 1, 'Unsupported traceability version');
  check(typeof register.change === 'string' && /^[a-z0-9/-]+$/.test(register.change), 'Invalid change path');
  if (errors.length) return { errors };
  const changeRoot = join(root, 'openspec/changes', register.change);
  const taskText = read(join(changeRoot, 'tasks.md'));
  const tasks = new Map();
  for (const match of taskText.matchAll(/^- \[([ xX])\] (\d+\.\d+) (.+)$/gm)) {
    check(!tasks.has(match[2]), `Duplicate task ${match[2]}`);
    const ids = [...new Set(match[3].match(/\b[A-Z]+-\d{3}\b/g) ?? [])];
    check(ids.length > 0, `Task ${match[2]} has no requirement IDs`);
    tasks.set(match[2], { complete: match[1] !== ' ', ids });
  }
  check(tasks.size > 0, 'No parseable implementation tasks');
  const decisionFiles = walk(join(root, 'docs/decisions')).filter((x) => x.endsWith('.md'));
  const decisions = new Set(decisionFiles.flatMap((file) => [...read(file).matchAll(/^### (D\d+)\b/gm)].map((m) => m[1])));
  const requirements = new Map();
  const evidence = new Map();
  check(Array.isArray(register.requirements) && register.requirements.length > 0, 'Missing requirements');
  for (const requirement of register.requirements ?? []) {
    const r = requirement;
    check(typeof r.id === 'string' && /^[A-Z]+-\d{3}$/.test(r.id), `Invalid requirement ID ${r.id}`);
    check(!requirements.has(r.id), `Duplicate requirement ${r.id}`);
    requirements.set(r.id, r);
    check(typeof r.owner === 'string' && r.owner.length > 0, `${r.id}: missing owner`);
    check(typeof r.capability === 'string' && r.capability.length > 0, `${r.id}: missing capability`);
    check(['established', 'planned', 'implemented', 'verified'].includes(r.status), `${r.id}: invalid status`);
    check(r.status !== 'established' || r.capability === 'audit-workflow', `${r.id}: runtime cannot be established without evidence`);
    check(strings(r.decisions) && r.decisions.length > 0 && unique(r.decisions), `${r.id}: invalid decision links`);
    for (const d of r.decisions ?? []) check(decisions.has(d), `${r.id}: unknown decision ${d}`);
    check(strings(r.tasks) && r.tasks.length > 0 && unique(r.tasks), `${r.id}: missing/duplicate task links`);
    for (const task of r.tasks ?? []) check(tasks.get(task)?.ids.includes(r.id), `${r.id}: task ${task} does not link back`);
    check(strings(r.scenarios) && r.scenarios.length > 0 && unique(r.scenarios), `${r.id}: invalid scenario list`);
    check(r.verification?.id && r.verification?.method && r.verification?.acceptance, `${r.id}: missing planned verification`);
    check(typeof r.spec === 'string' && localRef(r.spec), `${r.id}: missing spec file`);
    if (typeof r.spec === 'string' && localRef(r.spec)) {
      const sections = read(join(root, r.spec)).split(/^### Requirement: /m).slice(1);
      const sectionsForId = sections.filter((text) => text.split(/\s/)[0] === r.id);
      check(sectionsForId.length === 1, `${r.id}: requirement absent or duplicated in spec`);
      const scenarios = [...(sectionsForId[0] ?? '').matchAll(/^#### Scenario: (\S+)/gm)].map((m) => m[1]);
      check(equalSet(scenarios, r.scenarios ?? []), `${r.id}: scenario coverage differs from spec`);
      check(scenarios.every((s) => s.startsWith(`${r.id}-S`)), `${r.id}: scenario ID ownership mismatch`);
    }
    check(Array.isArray(r.evidence), `${r.id}: missing evidence array`);
    for (const e of r.evidence ?? []) {
      check(typeof e.id === 'string' && e.id.startsWith('EV-'), `${r.id}: invalid evidence ID`);
      check(['implementation', 'verification'].includes(e.kind), `${r.id}: invalid evidence kind`);
      check(typeof e.summary === 'string' && e.summary.length > 0, `${r.id}: missing evidence summary`);
      check(typeof e.ref === 'string' && (/^https:\/\/[^\s]+$/.test(e.ref) || localRef(e.ref)), `${r.id}: missing evidence reference`);
      check(strings(e.scenarios) && e.scenarios.every((s) => r.scenarios.includes(s)), `${r.id}: invalid evidence scenarios`);
      if (e.kind === 'verification') {
        check(e.command && e.environment && e.date && ['pass', 'fail', 'inconclusive'].includes(e.result), `${r.id}: incomplete verification record`);
      }
      if (evidence.has(e.id)) check(JSON.stringify(evidence.get(e.id)) === JSON.stringify(e), `${e.id}: inconsistent evidence metadata`);
      evidence.set(e.id, e);
    }
    if (r.status === 'implemented') check(r.evidence?.some((e) => e.kind === 'implementation'), `${r.id}: implemented without implementation evidence`);
    if (r.status === 'verified') {
      const covered = new Set((r.evidence ?? []).filter((e) => e.kind === 'verification' && e.result === 'pass').flatMap((e) => e.scenarios ?? []));
      check(r.scenarios?.every((s) => covered.has(s)), `${r.id}: verified without passing evidence for all scenarios`);
    }
  }
  for (const [id, task] of tasks) {
    for (const requirement of task.ids) check(requirements.get(requirement)?.tasks?.includes(id), `Task ${id}: unregistered requirement link ${requirement}`);
  }
  // Baseline plus active deltas must be represented; archived history remains available via register paths.
  const specFiles = [...walk(join(root, 'openspec/specs')), ...walk(join(root, 'openspec/changes'))]
    .filter((file) => file.endsWith(`${sep}spec.md`) && !file.includes(`${sep}archive${sep}`));
  for (const file of specFiles) {
    const capability = file.split(sep).at(-2);
    for (const [, id] of read(file).matchAll(/^### Requirement: (\S+)/gm)) {
      check(requirements.get(id)?.capability === capability, `${relative(root, file)}: unregistered requirement ${id}`);
    }
  }
  check(Array.isArray(register.completedTasks), 'Missing completedTasks array');
  const completed = new Map();
  for (const entry of register.completedTasks ?? []) {
    check(!completed.has(entry.task), `Duplicate completion ${entry.task}`);
    completed.set(entry.task, entry);
    check(tasks.get(entry.task)?.complete, `Completion for unchecked/unknown task ${entry.task}`);
    check(strings(entry.evidence) && entry.evidence.length > 0, `Task ${entry.task}: no completion evidence`);
    for (const id of entry.evidence ?? []) check(evidence.has(id), `Task ${entry.task}: unknown evidence ${id}`);
    for (const req of tasks.get(entry.task)?.ids ?? []) {
      check((requirements.get(req)?.evidence ?? []).some((e) => entry.evidence?.includes(e.id) && e.kind === 'verification' && e.result === 'pass'), `Task ${entry.task}: no passing evidence linked to ${req}`);
    }
  }
  for (const [id, task] of tasks) check(!task.complete || completed.has(id), `Checked task ${id} has no completion record`);

  const markdown = ['README.md', 'AGENTS.md', 'docs', 'openspec', '.github/pull_request_template.md']
    .flatMap((path) => walk(join(root, path))).filter((file) => file.endsWith('.md'));
  for (const file of markdown) {
    const content = read(file).replace(/```[\s\S]*?```/g, '');
    for (const [, raw] of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(raw)) continue;
      const target = decodeURIComponent(raw.split('#')[0]);
      check(existsSync(resolve(dirname(file), target)), `${relative(root, file)}: broken relative link ${raw}`);
    }
  }
  return { errors, requirements: requirements.size, scenarios: [...requirements.values()].reduce((sum, r) => sum + r.scenarios.length, 0), tasks: tasks.size, completedTasks: completed.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkTraceability(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    if (result.errors.length) {
      process.stderr.write(result.errors.join('\n') + '\n');
      process.exitCode = 1;
    } else {
      process.stdout.write(`Traceability OK: ${result.requirements} requirements, ${result.scenarios} scenarios, ${result.tasks} tasks, ${result.completedTasks} completed implementation tasks.\n`);
    }
  } catch (error) {
    process.stderr.write(`Traceability error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
