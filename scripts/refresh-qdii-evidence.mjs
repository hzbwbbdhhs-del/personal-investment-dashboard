import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

const require = createRequire(import.meta.url);
const { compareOfficialLimit } = require('../vendor/qdii-purchase-limits/scripts/lib/official-pdf.js');
const run = promisify(execFile);
const readJson = path => readFile(path, 'utf8').then(JSON.parse).catch(() => null);
const age = stamp => Date.now() - new Date(stamp).getTime();
const comparisonUrl = 'https://raw.githubusercontent.com/promise96319/qdii/main/data/latest.json';

// Automatic parsing is evidence of an announcement, NOT a live order-page check.
export function announcementEvidence(row, queriedAt) {
  const unknown = { status: 'unknown', amount: null, checkedAt: queriedAt };
  if (row.officialNoticeError || !row.officialNotice?.parsed?.parsed) return { agency: unknown, direct: unknown };
  const notice = row.officialNotice;
  const resolve = channel => {
    const rule = compareOfficialLimit({ code: row.code, channel, status: 'unknown', limitAmount: null }, notice.parsed, queriedAt, 'Asia/Shanghai');
    const suspended = rule.status === 'official-suspended';
    const covered = suspended || rule.status === 'official-open' || ['match', 'channel-no-limit-shown', 'channel-lower', 'channel-higher'].includes(rule.status);
    const daily = String(rule.accountBasis || '').startsWith('single-fund-account-daily-cumulative');
    return {
      status: !covered ? 'unknown' : suspended ? 'suspended' : rule.status === 'official-open' ? 'open' : daily && rule.currency === 'CNY' ? 'limited' : 'unknown',
      amount: covered && daily && rule.currency === 'CNY' && Number.isFinite(rule.amount) && rule.amount > 0 ? rule.amount : null,
      currency: rule.currency || null, accountBasis: rule.accountBasis || 'unknown', scope: rule.scope,
      effectiveDate: rule.effectiveDate || null, noticeDate: rule.noticeDate || notice.date || null,
      sourceUrl: rule.noticeUrl || notice.url || null, checkedAt: queriedAt,
      currentAvailability: 'unverified', parserStatus: rule.status
    };
  };
  return { agency: resolve('代销机构（含支付宝）'), direct: resolve('基金公司直销') };
}

export function validComparison(data) {
  return Array.isArray(data?.funds) && data.funds.length >= 40 && Number.isFinite(new Date(data.updated_at).getTime())
    && new Date(data.updated_at).getTime() <= Date.now() + 60000
    && new Set(data.funds.map(f => f.code)).size === data.funds.length
    && data.funds.every(f => /^\d{6}$/.test(f.code) && ['NDX100', 'SP500'].includes(f.index));
}

