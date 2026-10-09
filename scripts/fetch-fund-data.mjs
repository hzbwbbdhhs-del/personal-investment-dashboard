import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const appPath = existsSync("app.js") ? "app.js" : "dist/app.js";
const portfolioPath = existsSync("portfolio-data.js") ? "portfolio-data.js" : "dist/portfolio-data.js";
const outputPath = existsSync("app.js") ? "fund-data.json" : "dist/fund-data.json";
const appSource = await readFile(appPath, "utf8");
const portfolioSource = await readFile(portfolioPath, "utf8");
const mapSource = appSource.match(/const knownFundCodes\s*=\s*\{([\s\S]*?)\n\};/)?.[1];
if (!mapSource) throw new Error(`Could not find knownFundCodes in ${appPath}`);
const codeByName = Object.fromEntries(
  [...mapSource.matchAll(/^\s*"([^"]+)"\s*:\s*"(\d{6})",?\s*$/gm)].map((match) => [match[1], match[2]]),
);
const jsonSource = portfolioSource
  .replace(/^\s*window\.portfolioSnapshot\s*=\s*/, "")
  .replace(/;\s*$/, "");
const portfolio = JSON.parse(jsonSource);
let previousFunds = {};
try {
  const previous = JSON.parse(await readFile(outputPath, "utf8"));
  previousFunds = previous.funds || {};
} catch {
  // The first run has no previous snapshot to retain.
}
const namesByCode = new Map();
const referenceDates = new Set();
for (const record of portfolio["持仓"] || []) {
  const code = codeByName[record["基金名称"]] || record["基金代码"];
  if (!/^\d{6}$/.test(code || "")) continue;
  namesByCode.set(code, record["基金名称"] || code);
  if (/^\d{4}-\d{2}-\d{2}$/.test(record["数据日期"] || "")) referenceDates.add(record["数据日期"]);
}

async function fetchFund(code, name) {
  const source = `https://fund.eastmoney.com/${code}.html`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const url = new URL("https://api.fund.eastmoney.com/f10/lsjz");
      url.search = new URLSearchParams({ fundCode: code, pageIndex: "1", pageSize: "30" }).toString();
      const response = await fetch(url, {
        headers: {
          Referer: "https://fund.eastmoney.com/",
          "User-Agent": "Mozilla/5.0 personal-investment-dashboard/1.0",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = payload?.Data?.LSJZList || [];
      const valid = rows.filter((row) => row.DWJZ != null && String(row.DWJZ).trim() !== "" && Number.isFinite(Number(row.DWJZ)) && row.FSRQ);
      if (!valid.length) throw new Error(payload?.ErrMsg || "no published NAV rows");
      const latest = valid[0];
      const previous = valid.find((row) => row.FSRQ !== latest.FSRQ);
      const nav = Number(latest.DWJZ);
      const previousNav = previous ? Number(previous.DWJZ) : null;
      const reportedChange = String(latest.JZZZL ?? "").trim();
      const dailyChangePct = reportedChange !== "" && Number.isFinite(Number(reportedChange))
        ? Number(latest.JZZZL)
        : previousNav ? (nav / previousNav - 1) * 100 : null;
      const referenceNavs = { ...(previousFunds[code]?.referenceNavs || {}) };
      for (const date of referenceDates) {
        if (referenceNavs[date]) continue;
        const baseline = valid.find((row) => row.FSRQ <= date);
        if (baseline) referenceNavs[date] = { date: baseline.FSRQ, nav: Number(baseline.DWJZ) };
      }
      return {
        code,
        name,
        status: "available",
        latestDate: latest.FSRQ,
        nav,
        previousDate: previous?.FSRQ || null,
        previousNav,
        dailyChange: previousNav == null ? null : Number((nav - previousNav).toFixed(8)),
        dailyChangePct: Number.isFinite(dailyChangePct) ? dailyChangePct : null,
        referenceNavs,
        source,
      };
    } catch (error) {
      console.warn(`${code} ${name}: attempt ${attempt}/3 failed: ${error.message}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  const previous = previousFunds[code];
  if (previous?.status === "available" && previous.latestDate) {
    console.warn(`${code} ${name}: retaining ${previous.latestDate} NAV after failed refresh`);
    return previous;
  }
  return { code, name, status: "unavailable", latestDate: null, nav: null, previousDate: null, previousNav: null, dailyChange: null, dailyChangePct: null, source };
}

const codes = [...namesByCode.keys()];
const funds = {};
for (let offset = 0; offset < codes.length; offset += 8) {
  const batch = await Promise.all(codes.slice(offset, offset + 8).map((code) => fetchFund(code, namesByCode.get(code))));
  for (const fund of batch) funds[fund.code] = fund;
}

const payload = {
  status: Object.values(funds).some((fund) => fund.status === "available") ? "daily" : "error",
  updatedAt: new Date().toISOString(),
  source: "东方财富公开基金历史净值接口",
  note: "日收益率为基金单位净值日变化；未提供份额时，仪表盘按记录持仓市值估算金额。QDII净值可能晚于海外市场交易日公布。",
  count: Object.keys(funds).length,
  funds,
};
if (JSON.stringify(funds) === JSON.stringify(previousFunds)) {
  console.log(`No new fund NAVs; ${Object.values(funds).filter((fund) => fund.status === "available").length}/${payload.count} remain available`);
  process.exit(0);
}
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const available = Object.values(funds).filter((fund) => fund.status === "available").length;
console.log(`Wrote ${outputPath}: ${available}/${payload.count} fund NAVs available`);
