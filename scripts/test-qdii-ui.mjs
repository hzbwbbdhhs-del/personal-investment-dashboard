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
const el = id => elements.get(id) || (elements.set(id, { value: id === '#qdiiChannelFilter' ? 'either' : '', checked: false, listeners: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; }, addEventListener(event, callback) { this.listeners[event] = callback; } }), elements.get(id));
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
assert.ok(!html.includes('<details>')); // Agency amount is visible without opening a disclosure.
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

const fixture = (code, direct, agency, category = 'nasdaq100') => ({ ...structuredClone(fund), code, category,
  evidence: { ...structuredClone(parsed), checkedAt: now,
    direct: { ...parsed.direct, amount: direct, status: direct === 0 ? 'suspended' : direct == null ? 'unknown' : 'limited' },
    agency: { ...parsed.agency, amount: agency, status: agency === 0 ? 'suspended' : agency == null ? 'unknown' : 'limited' } } });
context.sortFunds = [fixture('000001', 900, 0), fixture('000002', 600, 500), fixture('000003', null, null),
  fixture('000004', 0, 0), fixture('000005', 100, null), fixture('000006', 1500, 500, 'held')];
context.holdings = [{ code: '000001', value: 100 }, { code: '000001', value: 250 }, { code: '000002', value: 300 },
  { code: '000006', value: 10, category: '主动 QDII' }];
const evaluate = code => vm.runInContext(code, context);
el('#qdiiSortSelect').value = 'combined';
assert.equal(evaluate('sortFunds.slice().sort(qdiiCompare).map(f=>f.code).join(",")'), '000006,000002,000001,000005,000004,000003');
assert.equal(evaluate('qdiiHoldingValue("000001")'), 350); // Same-code records across channels are combined.
assert.equal(evaluate('qdiiHoldingValue("000003")'), null);
assert.equal(evaluate('qdiiCombinedQuota(sortFunds[4], qdiiEvidence(sortFunds[4])).complete'), false);
assert.ok(evaluate('qdiiRowSummary(sortFunds[4], qdiiEvidence(sortFunds[4]))').includes('仅已知渠道'));
context.sortFunds[1].alipay.status = '不可售';
assert.equal(evaluate('qdiiCombinedQuota(sortFunds[1], qdiiEvidence(sortFunds[1])).amount'), 600);
context.sortFunds[1].alipay.status = '正常申购';
el('#qdiiSortSelect').value = 'holding';
assert.equal(evaluate('sortFunds.slice().sort(qdiiCompare).map(f=>f.code).join(",")'), '000001,000002,000006,000005,000004,000003');
context.valuationFor = item => ({ value: item.code === '000002' ? 500 : item.value });
assert.equal(evaluate('qdiiHoldingValue("000002")'), 500);
assert.equal(evaluate('sortFunds.slice().sort(qdiiCompare)[0].code'), '000002');
evaluate('qdiiView.payload = { ...payload, funds: sortFunds }; qdiiView.shown = 60');
el('#qdiiSortSelect').listeners.change();
assert.equal(evaluate('qdiiView.shown'), 30);
assert.ok(el('#qdiiScope').textContent.includes('按我的持仓金额'));
const ordered = el('#qdiiRows').innerHTML;
assert.ok(ordered.indexOf('000002 ·') < ordered.indexOf('000001 ·'));
assert.ok(ordered.includes('我的持仓金额（估算）：¥500.00'));
el('#qdiiSortSelect').value = 'combined';
el('#qdiiSortSelect').listeners.change();
assert.ok(el('#qdiiScope').textContent.includes('合计未扣跨渠道共享额度'));
assert.ok(el('#qdiiRows').innerHTML.indexOf('000006 ·') < el('#qdiiRows').innerHTML.indexOf('000002 ·'));
evaluate('qdiiView.payload = { ...payload, updatedAt: "2026-10-11T10:39:00Z", evidenceSources: { parser: { checkedAt: "2026-10-11T09:56:00Z" }, comparison: { sourceUpdatedAt: "2026-10-11T07:35:00Z" } } }; renderQdiiUpdateTimes()');
assert.equal(el('#qdiiCollectedAt').textContent, '2026/10/11 18:39');
assert.equal(el('#qdiiParserAt').textContent, '2026/10/11 17:56');
assert.equal(el('#qdiiComparisonAt').textContent, '2026/10/11 15:35');
assert.equal(el('#qdiiCollectedAt').attributes.datetime, '2026-10-11T10:39:00.000Z');
evaluate('qdiiView.refreshFailed = true; renderQdiiUpdateTimes()');
assert.ok(el('#qdiiUpdatedAt').textContent.includes('刷新失败'));
assert.equal(el('#qdiiCollectedAt').textContent, '2026/10/11 18:39');
evaluate('qdiiView.payload.evidenceSources = {}; renderQdiiUpdateTimes()');
assert.equal(el('#qdiiParserAt').textContent, '未核实');
assert.equal(el('#qdiiParserAt').attributes.datetime, undefined);
assert.equal(evaluate('qdiiTime(null)'), '未核实');
// Scope is a hard allowlist, not merely a default category selection.
context.scopeFunds = [fixture('100001', 100, 100), fixture('100002', 100, 100, 'sp500'),
  fixture('100003', 100, 100, 'held'), fixture('100004', 100, 100, 'held'),
  fixture('100005', 100, 100, 'held'), fixture('100006', 100, 100, 'held'),
  fixture('100007', 100, 100, 'other'), fixture('100008', 100, 100, 'held'),
  { ...fixture('100009', 100, 100), currency: 'USD' }];
context.scopeFunds[2].name = '测试全球成长混合(QDII)A';
context.scopeFunds[3].name = '测试未持有主动混合(QDII)A';
context.scopeFunds[4].name = '测试国内纯债A';
context.scopeFunds[5].name = '测试日经225指数(QDII)A';
context.scopeFunds[7].name = '测试已清仓混合(QDII)A';
context.holdings = [{code:'100003',value:100,category:'主动 QDII'},
  {code:'100005',value:100,category:'债券 / 现金'}, {code:'100006',value:100,category:'主动 QDII'},
  {code:'100007',value:100,category:'主动 QDII'}, {code:'100008',value:0,category:'主动 QDII'}];
evaluate('qdiiView.payload = { ...payload, funds: scopeFunds }');
assert.equal(evaluate('qdiiScopeFunds().map(f=>f.code).join(",")'), '100001,100002,100003');
el('#qdiiIncludeExtra').checked = true;
assert.equal(evaluate('qdiiScopeFunds().map(f=>f.code).join(",")'), '100001,100002,100003,100009');
evaluate('qdiiView.category = "held"; renderQdiiLimits()');
assert.equal(el('#qdiiCount').textContent, '1 只');
assert.ok(el('#qdiiRows').innerHTML.includes('100003 · 我的主动 QDII'));
assert.ok(!el('#qdiiRows').innerHTML.includes('100005 ·'));
assert.ok(!el('#qdiiRows').innerHTML.includes('100006 ·'));
assert.ok(el('#qdiiScope').textContent.includes('其他基金不显示'));
context.holdings = [];
assert.equal(evaluate('qdiiScopeFunds().some(f=>f.category === "held")'), false);
console.log('PASS: channel evidence, sorting, NAV valuation, header timestamps, refresh preservation and QDII-only scope');
