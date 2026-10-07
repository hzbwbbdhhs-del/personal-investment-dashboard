const fallbackHoldings = [
  { id: "cash-bond", name: "债券 / 现金组合", code: "待补充", category: "债券 / 现金", value: 354982.5, cost: "", shares: "", monthly: "", status: "估算", note: "由总资产约 52.59 万 × 67.5% 推导" },
  { id: "ndx", name: "纳斯达克 100 长期定投", code: "待补充", category: "纳指 100", value: 63108, cost: "", shares: "", monthly: "", status: "待确认", note: "分项比例为初始估算" },
  { id: "spx", name: "标普 500 长期定投", code: "待补充", category: "标普 500", value: 42072, cost: "", shares: "", monthly: "", status: "待确认", note: "分项比例为初始估算" },
  { id: "active-qdii", name: "全球科技 / 半导体主动 QDII", code: "待补充", category: "主动 QDII", value: 52590, cost: "", shares: "", monthly: "", status: "待确认", note: "含部分 A 股科技仓位，具体基金待补充" },
  { id: "other", name: "其他资产", code: "待补充", category: "其他", value: 13147.5, cost: "", shares: "", monthly: "", status: "估算", note: "用于补足总资产估算" },
];

// Public fund-code lookup matched from the imported fund names. Share-class
// suffixes (A/C/E) are kept because the same fund family can have different
// trading codes for each class.
const knownFundCodes = {
  "兴全稳泰债券A": "003949",
  "广发中债7-10年国开行债券指数A": "003376",
  "易方达全球成长精选混合(QDII)C": "012922",
  "易方达增强回报债券A": "110017",
  "中银国有企业债券A": "001235",
  "广发景秀纯债债券A": "006670",
  "易方达全球成长精选混合(QDII)A": "012920",
  "嘉实全球产业升级股票(QDII)C": "017731",
  "嘉实全球产业升级股票(QDII)A": "017730",
  "华夏移动互联灵活配置混合(QDII)": "002891",
  "国富全球科技互联混合(QDII)人民币C": "021842",
  "金信民兴债券A": "004400",
  "建信新兴市场优选混合(QDII)A": "539002",
  "建信新兴市场优选混合(QDII)C": "018147",
  "国富全球科技互联混合(QDII)人民币A": "006373",
  "易方达全球配置混合(QDII)A": "019155",
  "易方达供给改革灵活配置混合": "002910",
  "摩根日本精选股票(QDII)A": "007280",
  "天弘全球高端制造混合(QDII)A": "016664",
  "浦银全球智能科技股票(QDII)C": "014002",
  "浦银全球智能科技股票(QDII)A": "006555",
  "天弘全球高端制造混合(QDII)C": "016665",
  "宝盈纳斯达克100指数(QDII)A": "019736",
  "国泰纳斯达克100指数(QDII)": "160213",
  "易方达成长领先混合C": "026645",
  "景顺长城纳斯达克科技市值加权ETF联接(QDII)A": "017091",
  "汇安鼎利纯债债券A": "006431",
  "大成标普500等权重指数(QDII)C": "008401",
  "大成标普500等权重指数(QDII)A": "096001",
  "宝盈纳斯达克100指数(QDII)C": "019737",
  "天弘标普500(QDII-FOF)C": "007722",
  "天弘标普500(QDII-FOF)A": "007721",
  "景顺长城纳斯达克科技市值加权ETF联接(QDII)E": "019118",
  "景顺长城纳斯达克科技市值加权ETF联接(QDII)C": "017093",
  "建信富时100指数(QDII)A": "539003",
  "天弘纳斯达克100指数(QDII)C": "018044",
  "天弘纳斯达克100指数(QDII)A": "018043",
  "建信纳斯达克100指数C(QDII)": "012752",
  "建信纳斯达克100指数(QDII)A": "539001",
  "摩根标普500指数(QDII)A": "017641",
  "摩根纳斯达克100指数(QDII)C": "019173",
  "摩根纳斯达克100指数(QDII)A": "019172",
  "招商纳斯达克100ETF联接(QDII)C": "019548",
  "大成纳斯达克100ETF联接(QDII)A": "000834",
  "南方纳斯达克100指数(QDII)C": "016453",
  "南方纳斯达克100指数(QDII)A": "016452",
  "大成纳斯达克100ETF联接(QDII)C": "008971",
  "摩根标普500指数(QDII)C": "019305",
  "万家纳斯达克100指数(QDII)A": "019441",
  "汇添富纳斯达克100ETF联接(QDII)C": "018967",
  "汇添富纳斯达克100ETF联接(QDII)A": "018966",
  "万家纳斯达克100指数(QDII)C": "019442",
  "华泰柏瑞纳斯达克100ETF联接(QDII)A": "019524",
  "华泰柏瑞纳斯达克100ETF联接(QDII)C": "019525",
  "广发纳斯达克100ETF联接(QDII)A": "270042",
  "广发纳斯达克100ETF联接(QDII)C": "006479",
  "华安三菱日联日经225ETF联接(QDII)C": "020713",
  "华安三菱日联日经225ETF联接(QDII)A": "020712",
  "招商纳斯达克100ETF联接(QDII)A": "019547",
  "华安纳斯达克100ETF联接(QDII)C": "014978",
  "华安纳斯达克100ETF联接(QDII)A": "040046",
  "建信纳斯达克100指数(QDII)A人民币": "539001",
  "南方纳斯达克100指数发起(QDII)": "016452",
  "广发纳指100ETF联接(QDII)人民币F": "021778",
  "招商纳斯达克100ETF发起式联接(QDII)A": "019547",
  "华安纳斯达克100联接A": "040046",
  "华安纳斯达克100联接C": "014978",
  "招商纳斯达克100ETF发起式联接(QDII)C": "019548",
  "博时标普500联接E": "018738",
};

