import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { announcementEvidence, reviewedTimeline } from './qdii-evidence-core.mjs';
const require = createRequire(import.meta.url);
const { extractPdfText, parseOfficialNoticeText } = require('../vendor/qdii-purchase-limits/scripts/lib/official-pdf.js');
const { buildOfficialTimelineNotice } = require('../vendor/qdii-purchase-limits/scripts/lib/official-notices.js');
const run = promisify(execFile);
const VERSION = 1;

// Normalize equivalent issuer wording; amounts and share codes remain untouched.
// This dashboard is for an individual investor, not institutional direct sales.
export function parseReviewedText(text, indexedDate = null, linkedFunds = []) {
  const compact = text.replace(/\s+/g, '');
  let joined = text;
  for (let i=0;i<4;i++) joined=joined.replace(/([\u3400-\u9fff）)])\s+([\u3400-\u9fff（(])/g,'$1$2');
  joined=joined.replace(/\s*([：:，,。；;、（）()])\s*/g,'$1');
  const normalized = joined
    .replace(/机构投资者在直销机构、投资者在代销机构/g, '投资者在代销机构')
    .replace(/机构投资者单个基金账户在直销机构、投资者单个基金账户在代销机构/g, '投资者单个基金账户在代销机构')
    .replace(/非直销销售机构|非直销机构|代销渠道/g, '代销机构')
    .replace(/直销销售机构/g, '直销机构')
    .replace(/QDII[-－](?:FOF|LOF)/g, 'QDII')
    .replace(/下属分级基金的简称/g, '下属分级基金的基金简称')
    .replace(/([A-Z])\s*类\s*基金份额/g, '$1类份额')
    .replace(/不超过|不得超过/g, '不应超过')
    .replace(/累计金额限制仍为/g, '累计金额限制为')
    .replace(/日\s*[（(]\s*含当日\s*[）)]\s*起/g, '日起')
    .replace(/(基金代码\s*[：:])\s*(\d(?:\s*\d){5})(?!\d)/g, (_,label,code)=>label+code.replace(/\s/g,''))
    .replace(/(\d+(?:\.\d+)?)\s*千\s*(元人民币|人民币元|元)/g, (_, n) => (Number(n)*1000)+'人民币元')
    .replace(/，\s*单个投资者通过/g, '；单个投资者通过');
  const parsed = parseOfficialNoticeText(normalized);
  const names=compact.match(/下属分级基金的(?:基金)?简称(.*?)下属分级基金的交易代码/);
  const classes=[...(names?.[1]||'').matchAll(/QDII(?:[-－](?:FOF|LOF))?[）)]([A-Z])/g)].map(m=>m[1]);
  if (!parsed.limits.length && classes.length===parsed.shareCodes.length) {
    const explicit=[...compact.matchAll(/单个基金账户单日累计申购([A-Z])类基金份额的金额不得超过([\d,.]+)元/g)];
    for (const m of explicit) {
      const code=parsed.shareCodes[classes.indexOf(m[1])];
      if(code) parsed.limits.push({scope:'fund-manager-general',channels:[],perShareLimits:{[code]:{amount:Number(m[2].replaceAll(',','')),currency:'CNY'}}});
    }
    if(parsed.limits.length) parsed.parseWarnings=parsed.parseWarnings.filter(w=>w!=='未可靠建立份额代码与限购额度的对应关系');
  }
  if (/A类、C类份额合并计算/.test(compact)) {
    const linked=linkedFunds.filter(f=>f.currency==='CNY' && /[AC](?:人民币)?$/.test(f.name));
    const matches=[...compact.matchAll(/((?:直销|代销)渠道)[^。；]{0,180}?累计金额限制(?:仍|调整)?为([\d,.]+)元/g)];
    if (linked.length && matches.length===2 && new Set(matches.map(m=>m[1])).size===2) {
      parsed.limits=matches.map(m=>({scope:m[1]==='直销渠道'?'specific-channel':'sales-agency',channels:[m[1]==='直销渠道'?'基金公司直销':'代销机构'],
        perShareLimits:Object.fromEntries(linked.map(f=>[f.code,{amount:Number(m[2].replaceAll(',','')),currency:'CNY'}]))}));
      parsed.shareCodes=[...new Set([...parsed.shareCodes,...linked.map(f=>f.code)])];
      parsed.parseWarnings=parsed.parseWarnings.filter(w=>w!=='未可靠建立份额代码与限购额度的对应关系');
      parsed.shareCodeSource='body-main-code-and-matching-disclosure-index';
    }
  }
  if (!parsed.announcementDate && /^\d{4}-\d{2}-\d{2}$/.test(indexedDate || '')) {
    parsed.announcementDate = indexedDate; parsed.announcementDateSource = 'disclosure-index';
    parsed.parseWarnings = parsed.parseWarnings.filter(w => w !== '未可靠提取公告日期');
    parsed.parsed = parsed.parseWarnings.length === 0;
  }
  if (!parsed.effectiveDate && /继续暂停/.test(compact) && /^\d{4}-\d{2}-\d{2}$/.test(indexedDate || '')) {
    parsed.effectiveDate=indexedDate; parsed.effectiveDateSource='continuing-status-index-date';
  }
  const daily = /单日(?:单个|每个)基金账户|单个开放日每个基金账户|单个基金账户[^。；]{0,100}单日(?:累计|申购)|单个投资者[^。；]{0,80}单日累计/.test(compact);
  if (daily) parsed.accountBasis = /分别计算|单独计算|各类别|单个份额类别|单个基金份额/.test(compact)
    ? 'single-fund-account-daily-cumulative-per-share' : 'single-fund-account-daily-cumulative';
  if (daily && /份额合并计算/.test(compact)) parsed.accountBasis='single-fund-account-daily-cumulative-combined-shares';
  parsed.parsed=parsed.parseWarnings.length===0;
  parsed.reviewVersion = VERSION;
  parsed.requiresQuota = /业务限额|累计[^。；]{0,100}(?:限额|不得超过|不应超过)|限制申购金额[^。；]{0,80}\d/.test(compact);
  return parsed;
}

