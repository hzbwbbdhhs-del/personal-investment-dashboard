import { writeFile } from "node:fs/promises";

const series = {
  NDX: ["NASDAQ100", "纳斯达克100"],
  SPX: ["SP500", "标普500"],
  VIX: ["VIXCLS", "VIX"],
  VXN: ["VXNCLS", "VXN"],
  US10Y: ["DGS10", "美国10年期国债收益率"],
  USDCNY: ["DEXCHUS", "USD/CNY"],
};
const macroSeries = {
  FEDFUNDS: ["DFF", "联邦基金有效利率"],
  CPI: ["CPIAUCSL", "CPI"],
  PCE: ["PCEPI", "PCE"],
  UNRATE: ["UNRATE", "失业率"],
  PAYEMS: ["PAYEMS", "非农就业"],
};
function emptyMetric(label, source) {
  return { label, value: null, changePct: null, drawdownPct: null, peak: null, updatedAt: null, source, status: "error" };
}
function parseRows(text) {
  return text.trim().split(String.fromCharCode(10)).slice(1).map((line) => {
    const [date, raw] = line.split(",");
    const value = Number(raw);
    return [date, Number.isFinite(value) ? value : null];
  }).filter(([date]) => date);
}
function metricFromRows(rows, label, source) {
  const valid = rows.filter(([, value]) => value !== null);
  const item = emptyMetric(label, source);
  if (!valid.length) return item;
  const [updatedAt, value] = valid[valid.length - 1];
  const previous = valid.length > 1 ? valid[valid.length - 2][1] : null;
  const peak = Math.max(...valid.map(([, current]) => current));
  item.value = value;
  item.changePct = previous ? (value - previous) / previous * 100 : null;
  item.drawdownPct = peak ? (value / peak - 1) * 100 : null;
  item.peak = peak;
  item.updatedAt = updatedAt;
  item.status = "daily";
  return item;
}
async function loadSeries(seriesId, label) {
  const source = "FRED公开CSV:" + seriesId;
  try {
    const response = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + seriesId);
    if (!response.ok) throw new Error("FRED " + response.status);
    return metricFromRows(parseRows(await response.text()), label, source);
  } catch (error) {
    console.warn("Unable to load " + seriesId + ": " + error.message);
    return emptyMetric(label, source);
  }
}
function marketTemperature(market) {
  const ndx = market.NDX || {};
  const vix = market.VIX || {};
  const vxn = market.VXN || {};
  if (ndx.drawdownPct == null) return { status: "needs_config", band: null, label: "等待数据", action: "接入纳指历史数据后自动判档", reasons: [] };
  const drawdown = Math.max(0, -(ndx.drawdownPct || 0));
  const vixValue = vix.value;
  const vxnValue = vxn.value;
  let severity = 0;
  if (drawdown >= 20 || vixValue >= 35 || vxnValue >= 40) severity = 4;
  else if (drawdown >= 15 || vixValue >= 30 || vxnValue >= 35) severity = 3;
  else if (drawdown >= 10 || vixValue >= 25 || vxnValue >= 30) severity = 2;
  else if (drawdown >= 5 || vixValue >= 20 || vxnValue >= 25) severity = 1;
  const bands = [["正常", "维持原定投，不追涨", "green"], ["略加", "在原计划上小幅加码", "yellow"], ["提高", "提高投入，但分批执行", "orange"], ["加倍", "按计划加倍，仍分批执行", "coral"], ["明显加仓", "出现明显回撤，可考虑明显加仓", "red"]];
  const [label, action, color] = bands[severity];
  const reasons = ["NDX 从历史高点回撤 " + drawdown.toFixed(2) + "%"];
  if (vixValue != null && vixValue >= 25) reasons.push("VIX " + vixValue.toFixed(2) + "，高于 25 阈值");
  if (vxnValue != null && vxnValue >= 30) reasons.push("VXN " + vxnValue.toFixed(2) + "，高于 30 阈值");
  const dates = [ndx, vix, vxn].map((item) => item.updatedAt).filter(Boolean).sort();
  return { status: "daily", band: severity, label, action, color, drawdownPct: -drawdown, reasons, updatedAt: dates.length ? dates[dates.length - 1] : null };
}
const market = Object.fromEntries(await Promise.all(Object.entries(series).map(async ([key, [id, label]]) => [key, await loadSeries(id, label)])));
const macro = Object.fromEntries(await Promise.all(Object.entries(macroSeries).map(async ([key, [id, label]]) => [key, await loadSeries(id, label)])));
macro.US10Y = market.US10Y;
const allMetrics = [...Object.values(market), ...Object.values(macro)];
const payload = {
  status: allMetrics.some((item) => item.status === "daily") ? "daily" : "error",
  updatedAt: new Date().toISOString(),
  market,
  macro,
  temperature: marketTemperature(market),
  refreshSeconds: 1800,
  source: "FRED公开CSV（无API Key）",
};
await writeFile("market-data.json", JSON.stringify(payload, null, 2) + String.fromCharCode(10), "utf8");
console.log("Wrote market-data.json (" + payload.status + ")");
