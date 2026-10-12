import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const require = createRequire(import.meta.url);
const { collectLatestOfficialNotices } = require('../vendor/qdii-purchase-limits/scripts/lib/official-notices.js');
const { extractPdfText } = require('../vendor/qdii-purchase-limits/scripts/lib/official-pdf.js');
const run = promisify(execFile);
const json = path => readFile(path, 'utf8').then(JSON.parse).catch(() => null);

export async function dashboardScope(payload, root) {
  const app = await readFile(root + 'app.js', 'utf8');
  const codes = JSON.parse(app.match(/const knownFundCodes = (\{[\s\S]*?\n\});/)[1].replace(/,\s*}/g, '}'));
  const snapshot = JSON.parse((await readFile(root + 'portfolio-data.js', 'utf8')).replace(/^\s*window\.portfolioSnapshot\s*=\s*/, '').replace(/;\s*$/, ''));
  const active = new Set(snapshot['持仓'].filter(r => Number(r['持仓金额_元']) > 0 &&
    !/债券|国开行|纯债|稳泰|增强回报|纳斯达克|纳指|标普|富时100|日经225|指数|ETF|联接/i.test(r['基金名称']) &&
    /QDII|全球|新兴市场|移动互联|高端制造|日本精选/.test(r['基金名称']))
    .map(r => r['基金代码'] || codes[r['基金名称']]).filter(Boolean));
  return new Set(payload.funds.filter(f => f.currency === 'CNY' && !f.exchangeOnly &&
    (['nasdaq100','sp500'].includes(f.category) || active.has(f.code))).map(f => f.code));
}

async function curl(url, binary = false) {
  const result = await run('curl', ['--ipv4', '--http1.1', '--fail', '--location', '--silent', '--show-error',
    '--connect-timeout', '6', '--max-time', '16', '-e', 'https://fundf10.eastmoney.com/', url],
    { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 9 * 1024 * 1024 });
  return result.stdout;
}

export async function auditHeldFunds(payload, root, cache, { force = false } = {}) {
  const scope = await dashboardScope(payload, root);
  const funds = payload.funds.filter(f => scope.has(f.code) && f.category === 'held');
  const path = cache + '/held-active.json';
  const old = await json(path);
  const age = Date.now() - Date.parse(old?.queriedAt);
  const changed = funds.some(f => !old?.rows?.some(r => r.code === f.code) ||
    (f.latestNotices || []).some(n => !(old?.rows?.find(r => r.code === f.code)?.officialNotice?.timeline || []).some(x => x.id === n.id)));
  if (!force && age >= 0 && age < 45 * 60000 && !changed) return old;
  const queriedAt = new Date().toISOString();
  const pdfEventCache = await json(cache + '/official-pdf-event-cache.json');
  const result = await collectLatestOfficialNotices(funds.map(f => ({ ...f, index: 'held' })), {
    concurrency: 2, pdfConcurrency: 2, queriedAt, maxAnnouncementNotices: 30,
    parserVersion: 11, pdfEventCache,
    fetchAnnouncementText: url => curl(url), fetchBuffer: url => curl(url, true), extractPdfText
  });
  const rows = funds.map(f => ({ code: f.code, queriedAt, officialNotice: result.byCode[f.code] || null,
    officialNoticeError: result.errors.filter(e => e.code === f.code).map(e => e.message).join('；') ||
      (!result.byCode[f.code] ? '未取得可靠的申购公告时间线' : null) }));
  const output = { queriedAt, rows, errors: result.errors, coverage: result.sourceCoverage };
  await mkdir(cache, { recursive: true });
  await writeFile(path, JSON.stringify(output));
  if (result.pdfEventCache) await writeFile(cache + '/official-pdf-event-cache.json', JSON.stringify(result.pdfEventCache));
  return output;
}