export async function reviewRules(rows, funds, scope, cache, { force = false } = {}) {
  const path = cache + '/reviewed-pdf-text.json';
  const stored = await readFile(path, 'utf8').then(JSON.parse).catch(() => ({}));
  const tasks = new Map();
  const linkedById = new Map();
  const selectedByCode = new Map();
  for (const fund of funds.filter(f => scope.has(f.code))) {
    const row = rows.get(fund.code);
    const notice = row?.officialNotice;
    const candidates = new Map((notice?.events || []).map(e => [e.id, e]));
    // Include the newest quota notice even when upstream parsing failed.
    for (const n of (fund.latestNotices || []).slice(0, 2)) if (!candidates.has(n.id)) {
      const category = /恢复/.test(n.title) ? 'resume' : /暂停.*申购/.test(n.title) && !/大额|限额|上限/.test(n.title) ? 'full-suspend' : 'limit';
      candidates.set(n.id, { ...n, category, source: '公开公告索引' });
    }
    const selected = new Set([...candidates.keys()].slice(0, 2));
    for (const n of (fund.latestNotices || []).slice(0,2)) selected.add(n.id);
    const timeline = notice ? reviewedTimeline(notice) : null;
    // Review the current and future channel rules, not just the top PDF.
    const evidence = row ? announcementEvidence({ ...row, officialNoticeError: null }, row.queriedAt) : null;
    for (const rule of [evidence?.agency, evidence?.direct, ...(evidence?.pending || [])]) if (rule?.noticeId) selected.add(rule.noticeId);
    // Older direct/agency rules can coexist with a newer channel-specific notice.
    const scopes = new Set();
    for (const rule of timeline?.limits || []) {
      if (!rule.perShareLimits?.[fund.code] && !rule.perShareStatuses?.[fund.code]) continue;
      const key = rule.scope + ':' + (rule.channels || []).join(',');
      if (!scopes.has(key)) { scopes.add(key); if (rule.noticeId) selected.add(rule.noticeId); }
    }
    const events = [...selected].map(id => candidates.get(id)).filter(Boolean);
    selectedByCode.set(fund.code, events);
    for (const event of events) {
      tasks.set(event.id, event);
      linkedById.set(event.id,[...(linkedById.get(event.id)||[]),fund]);
    }
  }
  const results = new Map();
  const queue = [...tasks.values()]; let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < queue.length) {
      const event = queue[cursor++];
      try {
        if (!/^https:\/\/pdf\.dfcfw\.com\/pdf\/H2_AN\d+_1\.pdf$/.test(event.url || '')) throw new Error('正文来源不在披露镜像白名单');
        let text = stored[event.id]?.version === VERSION ? stored[event.id].text : null;
        if (!text || force) {
          const { stdout } = await run('curl', ['--ipv4','--http1.1','--fail','--location','--silent','--show-error','--connect-timeout','6','--max-time','16',event.url], { encoding:'buffer', maxBuffer:9*1024*1024 });
          text = await extractPdfText(stdout);
          stored[event.id] = { version: VERSION, text, downloadedAt: new Date().toISOString() };
        }
        const parsed = parseReviewedText(text, event.date, linkedById.get(event.id));
        const titleClasses=[...event.title.matchAll(/([A-Z])类(?:基金)?份额/g)].map(m=>m[1]);
        if (event.category==='full-suspend' && titleClasses.length) {
          const block=text.replace(/\s/g,'').match(/下属分级基金的(?:基金)?简称(.*?)下属分级基金的交易代码/);
          const classes=[...(block?.[1] || '').matchAll(/QDII(?:[-－](?:FOF|LOF))?[）)]([A-Z])/g)].map(m=>m[1]);
          if (classes.length===parsed.shareCodes.length) parsed.shareCodes=parsed.shareCodes.filter((code,i)=>titleClasses.includes(classes[i]));
          else if (parsed.shareCodes.length!==1 || titleClasses.length!==1) throw new Error('部分份额暂停公告无法可靠映射类别');
        }
        results.set(event.id, { ...event, parsed });
      } catch (e) { results.set(event.id, { ...event, reviewError: '公告正文复核失败：' + String(e.message).slice(0, 120) }); }
    }
  }));
  await mkdir(cache, { recursive: true });
  await writeFile(path, JSON.stringify(stored));
  for (const fund of funds.filter(f => scope.has(f.code))) {
    const old = rows.get(fund.code);
    const reviewed = (selectedByCode.get(fund.code) || []).map(e => results.get(e.id));
    const newestPause = reviewed.filter(e=>e.category==='full-suspend' && e.parsed?.effectiveDate && e.parsed.shareCodes?.includes(fund.code)
      && !e.parsed.requiresQuota && e.parsed.effectiveDate<=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}))
      .map(e=>e.parsed.effectiveDate).sort().at(-1);
    const failures = reviewed.filter(e => !(newestPause && (e.parsed?.effectiveDate || e.date) < newestPause) && (e.reviewError || (!e.parsed?.parsed &&
      (!['full-suspend','resume'].includes(e.category) || e.parsed?.requiresQuota || !e.parsed?.effectiveDate || !e.parsed?.shareCodes?.length))));
    const events = new Map((old?.officialNotice?.events || []).map(e => [e.id,e]));
    for (const e of reviewed) if (!e.reviewError) events.set(e.id,e);
    const notice = buildOfficialTimelineNotice([...events.values()]);
    const sourceChecks = old?.officialNotice?.sourceChecks;
    // Source failures stay failures. Successful body review can replace a parser
    // failure, but cannot manufacture a successful notice-index fetch.
    const indexFresh = fund.noticeCheckedAt && Date.now() - Date.parse(fund.noticeCheckedAt) <= 90*60000;
    rows.set(fund.code, { ...old, code: fund.code,
      queriedAt: indexFresh && !failures.length ? new Date().toISOString() : old?.queriedAt,
      officialNotice: notice ? { ...notice, sourceChecks, bodyReview: { checkedAt: new Date().toISOString(), noticeIds: reviewed.map(e=>e.id), failures: failures.map(e=>e.id) } } : null,
      officialNoticeError: failures.length ? '公告正文或渠道对应关系未能可靠复核' : !indexFresh ? '最新公告索引未成功核验' : !notice ? '未取得可靠公告时间线' : null });
  }
  return { count: tasks.size, failed: [...results.values()].filter(e=>e.reviewError).length, checkedAt: new Date().toISOString() };
}