const categoryNames = ["债券 / 现金", "纳指 100", "标普 500", "主动 QDII", "其他"];

function classifyHolding(name) {
  if (["债券", "国开行", "纯债", "稳泰", "增强回报"].some((word) => name.includes(word))) return "债券 / 现金";
  if (name.includes("纳斯达克") || name.includes("纳指")) return "纳指 100";
  if (name.includes("标普")) return "标普 500";
  if (name.includes("富时100") || name.includes("日经225")) return "其他";
  if (name.includes("QDII") || ["全球", "新兴市场", "移动互联", "高端制造", "日本精选"].some((word) => name.includes(word))) return "主动 QDII";
  return "其他";
}

function importedHoldings() {
  const records = window.portfolioSnapshot?.["持仓"];
  if (!Array.isArray(records) || records.length === 0) return structuredClone(fallbackHoldings);
  return records.map((record, index) => {
    const value = Number(record["持仓金额_元"] || 0);
    const income = record["持有收益_元"];
    return {
      id: `snapshot-${record["渠道"] || "unknown"}-${record["序号"] || index + 1}`,
      name: record["基金名称"] || "未命名基金",
      code: knownFundCodes[record["基金名称"]] || record["基金代码"] || "代码待补充",
      channel: record["渠道"] || "未知渠道",
      date: record["数据日期"] || "",
      category: classifyHolding(record["基金名称"] || ""),
      value,
      cost: record["持有成本_元"] != null ? Number(record["持有成本_元"]) : income == null ? "" : Number((value - Number(income)).toFixed(2)),
      shares: record["持有份額_份"] == null ? "" : Number(record["持有份額_份"]),
      monthly: "",
      status: ["支付宝", "直销"].includes(record["渠道"]) ? "用户已确认" : "待确认",
      note: record["渠道"] === "支付宝"
        ? `支付宝录屏逐帧核对 · ${record["数据日期"] || "日期待补充"} · 持有收益 ${income == null ? "待补充" : formatCurrency(income)}`
        : record["渠道"] === "直销"
          ? `基金公司直销记录 · 用户确认最新持仓 ${record["数据日期"] || "日期待补充"} · 持有收益 ${income == null ? "待补充" : formatCurrency(income)}${record["持有收益日期"] ? `（截至 ${record["持有收益日期"]}）` : ""}${record["昨日收益_元"] == null ? "" : ` · 截图昨日收益 ${formatCurrency(record["昨日收益_元"])}${record["昨日收益日期"] ? `（${record["昨日收益日期"]}）` : "（日期未显示）"}`}`
          : `基金公司直销记录 · ${record["数据日期"] || "日期待补充"} · 持有收益未提供`,
    };
  });
}

