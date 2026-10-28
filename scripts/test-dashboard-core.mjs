import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
await import(existsSync('dashboard-core.js') ? '../dashboard-core.js' : '../dist/dashboard-core.js');
const core = globalThis.dashboardCore;
const now = Date.parse('2026-10-28T12:00:00+08:00');
const fund = { nav: 1.2, latestDate: '2026-10-27', lastSuccessAt: '2026-10-28T11:00:00+08:00' };
assert.equal(core.fundState(fund, {}, now).label, '已更新');
assert.equal(core.fundState({ ...fund, refreshStatus: 'failed' }, {}, now).level, 'error');
assert.equal(core.fundState({ ...fund, lastSuccessAt: '2026-10-20T12:00:00+08:00' }, {}, now).level, 'warning');
assert.equal(core.fundState({ ...fund, latestDate: '2026-10-15' }, {}, now).label, '净值日期较早');
assert.equal(core.fundState({ ...fund, nav: null }, {}, now).level, 'error');
assert.equal(core.fundState(fund, {}, Date.parse('2026-10-31T12:00:00+08:00')).level, 'warning');
const groups = core.groupReturns([
  { value: 110, result: { amount: 10, fund: { latestDate: '2026-10-27' } } },
  { value: 198, result: { amount: -2, fund: { latestDate: '2026-10-27' } } },
  { value: 500, result: { amount: -20, fund: { latestDate: '2026-10-26' } } },
  { value: 90, result: null },
]);
assert.equal(groups.length, 2);
assert.equal(groups[0].amount, 8);
assert.equal(groups[0].previousValue, 300);
assert.equal(groups[0].rate, 8 / 300 * 100);
assert.deepEqual([0, -5, -10, -15, -20].map(core.drawdownBand), [0, 1, 2, 3, 4]);
assert.equal(core.drawdownBand(null), null);
assert.equal(core.sparkline([{ date: '2026-10-27', value: 1 }]), '');
assert.equal(core.sparkline([{ date: 'a', value: 2 }, { date: 'b', value: 2 }]), 'M2.00,23.00 L158.00,23.00');
console.log('Dashboard checks passed: dates, partial coverage, failure/staleness, denominator, bands and grounded charts.');
