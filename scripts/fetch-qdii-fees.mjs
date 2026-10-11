import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { extractPdfText } = require('../vendor/qdii-purchase-limits/scripts/lib/official-pdf.js');
const root = existsSync('app.js') ? '' : 'dist/';
const catalog = JSON.parse(await readFile(root + 'qdii-limits.json', 'utf8'));
let old = {};
try { old = JSON.parse(await readFile(root + 'qdii-fees.json', 'utf8')).funds || {}; } catch {}
const funds = {};
const headers = { Referer: 'https://fundf10.eastmoney.com/', 'User-Agent': 'Mozilla/5.0 investment-dashboard/1.0' };
async function get(url, binary = false) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}
function rate(text, label) {
  const normalized = text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2');
  const found = normalized.match(new RegExp(label + '[^%]{0,100}?([0-9]+(?:\\.[0-9]+)?)\\s*%'));
  const value = found ? Number(found[1]) : null;
  return value != null && value >= 0 && value <= 5 ? value : null;
}
async function collect(fund) {
  const checkedAt = new Date().toISOString();
  try {
    const indexUrl = `https://api.fund.eastmoney.com/f10/JJGG?fundcode=${fund.code}&pageIndex=1&pageSize=100&type=0`;
    const notices = (await get(indexUrl)).Data || [];
    const doc = notices.find(row => /产品资料概要/.test(row.TITLE));
    if (!doc) throw new Error('最新公告索引内没有产品资料概要');
    const documentDate = doc.PUBLISHDATEDesc || doc.PUBLISHDATE?.slice(0, 10);
    const sourceUrl = `https://pdf.dfcfw.com/pdf/H2_${doc.ID}_1.pdf`;
    const text = await extractPdfText(await get(sourceUrl, true));
    if (!text.includes(fund.code)) throw new Error('概要未找到对应份额代码');
    const section = text.slice(text.search(/基金运作相关费用/));
    if (!section || !/基金运作综合费率/.test(section)) throw new Error('没有可比较的综合运作费率');
    const operatingPct = rate(section, '基金运作综合费率');
    if (operatingPct == null || operatingPct > 5) throw new Error('综合费率解析失败');
    const newerFeeNotice = notices.find(row => (row.PUBLISHDATEDesc || row.PUBLISHDATE?.slice(0, 10)) > documentDate && /降低.*费|调整.*费率|变更.*费率/.test(row.TITLE));
    const value = { code: fund.code, name: fund.name, checkedAt, documentDate, sourceUrl, title: doc.TITLE,
      indexUrl, operatingPct, managementPct: rate(section, '管理费'), custodyPct: rate(section, '托管费'),
      salesPct: rate(section, '销售服务费'), status: newerFeeNotice ? 'needs-review' : 'available',
      warning: newerFeeNotice ? '有晚于概要的费率公告，暂不排名' : null,
      basis: '基金公司产品资料概要（披露镜像）；年化综合运作费率含历史其他费用测算，不含申赎交易费用。联接基金不重复加目标ETF费率。' };
    try {
      const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fund.code}&pageIndex=1&pageSize=20`;
      const latestRows = (await get(navUrl)).Data?.LSJZList || [];
      const lastDate = latestRows[0]?.FSRQ;
      if (!lastDate) throw new Error('没有取得最新净值');
      const target = new Date(lastDate+'T00:00:00Z'); target.setUTCFullYear(target.getUTCFullYear()-1);
      const startDate = new Date(target.getTime()-14*86400000).toISOString().slice(0,10);
      const endpointUrl = navUrl + '&startDate='+startDate+'&endDate='+target.toISOString().slice(0,10);
      const baselineRows = (await get(endpointUrl)).Data?.LSJZList || [];
      const rows = [...latestRows,...baselineRows].filter(row => Number(row.DWJZ) > 0 && row.FSRQ).sort((a,b) => b.FSRQ.localeCompare(a.FSRQ));
      if (!rows.length) throw new Error('没有取得历史净值');
      // Unit-NAV returns are comparable only if the NAV/accumulated-NAV gap did not change.
      const yearStart = new Date(rows[0].FSRQ + 'T00:00:00Z'); yearStart.setUTCFullYear(yearStart.getUTCFullYear()-1);
      const minimum = new Date(yearStart.getTime()-14*86400000).toISOString().slice(0,10);
      const annualRows = rows.filter(row=>row.FSRQ>=minimum);
      const gap = Number(annualRows.at(-1)?.LJJZ) - Number(annualRows.at(-1)?.DWJZ);
      value.navDistributionChanged = annualRows.some(row=>!Number(row.LJJZ)||Math.abs(Number(row.LJJZ)-Number(row.DWJZ)-gap)>0.0002);
      // Endpoint NAV change only, not a dividend-reinvested or total-return measurement.
      value.navBasis = '同日期单位净值涨幅（非复权）；不等于含分红总回报，不参与推荐排名。';
      value.nav = rows.filter((row,i)=>i<5 || row.FSRQ>=minimum && row.FSRQ<=yearStart.toISOString().slice(0,10)).map(row => ({ date: row.FSRQ, value: Number(row.DWJZ), accumulated: Number(row.LJJZ) || null }));
      value.navCheckedAt = new Date().toISOString();
      value.navSourceUrl = navUrl;
      value.navBaselineSourceUrl = endpointUrl;
    } catch (error) { value.navError = error.message; }
    return value;
  } catch (error) {
    return { ...(old[fund.code] || { code: fund.code, name: fund.name }), status: 'unverified', error: error.message, lastAttemptAt: checkedAt };
  }
}
const selected = catalog.funds.filter(f => ['nasdaq100','sp500'].includes(f.category) && f.currency === 'CNY' && !f.exchangeOnly);
for (let offset = 0; offset < selected.length; offset += 4) {
  const batch = await Promise.all(selected.slice(offset, offset + 4).map(collect));
  batch.forEach(f => { funds[f.code] = f; });
  console.log(`${Math.min(offset + 4, selected.length)}/${selected.length} researched; valid ${Object.values(funds).filter(f=>f.status==='available').length}`);
}
await writeFile(root + 'qdii-fees.json', JSON.stringify({ schemaVersion: 1, checkedAt: new Date().toISOString(), funds }, null, 2) + '\n');