const initialHoldings = importedHoldings();

const storageKey = "personal-investment-dashboard-holdings-v2";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let holdings = loadHoldings();

function loadHoldings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(saved)) return structuredClone(initialHoldings);
    const importedById = new Map(initialHoldings.map((item) => [item.id, item]));
    return saved.map((item) => {
      const imported = importedById.get(item.id);
      if (!imported) return item;
      return { ...item, value: imported.value, cost: imported.cost, shares: imported.shares, date: imported.date, code: imported.code, category: imported.category, status: imported.status, note: imported.note };
    });
  } catch {
    return structuredClone(initialHoldings);
  }
}

function saveHoldings() {
  localStorage.setItem(storageKey, JSON.stringify(holdings));
}

function formatCurrency(value) {
  if (value === "" || value === null || Number.isNaN(Number(value))) return "—";
  return `¥ ${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function statusClass(status) {
  return status === "用户已确认" ? "verified-label" : "pending-label";
}

function renderHoldings() {
  const body = $("#holdingsTableBody");
  const empty = $("#holdingsEmpty");
  if (!body) return;
  body.innerHTML = holdings.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code || "代码待补充")} · ${escapeHtml(item.channel || "渠道待补充")}</small></td>
      <td>${escapeHtml(item.category)}</td>
      <td><strong>${formatCurrency(item.value)}</strong><small>${item.note ? escapeHtml(item.note) : ""}</small></td>
      <td>${renderDailyReturn(item)}</td>
      <td>${formatCurrency(item.cost)}<small>${item.shares ? `${Number(item.shares).toLocaleString("zh-CN")} 份` : "份额待补充"}</small></td>
      <td>${formatCurrency(item.monthly)}</td>
      <td><span class="status-label ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td><button class="table-delete" data-delete-id="${item.id}" aria-label="删除 ${escapeHtml(item.name)}">删除</button></td>
    </tr>
  `).join("");
  empty.hidden = holdings.length > 0;
  $$(`[data-delete-id]`, body).forEach((button) => button.addEventListener("click", () => {
    holdings = holdings.filter((item) => item.id !== button.dataset.deleteId);
    saveHoldings();
    renderHoldings();
    showToast("已从本地台账移除");
  }));
  updatePortfolioSummary();
}

let fundData = {};
function dailyReturnFor(item) {
  const fund = fundData[item.code];
  if (!fund || fund.status !== "available" || fund.dailyChangePct == null) return null;
  const exact = Number(item.shares) > 0 && fund.dailyChange != null;
  const amount = exact ? Number(item.shares) * fund.dailyChange : Number(item.value || 0) * fund.dailyChangePct / 100;
  return { fund, exact, amount };
}

function renderDailyReturn(item) {
  const result = dailyReturnFor(item);
  if (!result) return `<strong>—</strong><small>等待基金净值</small>`;
  const { fund, exact, amount } = result;
  const sign = amount > 0 ? "+" : "";
  const rateSign = fund.dailyChangePct > 0 ? "+" : "";
  const amountClass = amount > 0 ? "positive" : amount < 0 ? "negative" : "neutral";
  return `<strong class="${amountClass}">${sign}${formatCurrency(amount)}</strong><small>${fund.latestDate} · ${rateSign}${Number(fund.dailyChangePct).toFixed(2)}%${exact ? " · 按份额" : " · 估算"}</small>`;
}

