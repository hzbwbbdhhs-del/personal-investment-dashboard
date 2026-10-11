import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { announcementEvidence, validComparison } from './refresh-qdii-evidence.mjs';
const now = new Date().toISOString();
// Synthetic fixtures test behavior; NEVER written into production data.
const row = { code: '096001', officialNotice: { date: '2020-01-01', url: 'https://example.com/fixture.pdf', parsed: {
  parsed: true, limits: [
    { scope: 'sales-agency', accountBasis: 'single-fund-account-daily-cumulative-per-share', effectiveDate: '2020-01-01', perShareLimits: { '096001': { amount: 100, currency: 'CNY' } } },
    { scope: 'specific-channel', channels: ['基金公司直销'], accountBasis: 'single-fund-account-daily-cumulative-per-share', effectiveDate: '2020-01-01', perShareLimits: { '096001': { amount: 1000, currency: 'CNY' } } }
  ]
} } };
const parsed = announcementEvidence(row, now);
assert.equal(parsed.agency.amount, 100);
assert.equal(parsed.direct.amount, 1000);
assert.equal(parsed.direct.currentAvailability, 'unverified');
assert.equal(announcementEvidence({ ...row, officialNoticeError: 'network' }, now).direct.amount, null);
const future = structuredClone(row);
future.officialNotice.parsed.limits.forEach(r => r.effectiveDate = '2099-01-01');
assert.equal(announcementEvidence(future, now).direct.amount, null);
const singleOrder = structuredClone(row);
singleOrder.officialNotice.parsed.limits.forEach(r => r.accountBasis = 'single-order');
assert.equal(announcementEvidence(singleOrder, now).direct.amount, null);
const onlyAgency = structuredClone(row);
onlyAgency.officialNotice.parsed.limits.pop();
assert.equal(announcementEvidence(onlyAgency, now).direct.amount, null);
assert.equal(validComparison({ funds: [], updated_at: now }), false);
const assetRoot = fs.existsSync('dist/qdii-ui.js') ? 'dist/' : '';
const payload = JSON.parse(fs.readFileSync(assetRoot + 'qdii-limits.json'));
const elements = new Map();
const el = id => elements.get(id) || (elements.set(id, { value: id === '#qdiiChannelFilter' ? 'either' : '', checked: false, addEventListener() {} }), elements.get(id));
const context = vm.createContext({ Date, Set, Math, Number, Boolean, String, holdings: [{code:'096001'}],
  document: { querySelector: el, querySelectorAll: () => [] }, location: { hostname: 'localhost' },
  window: { setInterval() {} }, fetch: () => new Promise(() => {}) });
vm.runInContext(fs.readFileSync(assetRoot + 'qdii-ui.js', 'utf8'), context);
context.payload = payload;
vm.runInContext('qdiiView.payload = payload;', context);
const fund = payload.funds.find(f => f.code === '096001');
fund.evidence = { ...parsed, checkedAt: now, noticeDate: '2020-01-01' };
fund.latestNotices = [{ date: '2020-01-01', title: '测试公告', url: 'https://example.com/fixture.pdf' }];
fund.noticeCheckedAt = now;
fund.alipay = { status: '正常申购', checkedAt: now, minimumCny:10 };
const evidence = () => vm.runInContext('qdiiEvidence(qdiiView.payload.funds.find(f=>f.code==="096001"))', context);
assert.equal(evidence().direct, 1000);
assert.equal(evidence().alipay, 100); // Announcement reference ONLY.
const html = vm.runInContext('qdiiChannelHtml(qdiiView.payload.funds.find(f=>f.code==="096001"), qdiiEvidence(qdiiView.payload.funds.find(f=>f.code==="096001")), "alipay")', context);
assert.ok(html.includes('支付宝实际限额未核实'));
assert.ok(html.includes('¥100/日'));
assert.ok(html.includes('核实时间：'));
assert.ok(html.includes('在售状态核实：'));
const directHtml = vm.runInContext('qdiiChannelHtml(qdiiView.payload.funds.find(f=>f.code==="096001"), qdiiEvidence(qdiiView.payload.funds.find(f=>f.code==="096001")), "direct")', context);
assert.ok(directHtml.includes('¥1,000/日'));
assert.ok(directHtml.includes('平台：大成基金官方直销'));
assert.ok(directHtml.includes('核实时间：'));
fund.alipay.status = '不可售';
assert.equal(evidence().alipay, null);
fund.alipay.status = '正常申购';
fund.evidence.checkedAt = '2020-01-01';
assert.equal(evidence().available, null);
const expiredHtml = vm.runInContext('qdiiChannelHtml(qdiiView.payload.funds.find(f=>f.code==="096001"), qdiiEvidence(qdiiView.payload.funds.find(f=>f.code==="096001")), "direct")', context);
assert.ok(expiredHtml.includes('金额：未核实'));
assert.ok(!expiredHtml.includes('¥1,000/日'));
assert.ok(expiredHtml.includes('额度核实时间：未核实'));
fund.evidence.checkedAt = now;
fund.latestNotices.push({ date: '2099-01-01' });
assert.equal(evidence().available, null);
fund.latestNotices.pop();
fund.evidence = null;
assert.equal(evidence().available, null); // Legacy manual rules are not current evidence.
assert.equal(vm.runInContext('qdiiScopeFunds().some(f=>f.exchangeOnly||f.currency!=="CNY")', context), false);
fund.evidence = { ...parsed, checkedAt: now, noticeDate: '2020-01-01' };
vm.runInContext('renderQdiiLimits()', context);
assert.ok(el('#qdiiRows').innerHTML.includes('支付宝'));
assert.ok(!el('#qdiiRows').innerHTML.includes('undefined'));
assert.equal(new Set(payload.funds.map(f=>f.code)).size, payload.funds.length);
assert.equal(payload.missingHeldCodes.length, 0);
console.log('PASS: synthetic adapter/channel fixtures, expiry, future rules, single-order exclusion, stale manual exclusion, scope, rendering');
