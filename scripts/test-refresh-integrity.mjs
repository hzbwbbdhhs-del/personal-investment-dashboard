import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const directory = await mkdtemp(resolve(tmpdir(), 'dashboard-refresh-test-'));
const script = await readFile(new URL('./fetch-fund-data.mjs', import.meta.url), 'utf8');
try {
  await writeFile(resolve(directory, 'app.js'), 'const knownFundCodes = {\n "Test": "000001",\n};');
  await writeFile(resolve(directory, 'portfolio-data.js'), 'window.portfolioSnapshot = {"持仓":[{"基金名称":"Test","数据日期":"2026-10-01"}]};');
  const seed = { status: 'daily', updatedAt: '2026-10-20T12:00:00Z', funds: { '000001': { code: '000001', status: 'available', nav: 1.25, latestDate: '2026-10-20', referenceNavs: { '2026-10-01': { nav: 1.1, date: '2026-09-30' } } } } };
  await writeFile(resolve(directory, 'fund-data.json'), JSON.stringify(seed));
  // Simulate a source outage without making network requests or waiting for backoff.
  await writeFile(resolve(directory, 'outage.mjs'), "globalThis.fetch=async()=>{throw new Error('offline')};globalThis.setTimeout=(fn)=>fn();\n" + script);
  execFileSync(process.execPath, ['outage.mjs'], { cwd: directory, stdio: 'pipe' });
  let result = JSON.parse(await readFile(resolve(directory, 'fund-data.json'), 'utf8'));
  assert.equal(result.checkStatus, 'failed');
  assert.equal(result.funds['000001'].nav, 1.25);
  assert.equal(result.funds['000001'].latestDate, '2026-10-20');
  assert.equal(result.funds['000001'].lastSuccessAt, seed.updatedAt);
  assert.equal(result.funds['000001'].refreshStatus, 'failed');
  // A regressed provider response must also retain the newer successful value.
  const response = [{ DWJZ: '1.23', FSRQ: '2026-10-19', JZZZL: '1' }];
  await writeFile(resolve(directory, 'regression.mjs'), `globalThis.fetch=async()=>({ok:true,json:async()=>({Data:{LSJZList:${JSON.stringify(response)}}})});globalThis.setTimeout=(fn)=>fn();\n` + script);
  execFileSync(process.execPath, ['regression.mjs'], { cwd: directory, stdio: 'pipe' });
  result = JSON.parse(await readFile(resolve(directory, 'fund-data.json'), 'utf8'));
  assert.equal(result.funds['000001'].nav, 1.25);
  assert.equal(result.checkStatus, 'failed');
  // Recovery keeps baseline NAVs, clears failure, and separates check and content times.
  response[0] = { DWJZ: '1.26', FSRQ: '2026-10-21', JZZZL: '0.8' };
  await writeFile(resolve(directory, 'recovery.mjs'), `globalThis.fetch=async()=>({ok:true,json:async()=>({Data:{LSJZList:${JSON.stringify(response)}}})});\n` + script);
  execFileSync(process.execPath, ['recovery.mjs'], { cwd: directory, stdio: 'pipe' });
  result = JSON.parse(await readFile(resolve(directory, 'fund-data.json'), 'utf8'));
  assert.equal(result.checkStatus, 'success');
  assert.equal(result.funds['000001'].nav, 1.26);
  assert.equal(result.funds['000001'].referenceNavs['2026-10-01'].nav, 1.1);
  const changedAt = result.updatedAt;
  execFileSync(process.execPath, ['recovery.mjs'], { cwd: directory, stdio: 'pipe' });
  result = JSON.parse(await readFile(resolve(directory, 'fund-data.json'), 'utf8'));
  assert.equal(result.updatedAt, changedAt);
  assert.ok(result.checkedAt >= changedAt);
  console.log('Refresh integrity passed: outage, source regression, recovery, retained baseline, unchanged-NAV heartbeat.');
} finally { await rm(directory, { recursive: true, force: true }); }