async function refreshFundData() {
  try {
    const response = await fetch(`./fund-data.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    fundData = payload.funds || {};
    renderHoldings();
    const available = Object.values(fundData).filter((fund) => fund.status === "available");
    const totalDaily = holdings.reduce((sum, item) => sum + (dailyReturnFor(item)?.amount || 0), 0);
    const sign = totalDaily > 0 ? "+" : "";
    const summary = $("#fundDailySummary");
    if (summary) summary.textContent = available.length ? `组合估算日收益 ${sign}${formatCurrency(totalDaily)} · ${available.length}/${Object.keys(fundData).length} 只已取数` : "暂未取得基金净值";
  } catch {
    const summary = $("#fundDailySummary");
    if (summary) summary.textContent = "基金净值暂不可用";
  }
}

function updatePortfolioSummary() {
  const totals = Object.fromEntries(categoryNames.map((name) => [name, 0]));
  holdings.forEach((item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.value || 0); });
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const percent = (name) => total ? totals[name] / total * 100 : 0;
  const formattedTotal = formatCurrency(total);
  const totalNode = $("#totalAssets"); if (totalNode) totalNode.textContent = formattedTotal;
  const baselineNode = $("#baselineAsset"); if (baselineNode) baselineNode.textContent = formattedTotal;
  const countNode = $("#assetFreshness"); if (countNode) countNode.textContent = `${holdings.length} 项`;
  const sourceNode = $("#assetSourceLabel"); if (sourceNode) sourceNode.textContent = "2026-10-07 支付宝 + 直销快照";
  const microcopyNode = $("#assetMicrocopy"); if (microcopyNode) microcopyNode.textContent = "支付宝 61 项来自录屏逐帧核对；直销 10 项持仓已确认，6 只已录入截图收益（9月29–30日），4 只收益待补。";
  categoryNames.forEach((name) => {
    const id = { "债券 / 现金": "bond", "纳指 100": "ndx", "标普 500": "spx", "主动 QDII": "active", "其他": "other" }[name];
    const node = $(`#allocation-${id}`); if (node) node.textContent = `${percent(name).toFixed(1)}%`;
  });
  const centerValue = $("#allocationCenterValue"); if (centerValue) centerValue.textContent = `${percent("债券 / 现金").toFixed(1)}%`;
  const donut = $("#allocationDonut");
  if (donut) {
    const stops = [];
    let cursor = 0;
    const colors = { "债券 / 现金": "var(--green)", "纳指 100": "var(--blue)", "标普 500": "var(--purple)", "主动 QDII": "var(--coral)", "其他": "#b8c4bc" };
    categoryNames.forEach((name) => { const next = cursor + percent(name); stops.push(`${colors[name]} ${cursor.toFixed(2)}% ${next.toFixed(2)}%`); cursor = next; });
    donut.style.background = `conic-gradient(${stops.join(", ")})`;
    donut.setAttribute("aria-label", categoryNames.map((name) => `${name} ${percent(name).toFixed(1)}%`).join("，"));
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

const chartAssets = {
  NDX: { title: "纳斯达克 100（QQQ参考）", symbol: "NASDAQ:QQQ", directSymbol: "NASDAQ:NDX", note: "图中使用 QQQ ETF 作为纳指100参考走势；ETF价格不等于指数点位。" },
  SPX: { title: "标普 500（SPY参考）", symbol: "AMEX:SPY", directSymbol: "SP:SPX", note: "图中使用 SPY ETF 作为标普500参考走势；ETF价格不等于指数点位。" },
  VIX: { title: "VIX 恐慌指数", symbol: "CBOE:VIX" },
  VXN: { title: "VXN 纳指波动率", symbol: "CBOE:VXN" },
  US10Y: { title: "美国 10 年期国债收益率", symbol: "TVC:US10Y" },
  USDCNY: { title: "美元兑人民币", symbol: "FX_IDC:USDCNY" },
};
let activeChartSymbol = "NDX";
let activeChartInterval = "D";
let lastChartTrigger = null;

function renderTradingViewChart() {
  const frame = $("#marketChartFrame");
  const asset = chartAssets[activeChartSymbol];
  if (!frame || !asset) return;
  frame.replaceChildren();
  const widget = document.createElement("div");
  widget.className = "tradingview-widget-container";
  const chart = document.createElement("div");
  chart.className = "tradingview-widget-container__widget";
  widget.append(chart);
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.async = true;
  script.textContent = JSON.stringify({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: true,
    hide_legend: false,
    hide_volume: true,
    hotlist: false,
    interval: activeChartInterval,
    locale: "zh_CN",
    save_image: false,
    style: "1",
    symbol: asset.symbol,
    theme: "light",
    timezone: "Asia/Shanghai",
    backgroundColor: "#fbfaf6",
    gridColor: "rgba(46, 46, 46, 0.06)",
    withdateranges: true,
    autosize: true,
  });
  widget.append(script);
  frame.append(widget);
  $("#marketChartTitle").textContent = asset.title;
  $("#chartDisclosure").textContent = asset.note || "图表由 TradingView 提供。分时数据可能有延迟或受市场数据权限限制。";
  $("#openFullChartLink").href = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(asset.directSymbol || asset.symbol)}`;
  $$(`[data-chart-symbol]`).forEach((button) => {
    const selected = button.dataset.chartSymbol === activeChartSymbol;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $$(`[data-chart-interval]`).forEach((button) => {
    const selected = button.dataset.chartInterval === activeChartInterval;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function openMarketChart(symbolKey, trigger = null) {
  if (!chartAssets[symbolKey]) return;
  activeChartSymbol = symbolKey;
  activeChartInterval = "D";
  lastChartTrigger = trigger;
  $("#marketChartModal").hidden = false;
  document.body.style.overflow = "hidden";
  renderTradingViewChart();
  $("#closeMarketChartButton").focus();
}

function closeMarketChart() {
  $("#marketChartModal").hidden = true;
  $("#marketChartFrame").replaceChildren();
  document.body.style.overflow = "";
  lastChartTrigger?.focus();
}

function activateSection(sectionName) {
  $$(`[data-section]`).forEach((button) => button.classList.toggle("active", button.dataset.section === sectionName));
  $$(`[data-panel]`).forEach((panel) => panel.classList.toggle("active", panel.id === `section-${sectionName}`));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal() {
  $("#holdingModal").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("input[name=name]")?.focus(), 40);
}

function closeModal() {
  $("#holdingModal").hidden = true;
  document.body.style.overflow = "";
  $("#holdingForm").reset();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function formatMetric(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function updateMetricStatus(key, status) {
  $$(`[data-status-for="${key}"]`).forEach((element) => {
    element.textContent = status === "live" ? "实时" : status === "daily" ? "日线" : status === "error" ? "异常" : "待接入";
    element.className = `state-pill ${status === "live" ? "green" : status === "error" ? "red" : "yellow"}`;
  });
}

function applyTemperature(temperature) {
  const tag = $("#temperatureTag");
  const signalTag = $("#signalTag");
  const title = $("#signalTitle");
  const detail = $("#signalDetail");
  const fill = $("#signalFill");
  const overview = $("#overviewDataStatus");
  const marketStatus = $("#marketSectionStatus");
  const dot = $("#marketStatusDot");
  if (!temperature || temperature.status === "needs_config") {
    [tag, signalTag].forEach((node) => { if (node) { node.textContent = "等待数据"; node.className = "tag pending"; } });
    if (title) title.textContent = "等待市场数据";
    if (detail) detail.textContent = "接入免费日线后自动计算回撤和加仓档位";
    if (fill) fill.style.width = "0%";
    if (overview) overview.textContent = "市场温度待更新";
    if (marketStatus) marketStatus.textContent = "市场温度待更新";
    return;
  }
  const color = temperature.color || "yellow";
  const band = Number(temperature.band || 0);
  [tag, signalTag].forEach((node) => {
    if (node) {
      node.textContent = `${temperature.label} · ${temperature.status === "live" ? "实时" : "日线"}`;
      node.className = `tag ${color === "green" ? "verified" : "pending"}`;
    }
  });
  if (title) title.textContent = temperature.label;
  if (detail) detail.textContent = temperature.action;
  if (fill) { fill.style.width = `${Math.max(8, band * 25)}%`; fill.dataset.level = color; }
  if (overview) overview.textContent = `市场温度：${temperature.label}`;
  if (marketStatus) marketStatus.textContent = `市场温度：${temperature.label}`;
  if (dot) dot.className = `status-dot ${color === "green" ? "green" : color === "red" ? "red" : "yellow"}`;
}

function applyMarketPayload(payload) {
  const market = payload.market || {};
  const get = (key) => market[key] || {};
  const ndx = get("NDX"); const spx = get("SPX"); const vix = get("VIX"); const vxn = get("VXN"); const us10y = get("US10Y"); const usdcny = get("USDCNY");
  const write = (id, value) => { const node = $(`#${id}`); if (node) node.textContent = value; };
  write("metric-ndx", formatMetric(ndx.value));
  write("metric-spx", formatMetric(spx.value));
  write("metric-vol", `${formatMetric(vix.value)} / ${formatMetric(vxn.value)}`);
  write("metric-rates", `${us10y.value == null ? "—" : `${formatMetric(us10y.value)}%`} / ${formatMetric(usdcny.value, 4)}`);
  write("metric-ndx-caption", `纳指 100 · ${ndx.changePct == null ? "回撤 —" : `${ndx.changePct >= 0 ? "+" : ""}${formatMetric(ndx.changePct)}%`}`);
  write("metric-spx-caption", `标普 500 · ${spx.changePct == null ? "回撤 —" : `${spx.changePct >= 0 ? "+" : ""}${formatMetric(spx.changePct)}%`}`);
  write("indicator-ndx", formatMetric(ndx.value)); write("indicator-spx", formatMetric(spx.value));
  write("indicator-vix", formatMetric(vix.value)); write("indicator-vxn", formatMetric(vxn.value));
  write("indicator-us10y", us10y.value == null ? "—" : `${formatMetric(us10y.value)}%`); write("indicator-usdcny", formatMetric(usdcny.value, 4));
  write("drawdown-ndx", ndx.drawdownPct == null ? "—" : `${formatMetric(ndx.drawdownPct)}%`); write("drawdown-spx", spx.drawdownPct == null ? "—" : `${formatMetric(spx.drawdownPct)}%`);
  ["NDX", "SPX", "VIX", "VXN", "US10Y", "USDCNY"].forEach((key) => updateMetricStatus(key, get(key).status));
  const mode = $("#dataModeLabel"); if (mode) mode.textContent = payload.status === "live" ? "实时数据" : payload.status === "daily" ? "免费日线" : payload.status === "error" ? "接口异常" : "等待密钥";
  const note = $("#marketFootnote");
  if (note) {
    if (payload.status === "live") note.textContent = `已接入服务端快照，最近刷新 ${new Date(payload.updatedAt).toLocaleString("zh-CN")}`;
    else if (payload.status === "daily") note.textContent = `已接入 FRED 免费公开日线快照，自动定时更新；最新观测日由各指标单独决定，不代表盘中实时。`;
    else note.textContent = "市场接口暂时没有返回数据；页面不会把占位值当成行情。";
  }
  const macro = payload.macro || {};
  write("macro-fed", ["live", "daily"].includes(macro.FEDFUNDS?.status) ? `${formatMetric(macro.FEDFUNDS.value)} · ${macro.FEDFUNDS.updatedAt || "已更新"}` : "待更新");
  write("macro-inflation", ["live", "daily"].includes(macro.CPI?.status) || ["live", "daily"].includes(macro.PCE?.status) ? "已更新" : "待更新");
  write("macro-jobs", ["live", "daily"].includes(macro.UNRATE?.status) || ["live", "daily"].includes(macro.PAYEMS?.status) ? "已更新" : "待更新");
  applyTemperature(payload.temperature);
}

async function refreshMarketData() {
  try {
    // Use a relative path so this also works when hosted below a GitHub Pages
    // project path such as /personal-investment-dashboard/.
    let response = await fetch(`./market-data.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) response = await fetch("./api/market", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    applyMarketPayload(await response.json());
  } catch (error) {
    const mode = $("#dataModeLabel"); if (mode) mode.textContent = "接口不可用";
    const note = $("#marketFootnote"); if (note) note.textContent = "公开数据快照暂时不可用，当前页面只保留持仓信息和占位提示。";
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), holdings, note: "本地台账导出；市场行情由服务端快照提供。" }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "investment-dashboard-data.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("本地数据已导出");
}

$$(`[data-section]`).forEach((button) => button.addEventListener("click", () => activateSection(button.dataset.section)));
$$(`[data-section-target]`).forEach((button) => button.addEventListener("click", () => activateSection(button.dataset.sectionTarget)));
$$(`[data-chart]`).forEach((button) => button.addEventListener("click", () => openMarketChart(button.dataset.chart, button)));
$$(`[data-chart-symbol]`).forEach((button) => button.addEventListener("click", () => { activeChartSymbol = button.dataset.chartSymbol; renderTradingViewChart(); }));
$$(`[data-chart-interval]`).forEach((button) => button.addEventListener("click", () => { activeChartInterval = button.dataset.chartInterval; renderTradingViewChart(); }));
$("#closeMarketChartButton")?.addEventListener("click", closeMarketChart);
$("#marketChartModal")?.addEventListener("click", (event) => { if (event.target.id === "marketChartModal") closeMarketChart(); });
$$(`[data-open-modal="holding"]`).forEach((button) => button.addEventListener("click", openModal));
$("#addHoldingButton")?.addEventListener("click", openModal);
$("#addHoldingButtonSecondary")?.addEventListener("click", openModal);
$("#closeModalButton")?.addEventListener("click", closeModal);
$("#cancelModalButton")?.addEventListener("click", closeModal);
$("#holdingModal")?.addEventListener("click", (event) => { if (event.target.id === "holdingModal") closeModal(); });
$("#refreshButton")?.addEventListener("click", async () => { await Promise.all([refreshMarketData(), refreshFundData()]); showToast("市场与基金数据已刷新"); });
$("#clearHoldingsButton")?.addEventListener("click", () => { holdings = structuredClone(initialHoldings); saveHoldings(); renderHoldings(); showToast("已恢复初始估算"); });
$("#exportDataButton")?.addEventListener("click", exportData);
$("#addQdiiButton")?.addEventListener("click", () => { activateSection("holdings"); openModal(); $("select[name=category]").value = "主动 QDII"; });
$("#majorChangeOnly")?.addEventListener("change", (event) => showToast(event.target.checked ? "已开启重大变化提醒" : "已关闭重大变化提醒"));
$("#holdingForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  holdings.push({ ...data, id: `holding-${Date.now()}` });
  saveHoldings();
  renderHoldings();
  closeModal();
  activateSection("holdings");
  showToast("已保存到本地台账");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("#marketChartModal").hidden) closeMarketChart();
  else if (!$("#holdingModal").hidden) closeModal();
});
renderHoldings();
refreshMarketData();
window.setInterval(refreshMarketData, 60 * 1000);
refreshFundData();
window.setInterval(refreshFundData, 60 * 60 * 1000);
