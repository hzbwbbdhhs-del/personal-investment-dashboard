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
let previousSnapshot = {};
const checkedAt = new Date().toISOString();
try {
  const previous = JSON.parse(await readFile(outputPath, "utf8"));
  previousSnapshot = previous;
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
  for (let attempt = 1; attempt <= 4; attempt += 1) {
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
      const valid = rows.filter((row) => row.DWJZ != null && String(row.DWJZ).trim() !== "" && Number.isFinite(Number(row.DWJZ)) && Number(row.DWJZ) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.FSRQ || '')).sort((a,b) => b.FSRQ.localeCompare(a.FSRQ));
      if (!valid.length) throw new Error(payload?.ErrMsg || "no published NAV rows");
      const latest = valid[0];
      if (previousFunds[code]?.latestDate > latest.FSRQ) throw new Error('source returned older NAV than last successful snapshot');
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
        refreshStatus: "success",
        checkedAt,
        lastSuccessAt: checkedAt,
        firstSeenAt: previousFunds[code]?.latestDate === latest.FSRQ ? previousFunds[code].firstSeenAt || null : checkedAt,
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
      console.warn(`${code} ${name}: attempt ${attempt}/4 failed: ${error.message}${error.cause ? ` (${error.cause.code || error.cause.message || 'network cause unavailable'})` : ''}`);
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  const previous = previousFunds[code];
  if (previous?.status === "available" && previous.latestDate) {
    console.warn(`${code} ${name}: retaining ${previous.latestDate} NAV after failed refresh`);
    return { ...previous, refreshStatus: "failed", checkedAt, lastSuccessAt: previous.lastSuccessAt || previousSnapshot.updatedAt || null, error: "公开净值接口本次检查失败，保留上次成功数据" };
  }
  return { code, name, status: "unavailable", refreshStatus: "failed", checkedAt, lastSuccessAt: null, latestDate: null, nav: null, previousDate: null, previousNav: null, dailyChange: null, dailyChangePct: null, source };
}

const codes = [...namesByCode.keys()];
const funds = {};
for (let offset = 0; offset < codes.length; offset += 4) {
  const batch = await Promise.all(codes.slice(offset, offset + 4).map((code) => fetchFund(code, namesByCode.get(code))));
  for (const fund of batch) funds[fund.code] = fund;
}

const values = Object.values(funds);
const successCount = values.filter(fund => fund.refreshStatus === 'success').length;
const contentOf = entries => JSON.stringify(Object.fromEntries(Object.entries(entries).map(([code, fund]) => {
  const { checkedAt, lastSuccessAt, refreshStatus, error, ...content } = fund;
  return [code, content];
})));
const changed = contentOf(funds) !== contentOf(previousFunds);
const payload = {
  status: Object.values(funds).some((fund) => fund.status === "available") ? "daily" : "error",
  checkedAt,
  updatedAt: changed ? checkedAt : previousSnapshot.updatedAt || checkedAt,
  checkStatus: successCount === values.length ? 'success' : successCount ? 'partial' : 'failed',
  successCount,
  failureCount: values.length - successCount,
  source: "东方财富公开基金历史净值接口",
  note: "日收益率为基金单位净值日变化；未提供份额时，仪表盘按记录持仓市值估算金额。QDII净值可能晚于海外市场交易日公布。",
  count: Object.keys(funds).length,
  funds,
};
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const available = Object.values(funds).filter((fund) => fund.status === "available").length;
console.log(`Wrote ${outputPath}: ${available}/${payload.count} NAVs available; ${successCount} checks succeeded, ${payload.failureCount} failed; content changed=${changed}`);
if (payload.failureCount && process.env.GITHUB_ACTIONS) console.log(`::warning::${payload.failureCount}/${payload.count} fund checks failed. Previous NAVs retained; see fund-data.json for individual status.`);
