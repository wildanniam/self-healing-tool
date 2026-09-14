import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {analyzeHoldout,renderMarkdown} from './analyze-holdout.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

async function main() {
  const args = process.argv.slice(2), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let directory = join(root, 'output/d27/synthetic-v1'), budgetPath, partial = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--partial') partial = true;
    else if (['--directory', '--budget'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const flag = args[i], value = resolve(args[++i]); if (flag === '--directory') directory = value; else budgetPath = value;
    } else throw new Error('Usage: node evaluation/analyze-d27-synthetic.mjs [--directory PATH] [--budget PATH] [--partial]');
  }
  const files = { records: join(directory, 'results.json'), schedule: join(directory, 'schedule.json'), freeze: join(directory, 'freeze.json'), started: join(directory, 'started.json'), budget: budgetPath ?? join(directory, 'budget.json') };
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => { const bytes = await readFile(path); return [key, { data: JSON.parse(bytes), path, sha256: hash(bytes) }]; }));
  const loaded = Object.fromEntries(entries), inputs = Object.fromEntries(entries.map(([key, value]) => [key, value.data]));
  let frozenSummary = null, summaryProvenance = null;
  try { const path = join(directory, 'summary.json'), bytes = await readFile(path); frozenSummary = JSON.parse(bytes); summaryProvenance = { path, sha256: hash(bytes) }; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = analyzeHoldout({ ...inputs, partial, frozenSummary, provenance: { inputs: Object.fromEntries(entries.map(([key, value]) => [key, { path: value.path, sha256: value.sha256 }])), frozenSummary: summaryProvenance, analyzerSha256: hash(await readFile(fileURLToPath(import.meta.url))) } });
  report.studyRole='known-development-regression-rerun';
  report.limitations=report.limitations.map(x=>x.replace('Frozen methods and primary metrics unchanged. State/acknowledgment analyses were added after inspecting outcomes.','Primary and supplementary state/acknowledgment analyses inherited from D26 and specified before D27 collection.').replace('Synthetic holdout only; no real-world or universal-effectiveness claim.','Known synthetic regression rerun: previously inspected cases, not unseen validation.'));
  // Refuse to publish a report assembled while any retained input was changing.
  for (const { path, sha256 } of Object.values(loaded)) if (hash(await readFile(path)) !== sha256) throw new Error('Input changed during analysis; no report written.');
  const stem = partial ? 'posthoc-analysis.partial' : 'posthoc-analysis';
  const jsonPath = join(directory, stem + '.json'), markdownPath = join(directory, stem + '.md');
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(markdownPath, renderMarkdown(report).replace('# D26 ', '# D27 ').replace('## Added posthoc state', '## State').replace('Three repeats', 'Three repeats'), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, complete: report.completion.complete, json: jsonPath, markdown: markdownPath, primaryMatchesRunner: report.frozenPrimary.matchesRetainedSummary }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
