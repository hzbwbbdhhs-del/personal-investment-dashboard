import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const endpoint = "https://fund.eastmoney.com/Data/Fund_JJJZ_Data.aspx?t=8&page=1,50000&js=reData&sort=fcode,asc";
const outputPath = existsSync("app.js") ? "qdii-limits.json" : "dist/qdii-limits.json";
const response = await fetch(endpoint, {
  headers: {
    Referer: "https://fund.eastmoney.com/Fund_sgzt_bzdm.html",
    "User-Agent": "Mozilla/5.0 personal-investment-dashboard/1.0",
  },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`QDII source returned HTTP ${response.status}`);
const sourceText = await response.text();
const dataStart = sourceText.indexOf("datas:");
const dataEnd = sourceText.lastIndexOf(",record:");
if (dataStart < 0 || dataEnd < dataStart) throw new Error("QDII source shape changed");
const allRows = JSON.parse(sourceText.slice(dataStart + 6, dataEnd));
if (!Array.isArray(allRows) || allRows.length < 20000) throw new Error(`Unexpected source coverage: ${allRows?.length}`);
const sourceDates = JSON.parse(sourceText.match(/showday:(\[[^\]]+\])/)?.[1] || "[]");

function categoryFor(name, type) {
  if (/纳斯达克\s*100|纳指\s*100/.test(name)) return "nasdaq100";
  if (/标普\s*500|标准普尔\s*500/.test(name)) return "sp500";
  if (type.startsWith("QDII-") && /股票|混合/.test(type) && !/指数|ETF/.test(name)) return "active";
  return null;
}

function quotaFor(status, raw) {
  if (status === "暂停申购" || status === "封闭期") return null;
  if (status === "开放申购") return null;
  if (status !== "限大额") return null;
  const quota = Number(raw);
  return Number.isFinite(quota) && quota >= 0 && quota < 1e10 ? quota : null;
}

const funds = [];
for (const row of allRows) {
  if (!Array.isArray(row) || row.length < 10) continue;
  const [code, name, type, , , status, , , , rawQuota] = row;
  if (!/^\d{6}$/.test(code) || !name || !type) continue;
  if (/美元|现汇|现钞|港币/.test(name)) continue;
  if (status === "场内交易") continue;
  const category = categoryFor(name, type);
  if (!category) continue;
  funds.push({
    code,
    name,
    category,
    status: status || "未知",
    quotaCny: quotaFor(status, rawQuota),
    sourceUrl: `https://fundf10.eastmoney.com/jjfl_${code}.html`,
    announcementUrl: `https://fundf10.eastmoney.com/jjgg_${code}.html`,
  });
}

const counts = Object.fromEntries(["nasdaq100", "sp500", "active"].map((category) => [category, funds.filter((fund) => fund.category === category).length]));
if (counts.nasdaq100 < 20 || counts.sp500 < 8 || counts.active < 80) throw new Error(`Unexpected QDII classification: ${JSON.stringify(counts)}`);

const previous = JSON.parse(await readFile(outputPath, "utf8").catch(() => "null"));
const before = new Map((previous?.funds || []).map((fund) => [fund.code, fund]));
const changes = funds.filter((fund) => {
  const prior = before.get(fund.code);
  return prior && (prior.status !== fund.status || prior.quotaCny !== fund.quotaCny);
}).map((fund) => ({ code: fund.code, before: before.get(fund.code), after: fund }));

const payload = {
  status: "available",
  updatedAt: new Date().toISOString(),
  sourceDataDates: sourceDates,
  source: "天天基金公开申购状态表",
  sourceUrl: endpoint,
  channel: "天天基金页面参考；非支付宝、非基金公司直销",
  scope: "人民币场外份额；纳指100、标普500及股票/混合类主动QDII；不含美元份额、场内交易、债券/商品QDII。A/C等份额分别列示。",
  counts,
  funds,
  changes: changes.slice(0, 100),
};
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}: ${funds.length} funds ${JSON.stringify(counts)}; ${changes.length} changed`);
