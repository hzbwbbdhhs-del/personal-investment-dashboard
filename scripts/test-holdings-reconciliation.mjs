import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const prefix = existsSync('app.js') ? '' : 'dist/';
const app = readFileSync(prefix + 'app.js', 'utf8');
const storage = new Map();
const context = vm.createContext({ window: {}, structuredClone, Intl, Date,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
});
vm.runInContext(readFileSync(prefix + 'portfolio-data.js', 'utf8'), context);
const records = context.window.portfolioSnapshot['持仓'];
const alipay = records.filter(row => row['渠道'] === '支付宝');
assert.equal(alipay.length, 62);
assert.equal(new Set(alipay.map(row => row['基金代码'])).size, 62);
for (const [key, cents] of [['持仓金额_元',46367468], ['持有收益_元',-474740], ['昨日收益_元',75464]]) {
  assert.equal(alipay.reduce((sum,row) => sum + Math.round(row[key]*100),0), cents);
}
assert.equal(records.filter(row => row['渠道'] === '直销').length, 10);
assert.equal(records.filter(row => row['暂停自动估值']).length, 4);
const key = 'personal-investment-dashboard-holdings-v2';
const direct = records.find(row => row['渠道'] === '直销');
const saved = [
  { id:'old-alipay',channel:'支付宝',code:'003949',value:999,cost:888,userEdited:true,monthly:200,monthlyDay:5 },
  { id:`snapshot-直销-${direct['序号']}`,channel:'直销',code:direct['基金代码'],value:123.45,userEdited:true },
];
storage.set(key, JSON.stringify(saved));
vm.runInContext(app.slice(0, app.indexOf('function saveHoldings()')) + app.slice(app.indexOf('function formatCurrency('), app.indexOf('function chinaDate(')), context);
let state = vm.runInContext('holdings',context);
assert.equal(state.length, 72);
assert.notEqual(state.find(row=>row.code==='003949').value,999);
assert.equal(state.find(row=>row.code==='003949').monthly,200);
assert.equal(state.find(row=>row.code==='003949').monthlyDay,5);
assert.equal(state.find(row=>row.id===saved[1].id).value,123.45);
assert.equal(storage.get(`${key}-before-${context.window.portfolioSnapshot['版本']}`),JSON.stringify(saved));
vm.runInContext('holdings = loadHoldings()',context);
assert.equal(vm.runInContext('holdings.length',context),72);
// Pending redemptions never get deducted a second time or included in daily estimates.
vm.runInContext("const fundData = {}; function displayChinaDate(value) { return value; }" + app.slice(app.indexOf('function valuationFor('),app.indexOf('function renderDailyReturn(')),context);
assert.equal(vm.runInContext("dailyReturnFor(holdings.find(row=>row.valuationBlocked))",context),null);
assert.equal(vm.runInContext("valuationFor(holdings.find(row=>row.valuationBlocked)).value === holdings.find(row=>row.valuationBlocked).value",context),true);
// Use exact NAV differences when available, not a rounded provider percentage.
vm.runInContext("fundData.TEST={status:'available',nav:1.2345,previousNav:1.2333,dailyChange:0.0012,dailyChangePct:0.10,referenceNavs:{'2026-10-28':{nav:1.2345}}}",context);
const result=vm.runInContext("dailyReturnFor({code:'TEST',value:12345,date:'2026-10-28'})",context);
assert.ok(Math.abs(result.amount-12)<1e-8);
const market = readFileSync('scripts/fetch-market-data.mjs','utf8');
vm.runInContext("const checkedAt='2026-10-28T05:00:00Z';" + market.slice(market.indexOf('function emptyMetric('),market.indexOf('const marketEntries =')),context);
assert.equal(vm.runInContext("metricFromRows(parseRows('DATE,TEST\\n2026-10-27,10\\n2026-10-28,','TEST'),'Test','test').value",context),10);
assert.equal(vm.runInContext("marketTemperature({NDX:{drawdownPct:-2,updatedAt:'2026-10-27'},VIX:{value:50},VXN:{value:60}}).band",context),0);
console.log('Holdings checks passed: 62-row cent reconciliation, repeat-safe migration, preserved direct edits/plans, pending exclusions, precise NAV return, missing market cells and NDX-only bands.');
// A stale raw CDN response must not mask a newer Pages snapshot (or vice versa).
context.location = { hostname:'example.github.io' };
context.AbortSignal = AbortSignal;
const response = date => ({ok:true,json:async()=>({checkedAt:date,funds:{TEST:{nav:1}}})});
context.fetch = async url => response(url.startsWith('./') ? '2026-10-28T05:11:00Z' : '2026-10-28T05:08:00Z');
vm.runInContext(app.slice(app.indexOf('async function latestFundSnapshot('),app.indexOf('async function refreshFundData(')),context);
assert.equal((await vm.runInContext('latestFundSnapshot()',context)).checkedAt,'2026-10-28T05:11:00Z');
context.fetch = async url => { if(url.startsWith('./')) throw Error('offline'); return response('2026-10-28T05:12:00Z'); };
assert.equal((await vm.runInContext('latestFundSnapshot()',context)).checkedAt,'2026-10-28T05:12:00Z');
context.fetch = async () => { throw Error('offline'); };
await assert.rejects(vm.runInContext('latestFundSnapshot()',context), /unavailable/);
console.log('CDN freshness checks passed: newer snapshot, one-source failure and full outage.');
