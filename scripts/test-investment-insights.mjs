import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const base=existsSync('investment-insights-core.js')?'':'dist/';
await import(new URL('../'+base+'investment-insights-core.js',import.meta.url));
const c=globalThis.investmentInsightsCore;
const rows=[{id:'1',code:'A',name:'纳斯达克100',amount:100,channel:'支付宝'},{id:'2',code:'A',name:'纳斯达克100',amount:200,channel:'直销'},{id:'3',code:'B',name:'标普500等权重',amount:100},{id:'4',code:'C',name:'全球科技(QDII)',category:'主动 QDII',amount:300,valuationBlocked:true},{id:'5',code:'D',name:'纯债债券',amount:1000},{id:'6',code:'E',name:'黄金ETF',amount:10}];
const s=c.summarize(rows);
assert.equal(s.total,1710);assert.equal(s.codeCount,5);assert.equal(s.count,6);
assert.equal(s.aggregate.find(r=>r.code==='A').amount,300);
assert.deepEqual(s.aggregate.find(r=>r.code==='A').channels,['支付宝','直销']);
assert.equal(s.groups.find(g=>g.id==='ndx').amount,300);assert.equal(s.groups.find(g=>g.id==='equal').amount,100);assert.equal(s.groups.find(g=>g.id==='spx').amount,0);
assert.equal(s.groups.reduce((sum,g)=>sum+g.amount,0),s.total);
assert.equal(s.blocked,300);
assert.equal(c.group({name:'景顺长城纳斯达克科技市值加权ETF联接(QDII)A'}),'tech');
const stress=c.scenario(s,-20,-1);assert.equal(stress.low,-150);assert.equal(stress.high,-90);assert.equal(stress.excluded,10);
assert.ok(c.scenario(s,-30,-1).low<stress.low);assert.equal(c.scenario(s,0,0).low,0);assert.equal(c.scenario(s,null,-1),null);assert.equal(c.scenario(s,-101,-1),null);
assert.equal(c.summarize([{amount:null},{amount:-1}]).total,0);assert.equal(c.summarize([]).top,null);
assert.equal(c.researchState({date:'2026-10-26',reviewAfter:'2026-11-02'},Date.parse('2026-11-01T23:59:59+08:00')),'reviewed');
assert.equal(c.researchState({date:'2026-10-26',reviewAfter:'2026-11-02'},Date.parse('2026-11-02T00:00:00+08:00')),'expired');
assert.equal(c.researchState({date:'2027-10-26',reviewAfter:'2027-11-02'},Date.parse('2026-10-28')),'unverified');
const now=Date.parse('2026-10-28T05:00:00Z');
assert.equal(c.marketState({value:100,updatedAt:'2026-10-27'},{checkedAt:'2026-10-28T04:00:00Z'},now),'available');
assert.equal(c.marketState({value:100,updatedAt:'2026-10-27',refreshStatus:'failed'},{checkedAt:'2026-10-28T04:00:00Z'},now),'stale');
assert.equal(c.marketState({value:null},{},now),'missing');
assert.equal(c.marketState({value:100,updatedAt:'2026-10-29'},{checkedAt:'2026-10-28T04:00:00Z'},now),'stale');
assert.equal(c.marketState({value:100,updatedAt:'2026-10-27'},{checkedAt:'2026-10-29T04:00:00Z'},now),'stale');
const ctx=vm.createContext({window:{},structuredClone,Intl});
vm.runInContext(readFileSync(base+'portfolio-data.js','utf8'),ctx);
const app=readFileSync(base+'app.js','utf8');
vm.runInContext(app.slice(0,app.indexOf('const storageKey'))+app.slice(app.indexOf('function formatCurrency('),app.indexOf('function chinaDate(')),ctx);
const real=vm.runInContext('initialHoldings',ctx).map(r=>({...r,amount:r.value}));
const actual=c.summarize(real);
assert.equal(actual.count,72);assert.equal(actual.codeCount,64);assert.equal(Math.round(actual.total*100),48661333);assert.equal(Math.round(actual.blocked*100),5539293);
vm.runInContext(readFileSync(base+'investment-research.js','utf8'),ctx);
assert.ok(ctx.window.investmentResearch.sources.length>=2);
for(const source of ctx.window.investmentResearch.sources) {assert.match(source.url,/^https:\/\//);assert.ok(source.date<=ctx.window.investmentResearch.reviewedAt);assert.ok(source.reviewAfter>source.date);}
const research=ctx.window.investmentResearch,brief=research.dailyBrief;
if(brief) {
  const reviewed=Date.parse(brief.reviewedAt),basis=brief.basis;
  assert.ok(Number.isFinite(reviewed));
  assert.equal(brief.date,research.reviewedAt);
  assert.equal(brief.reviewedAt,research.reviewedAtTime);
  assert.match(basis.repositoryCommit,/^[a-f0-9]{40}$/);
  assert.ok(basis.holdingsVersion&&basis.holdingsCount>=basis.fundCodeCount);
  assert.equal(Object.values(basis.funds.navDates).reduce((n,count)=>n+count,0),basis.funds.successCount);
  assert.equal(basis.funds.successCount+basis.funds.failureCount,basis.fundCodeCount);
  for(const stamp of [basis.funds.checkedAt,basis.market.checkedAt,basis.qdii.collectedAt,basis.qdii.noticeCheckedAt])assert.ok(Date.parse(stamp)<=reviewed,'Evidence cannot be checked after the review');
  for(const group of [basis.market.observations,basis.macro.observations])for(const value of Object.values(group))assert.ok(value.date<=brief.date,'Observation dates cannot be replaced by future data');
  for(const event of basis.events||[])if(event.statusAtReview==='not_yet_published')assert.ok(Date.parse(event.scheduledAt)>reviewed,'Future releases must remain separate from published results');
  for(const hash of Object.values(basis.fileHashes))assert.match(hash,/^[a-f0-9]{64}$/);
  for(const point of brief.points){assert.ok(point.fact&&point.inference&&point.action&&point.sources.length);for(const source of point.sources)assert.match(source.url,/^https:\/\//);}
  for(const source of research.sources)if(source.checkStatus==='success'){assert.ok(source.date<=source.reviewedAt);assert.ok(Date.parse(source.reviewedAtTime)<=reviewed);}
}
console.log('Investment insights passed: real holdings totals, channel merge, strategy separation, pending bounds, stress monotonicity, missing inputs, research expiry and market freshness.');