async function main() {
  const root = existsSync('app.js') ? '' : 'dist/';
  const output = root + 'qdii-limits.json';
  let payload = await readJson(output);
  if (process.argv.includes('--cloud-base')) {
    const { stdout } = await run('curl', ['--ipv4', '--location', '--fail', '--silent', '--show-error', '--max-time', '25', 'https://raw.githubusercontent.com/hzbwbbdhhs-del/personal-investment-dashboard/main/qdii-limits.json?ts=' + Date.now()], { maxBuffer: 10 * 1024 * 1024 });
    const cloud = JSON.parse(stdout);
    if (cloud.status === 'available' && cloud.funds?.length >= 60 && new Date(cloud.updatedAt) > new Date(payload?.updatedAt || 0)) payload = cloud;
  }
  if (!Array.isArray(payload?.funds)) throw new Error('Missing base QDII snapshot');
  const cache = '.cache/qdii-engine';
  let engine = await readJson(cache + '/latest.json');
  const startedAt = new Date().toISOString();
  let error = null;
  if (!engine?.queriedAt || age(engine.queriedAt) > 60 * 60 * 1000 || age(engine.queriedAt) < -60000 || process.argv.includes('--force')) {
    try {
      await run(process.execPath, ['--dns-result-order=ipv4first', 'vendor/qdii-purchase-limits/scripts/query-purchase-limits.js', '--output-dir', cache, '--concurrency', '3', '--force'], { timeout: 540000, maxBuffer: 5 * 1024 * 1024 });
    } catch (e) { error = e.code === 2 ? '采集部分失败，逐基金检查证据' : '公告采集失败：' + (e.killed ? '超时' : String(e.message).slice(0, 160)); }
    engine = await readJson(cache + '/latest.json');
  }
  let comparison = await readJson(cache + '/comparison.json');
  let comparisonError = null;
  try {
    const url = comparisonUrl + '?ts=' + Date.now();
    let data;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      data = await response.json();
    } catch {
      const { stdout } = await run('curl', ['--ipv4', '--http1.1', '--location', '--fail', '--silent', '--show-error', '--connect-timeout', '8', '--max-time', '25', url], { maxBuffer: 3 * 1024 * 1024 });
      data = JSON.parse(stdout);
    }
    if (!validComparison(data)) throw new Error('快照格式不完整');
    comparison = { ...data, fetchedAt: new Date().toISOString() };
    // Mechanical cache output; not a manually edited project source.
    const { mkdir } = await import('node:fs/promises');
    await mkdir(cache, { recursive: true });
    await writeFile(cache + '/comparison.json', JSON.stringify(comparison));
  } catch (e) { comparisonError = String(e.message); }
  const rows = new Map((engine?.rows || []).map(row => [row.code, row]));
  const checks = new Map((comparison?.funds || []).map(row => [row.code, row]));
  for (const fund of payload.funds) {
    const row = rows.get(fund.code);
    // Never promote an old manually curated quota into current evidence.
    fund.evidence = row ? { ...announcementEvidence(row, engine.queriedAt), checkedAt: engine.queriedAt,
      sourceStatus: row.status, sourceAmount: row.limitAmount ?? null, sourceUrl: row.sourceUrl,
      noticeDate: row.officialNotice?.date || null, error: row.officialNoticeError || null } : null;
    const check = checks.get(fund.code);
    fund.comparison = check ? { status: check.status, amount: typeof check.max_buy === 'number' && check.max_buy > 0 ? check.max_buy : null,
      sourceUpdatedAt: comparison.updated_at, fetchedAt: comparison.fetchedAt,
      stale: Boolean(check.stale || comparisonError || age(comparison.updated_at) > 26 * 60 * 60 * 1000),
      sourceUrl: 'https://github.com/promise96319/qdii', channel: '天天基金参考（不是支付宝/直销额度）' } : null;
  }
  payload.schemaVersion = 3;
  payload.evidenceSources = {
    parser: { repository: 'https://github.com/aiten2/qdii-purchase-limits', version: '1.12.7', commit: 'cc86f1a19b9df2c1eb90a0622f4c25f29b6f5aaf', startedAt,
      checkedAt: engine?.queriedAt || null, completedAt: engine?.completedAt || null, health: engine?.health || null,
      officialNotices: engine?.officialNotices || null, error, scope: '人民币场外纳斯达克100/标普500；其他持仓暂不支持' },
    comparison: { repository: 'https://github.com/promise96319/qdii', sourceUpdatedAt: comparison?.updated_at || null,
      fetchedAt: comparison?.fetchedAt || null, count: comparison?.funds?.length || 0, error: comparisonError }
  };
  await writeFile(output, JSON.stringify(payload, null, 2) + '\n');
  console.log(JSON.stringify({ output, parserAt: engine?.queriedAt, parserHealth: engine?.health?.status,
    directRules: payload.funds.filter(f => f.evidence?.direct?.status !== 'unknown' && f.evidence?.direct).length,
    comparisonAt: comparison?.updated_at, error, comparisonError }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
