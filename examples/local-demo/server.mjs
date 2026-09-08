import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const document = await readFile(new URL('./app.html', import.meta.url));
export async function startDemoServer() {
  const instance = 'self-healing-synthetic-v1';
  const server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Demo-Instance': instance,
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-src 'none'" });
    res.end(document);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, instance, close: () => new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
}
export function assertDemoTarget(url, declaredOrigin) {
  const target = new URL(url), declared = new URL(declaredOrigin);
  if (declared.protocol !== 'http:' || declared.hostname !== '127.0.0.1' || !declared.port || declared.username || declared.password || target.origin !== declared.origin || target.username || target.password) throw new Error('Undeclared demo target');
  return target;
}
export async function confineDemo(context, origin) {
  assertDemoTarget(origin, origin);
  await context.routeWebSocket('**/*', ws => ws.close());
  await context.route('**/*', async route => {
    try { assertDemoTarget(route.request().url(), origin); }
    catch { await route.abort('blockedbyclient'); return; }
    // Inspect redirects before the browser or route.fetch follows them.
    try {
      const response = await route.fetch({ maxRedirects: 0, timeout: 5000 });
      const location = response.headers().location;
      if (location) assertDemoTarget(new URL(location, response.url()).href, origin);
      await route.fulfill({ response });
    } catch { await route.abort('blockedbyclient'); }
  });
}
export async function resetDemo(page, target, server) {
  assertDemoTarget(target, server.origin);
  const response = await page.goto(target);
  if (response?.headers()['x-demo-instance'] !== server.instance) throw new Error('Mismatched demo instance; reset refused');
  await page.evaluate(() => window.demoReset());
}
