import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { setDefaultResultOrder } from 'node:dns';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
setDefaultResultOrder('ipv4first');
const runFile = promisify(execFile);

const root = existsSync('app.js') ? '' : 'dist/';
const outputPath = root + 'qdii-limits.json';
const endpoint = 'https://fund.eastmoney.com/Data/Fund_JJJZ_Data.aspx?t=8&page=1,50000&js=reData&sort=fcode,asc';
const headers = { Referer: 'https://fund.eastmoney.com/Fund_sgzt_bzdm.html', 'User-Agent': 'Mozilla/5.0 personal-investment-dashboard/1.0' };
async function fetchText(url) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  } catch {
    // Some cloud runners cannot reach these hosts via Node's selected route.
    const { stdout } = await runFile('curl', ['--ipv4', '--http1.1', '--location', '--fail', '--silent', '--show-error', '--connect-timeout', '8', '--max-time', '25', '--retry', '1', '--retry-delay', '1', '-A', headers['User-Agent'], '-e', headers.Referer, url], { maxBuffer: 15 * 1024 * 1024 });
    return stdout;
  }
}
function contextFromHtml(html) {
  const marker = /window\.context\s*=\s*/g.exec(html);
  if (!marker) throw new Error('Ant Fund context missing');
  const start = marker.index + marker[0].length;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error('Ant Fund context incomplete');
}
const previous = JSON.parse(await readFile(outputPath, 'utf8').catch(() => 'null'));
const before = new Map((previous?.funds || []).map(f => [f.code, f]));
const app = await readFile(root + 'app.js', 'utf8');
const codeMap = JSON.parse(app.match(/const knownFundCodes = (\{[\s\S]*?\n\});/)[1].replace(/,\s*}/g, '}'));
const snapshot = JSON.parse((await readFile(root + 'portfolio-data.js', 'utf8')).replace(/^\s*window\.portfolioSnapshot\s*=\s*/, '').replace(/;\s*$/, ''));
const heldCodes = new Set(snapshot['持仓'].map(f => f['基金代码'] || codeMap[f['基金名称']]).filter(Boolean));
const errors = [];
let universeCheckedAt = previous?.universeCheckedAt || (previous?.schemaVersion >= 2 ? previous.updatedAt : null);
let sourceDates = previous?.sourceDataDates || [];
let allRows = null;
const catalogRecent = universeCheckedAt && Date.now() - new Date(universeCheckedAt).getTime() < 24 * 60 * 60 * 1000;
if (!catalogRecent || [...heldCodes].some(code => !before.has(code))) {
  try {
    const sourceText = await fetchText(endpoint);
    allRows = JSON.parse(sourceText.slice(sourceText.indexOf('datas:') + 6, sourceText.lastIndexOf(',record:')));
    if (!Array.isArray(allRows) || allRows.length < 20000) throw new Error('Fund universe incomplete');
    sourceDates = JSON.parse(sourceText.match(/showday:(\[[^\]]+\])/)?.[1] || '[]');
    universeCheckedAt = new Date().toISOString();
  } catch (error) {
    if (!previous?.funds?.length || previous.schemaVersion < 2) throw error;
    allRows = null;
    errors.push({ source: 'fund-universe', message: String(error.message) });
  }
}
const funds = allRows ? allRows.filter(r => /^\d{6}$/.test(r[0]) && (heldCodes.has(r[0]) || /纳斯达克\s*100|纳指\s*100|标普\s*500|标准普尔\s*500/.test(r[1]))).map(r => {
  const [code, name, type, , , status, , , , rawQuota] = r;
  const category = /纳斯达克\s*100|纳指\s*100/.test(name) ? 'nasdaq100' : /标普\s*500|标准普尔\s*500/.test(name) ? 'sp500' : 'held';
  const currency = /美元|美汇|美钞|现汇|现钞/.test(name) ? 'USD' : 'CNY';
  const exchangeOnly = status === '场内交易' || (/^(15|51|52|56|58)/.test(code) && /ETF/.test(name) && !/联接/.test(name));
  const quota = Number(rawQuota);
  return { code, name, type, category, held: heldCodes.has(code), currency, exchangeOnly, status: status || '未知', quotaCny: currency === 'CNY' && status === '限大额' && Number.isFinite(quota) && quota > 0 && quota < 1e10 ? quota : null, sourceUrl: 'https://fundf10.eastmoney.com/jjfl_' + code + '.html', announcementUrl: 'https://fundf10.eastmoney.com/jjgg_' + code + '.html' };
}) : previous.funds.filter(f => f.category !== 'held' || heldCodes.has(f.code)).map(f => ({ ...f, held: heldCodes.has(f.code) }));
if (funds.filter(f => f.category === 'nasdaq100').length < 30 || funds.filter(f => f.category === 'sp500').length < 10) throw new Error('Index universe incomplete');
async function collect(fund) {
  const old = before.get(fund.code);
  if (!fund.exchangeOnly && fund.currency === 'CNY') {
    const url = 'https://www.fund123.cn/matiaria?fundCode=' + fund.code;
    try {
      const data = contextFromHtml(await fetchText(url));
      const brief = data.materialInfo?.fundBrief;
      if (!data.success || brief?.fundCode !== fund.code || !brief.saleStatus) throw new Error('Ant Fund record unavailable');
      fund.alipay = { status: brief.saleStatus, minimumCny: /^\d+(\.\d+)?$/.test(brief.purchaseMinMount) ? Number(brief.purchaseMinMount) : null, quotaCny: null, checkedAt: new Date().toISOString(), sourceUrl: url, stale: false };
      // fundLimit=0-- and purchaseRatio=-- are placeholders, not purchase caps.
    } catch (e) {
      fund.alipay = old?.alipay ? { ...old.alipay, stale: true } : { status: '未取得', quotaCny: null, checkedAt: null, sourceUrl: url, stale: true };
      errors.push({ code: fund.code, source: 'antfund', message: String(e.message) });
    }
  }
  const oldCheck = old?.noticeCheckedAt && new Date(old.noticeCheckedAt).getTime();
  fund.noticeSchemaVersion = 2;
  if (old?.noticeSchemaVersion === 2 && oldCheck && Date.now() - oldCheck < 60 * 60 * 1000) { fund.latestNotices = old.latestNotices; fund.noticeCheckedAt = old.noticeCheckedAt; return; }
  try {
    const url = 'https://api.fund.eastmoney.com/f10/JJGG?fundcode=' + fund.code + '&pageIndex=1&pageSize=100&type=0';
    const notices = JSON.parse(await fetchText(url));
    if (!Array.isArray(notices.Data)) throw new Error('Notice list unavailable');
    fund.latestNotices = notices.Data.filter(n => /申购|定期定额|规模上限/.test(n.TITLE) && !/增加|销售机构|节假|休市|境外主要|费率|招募|合同|分红|\d{4}年\d+月\d+日暂停/.test(n.TITLE)).slice(0, 10).map(n => ({ title: n.TITLE, date: n.PUBLISHDATEDesc || n.PUBLISHDATE.slice(0, 10), id: n.ID, url: 'https://pdf.dfcfw.com/pdf/H2_' + n.ID + '_1.pdf' }));
    fund.noticeCheckedAt = new Date().toISOString();
  } catch (e) { fund.latestNotices = old?.latestNotices || []; fund.noticeCheckedAt = old?.noticeCheckedAt || null; errors.push({ code: fund.code, source: 'announcements', message: String(e.message) }); }
}
let cursor = 0;
await Promise.all(Array.from({ length: 3 }, async () => { while (cursor < funds.length) { const f = funds[cursor++]; await collect(f); } }));
const counts = Object.fromEntries(['nasdaq100', 'sp500', 'held'].map(c => [c, funds.filter(f => f.category === c).length]));
const payload = { status: 'available', schemaVersion: 2, updatedAt: new Date().toISOString(), sourceDataDates: sourceDates, source: '蚂蚁基金公开在售状态＋基金公告索引＋天天基金参考', sourceUrl: endpoint, scope: '大陆公募：已有持仓与全部名称匹配纳斯达克100/标普500的份额；人民币场外默认显示，美元与场内可展开。', counts, heldCount: heldCodes.size, missingHeldCodes: [...heldCodes].filter(c => !funds.some(f => f.code === c)), funds, errors, changes: funds.filter(f => before.has(f.code) && (before.get(f.code).status !== f.status || before.get(f.code).alipay?.status !== f.alipay?.status)).map(f => ({ code: f.code, status: f.status, alipay: f.alipay?.status })).slice(0, 100) };
payload.universeCheckedAt = universeCheckedAt;
payload.catalogStale = !universeCheckedAt || Date.now() - new Date(universeCheckedAt).getTime() > 24 * 60 * 60 * 1000;
await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ outputPath, counts, antSuccess: funds.filter(f => f.alipay && !f.alipay.stale).length, errors: errors.length, missingHeldCodes: payload.missingHeldCodes }));
