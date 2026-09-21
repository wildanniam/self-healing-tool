import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export type OpenPolicy = 'always' | 'on-failure' | 'never';
export function shouldOpen(policy: OpenPolicy, failed: boolean, ci = process.env.CI): boolean {
  return !!(!ci && (policy === 'always' || (policy === 'on-failure' && failed)));
}
/** Best effort, no shell interpolation, no effect on the test exit status. */
export async function openReport(file: string): Promise<void> {
  const url = pathToFileURL(file).href;
  const [command, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]] : ['xdg-open', [url]];
  await new Promise<void>(resolve => {
    const child = spawn(command!, args as string[], { stdio: 'ignore' });
    let finished = false;
    const timer = setTimeout(() => { child.kill(); finish(false); }, 5000);
    function finish(ok: boolean) { if (finished) return; finished = true; clearTimeout(timer); if (!ok) console.warn('[self-healing] Open the printed report path in your browser.'); resolve(); }
    child.once('error', () => finish(false));
    child.once('exit', code => finish(code === 0));
  });
}
