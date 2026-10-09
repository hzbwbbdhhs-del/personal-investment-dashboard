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
      shares: record["持有份额_份"] == null ? "" : Number(record["持有份额_份"]),
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

function chinaDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function displayChinaDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  return match ? `${Number(match[2])}月${Number(match[3])}日` : "日期待确认";
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
      <td><strong>${formatCurrency(valuationFor(item).value)}</strong><small>${escapeHtml(valuationFor(item).label)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small></td>
      <td>${renderDailyReturn(item)}</td>
      <td>${formatCurrency(item.cost)}</td>
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
  renderTodayReturns();
}

let fundData = {};
let fundSnapshotUpdatedAt = "";
let fundRenderDate = "";
function valuationFor(item) {
  const snapshotValue = Number(item.value || 0);
  const fund = fundData[item.code];
  if (fund?.status === "available" && Number(fund.nav) > 0) {
    if (Number(item.shares) > 0) {
      return { value: Number(item.shares) * fund.nav, kind: "shares", date: fund.latestDate, label: `${displayChinaDate(fund.latestDate)}净值 · 按份额` };
    }
    const reference = fund.referenceNavs?.[item.date];
    if (Number(reference?.nav) > 0) {
      return { value: snapshotValue * fund.nav / reference.nav, kind: "estimated", date: fund.latestDate, label: `${displayChinaDate(fund.latestDate)}净值 · 按录入市值估算` };
    }
  }
  return { value: snapshotValue, kind: "snapshot", date: item.date || "", label: `${displayChinaDate(item.date)}持仓快照 · 未自动估值` };
}

function dailyReturnFor(item) {
  const fund = fundData[item.code];
  if (!fund || fund.status !== "available" || fund.dailyChangePct == null) return null;
  const exact = Number(item.shares) > 0 && fund.dailyChange != null;
  const latestValue = valuationFor(item).value;
  const amount = exact ? Number(item.shares) * fund.dailyChange
    : fund.dailyChangePct > -100 ? latestValue * fund.dailyChangePct / (100 + fund.dailyChangePct)
      : Number(item.value || 0) * fund.dailyChangePct / 100;
  return { fund, exact, amount };
}

function renderDailyReturn(item) {
  const result = dailyReturnFor(item);
  if (!result) return `<strong>—</strong><small>等待基金净值</small>`;
  const { fund, exact, amount } = result;
  const sign = amount > 0 ? "+" : "";
  const rateSign = fund.dailyChangePct > 0 ? "+" : "";
  const amountClass = amount > 0 ? "positive" : amount < 0 ? "negative" : "neutral";
  return `<strong class="${amountClass}">${sign}${formatCurrency(amount)}</strong><small>${fund.latestDate === chinaDate() ? "今日已更新 · " : ""}${fund.latestDate}净值 · ${rateSign}${Number(fund.dailyChangePct).toFixed(2)}%${exact ? " · 按份额" : " · 估算"}</small>`;
}

function renderTodayReturns() {
  const body = $("#todayReturnsTableBody");
  if (!body) return;
  const rows = holdings.map((item) => ({ item, result: dailyReturnFor(item) }));
  const available = rows.filter(({ result }) => result);
  const total = available.reduce((sum, row) => sum + row.result.amount, 0);
  const marketValue = available.reduce((sum, row) => sum + valuationFor(row.item).value, 0);
  const exactCount = available.filter(({ result }) => result.exact).length;
  const dates = [...new Set(available.map(({ result }) => result.fund.latestDate).filter(Boolean))].sort();
  const latestDate = dates.at(-1) || "";
  const dateCounts = available.reduce((counts, { result }) => {
    const date = result.fund.latestDate || "日期待确认";
    counts.set(date, (counts.get(date) || 0) + 1);
    return counts;
  }, new Map());
  const dateBreakdown = [...dateCounts.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, count]) => `${displayChinaDate(date)}（${count}笔）`)
    .join(" · ");
  const updatedToday = dateCounts.get(chinaDate()) || 0;
  const sign = total > 0 ? "+" : "";
  const totalNode = $("#todayReturnTotal");
  if (totalNode) {
    totalNode.textContent = available.length ? `${sign}${formatCurrency(total)}` : "—";
    totalNode.className = `hero-number ${total > 0 ? "positive" : total < 0 ? "negative" : ""}`;
  }
  const coverage = $("#todayReturnCoverage");
  if (coverage) coverage.textContent = `${available.length}/${holdings.length} 笔已取数`;
  const status = $("#todayReturnStatus");
  if (status) status.textContent = available.length
    ? `${updatedToday ? `今日已更新 ${updatedToday} 笔` : "今日尚无净值更新"} · 最新${displayChinaDate(latestDate)}净值 · ${dateBreakdown}`
    : "基金净值暂不可用";
  const dateNode = $("#todayReturnDate");
  if (dateNode) dateNode.textContent = available.length ? dateBreakdown : "等待数据";
  const rateNode = $("#todayReturnRate");
  if (rateNode) {
    const rate = marketValue ? total / marketValue * 100 : null;
    rateNode.textContent = rate == null ? "—" : `${rate > 0 ? "+" : ""}${rate.toFixed(2)}% · 混合日期估算`;
  }
  const methodNode = $("#todayReturnMethod");
  if (methodNode) methodNode.textContent = available.length ? `${exactCount} 笔按份额，其余按市值估算` : "等待净值和持仓数据";
  const empty = $("#todayReturnsEmpty");
  if (empty) empty.hidden = rows.length > 0;
  body.innerHTML = rows.sort((a, b) => Math.abs(b.result?.amount || 0) - Math.abs(a.result?.amount || 0)).map(({ item, result }) => {
    const nameBase = `<strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code || "代码待补充")} · ${escapeHtml(item.channel || "渠道待补充")}</small>`;
    if (!result) {
      const name = `${nameBase}<span class="mobile-nav-date unavailable">日期未获取</span>`;
      return `<tr><td>${name}</td><td>${escapeHtml(item.category)}</td><td>${formatCurrency(valuationFor(item).value)}</td><td>—</td><td>—</td><td class="nav-date-column"><span class="nav-date-chip unavailable">日期未获取</span></td><td>—</td></tr>`;
    }
    const { fund, exact, amount } = result;
    const amountClass = amount > 0 ? "positive" : amount < 0 ? "negative" : "neutral";
    const isToday = fund.latestDate === chinaDate();
    const isLatestDate = fund.latestDate === latestDate;
    const dateClass = isToday ? "today" : isLatestDate ? "current" : "lagged";
    const dateNote = isToday ? "今日已更新" : isLatestDate ? "当前最新公布日期" : "较最新公布日期滞后";
    const dateLabel = `${isToday ? "今日已更新 · " : ""}${displayChinaDate(fund.latestDate)}净值`;
    const name = `${nameBase}<span class="mobile-nav-date ${dateClass}">${dateLabel}</span>`;
    return `<tr><td>${name}</td><td>${escapeHtml(item.category)}</td><td>${formatCurrency(valuationFor(item).value)}</td><td><strong class="${amountClass}">${amount > 0 ? "+" : ""}${formatCurrency(amount)}</strong></td><td>${fund.dailyChangePct > 0 ? "+" : ""}${Number(fund.dailyChangePct).toFixed(2)}%</td><td class="nav-date-cell nav-date-column"><span class="nav-date-chip ${dateClass}">${dateLabel}</span><small>${escapeHtml(fund.latestDate || "日期待确认")} · ${dateNote}</small></td><td><strong>${exact ? "按份额精算" : "按持仓市值估算"}</strong></td></tr>`;
  }).join("");
}

async function refreshFundData() {
  try {
    const rawUrl = `https://raw.githubusercontent.com/hzbwbbdhhs-del/personal-investment-dashboard/main/fund-data.json?ts=${Date.now()}`;
    let response;
    if (location.hostname.endsWith("github.io")) {
      try {
        response = await fetch(rawUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        response = await fetch(`./fund-data.json?ts=${Date.now()}`, { cache: "no-store" });
      }
    } else {
      response = await fetch(`./fund-data.json?ts=${Date.now()}`, { cache: "no-store" });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.funds || !Object.keys(payload.funds).length) throw new Error("Empty fund snapshot");
    if (fundSnapshotUpdatedAt && payload.updatedAt === fundSnapshotUpdatedAt && fundRenderDate === chinaDate()) return;
    fundSnapshotUpdatedAt = payload.updatedAt || "";
    fundRenderDate = chinaDate();
    fundData = payload.funds || {};
    renderHoldings();
    const available = Object.values(fundData).filter((fund) => fund.status === "available");
    const totalDaily = holdings.reduce((sum, item) => sum + (dailyReturnFor(item)?.amount || 0), 0);
    const sign = totalDaily > 0 ? "+" : "";
    const summary = $("#fundDailySummary");
    if (summary) summary.textContent = available.length ? `组合估算日收益 ${sign}${formatCurrency(totalDaily)} · ${available.length}/${Object.keys(fundData).length} 只已取数` : "暂未取得基金净值";
  } catch {
    const summary = $("#fundDailySummary");
    if (summary && !Object.keys(fundData).length) summary.textContent = "基金净值暂不可用";
  }
}

function updatePortfolioSummary() {
  const totals = Object.fromEntries(categoryNames.map((name) => [name, 0]));
  const valuations = holdings.map((item) => ({ item, valuation: valuationFor(item) }));
  valuations.forEach(({ item, valuation }) => { totals[item.category] = (totals[item.category] || 0) + valuation.value; });
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const percent = (name) => total ? totals[name] / total * 100 : 0;
  const formattedTotal = formatCurrency(total);
  const totalNode = $("#totalAssets"); if (totalNode) totalNode.textContent = formattedTotal;
  const snapshotTotal = holdings.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const baselineNode = $("#baselineAsset"); if (baselineNode) baselineNode.textContent = formatCurrency(snapshotTotal);
  const countNode = $("#assetFreshness"); if (countNode) countNode.textContent = `${holdings.length} 项`;
  const refreshed = valuations.filter(({ valuation }) => valuation.kind !== "snapshot");
  const latestNavDate = refreshed.map(({ valuation }) => valuation.date).sort().at(-1);
  const dateCounts = new Map();
  refreshed.forEach(({ valuation }) => dateCounts.set(valuation.date, (dateCounts.get(valuation.date) || 0) + 1));
  const dateSummary = [...dateCounts.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, count]) => `${displayChinaDate(date)} ${count}笔`).join("、");
  const difference = total - snapshotTotal;
  const tag = $("#assetValueTag"); if (tag) tag.textContent = refreshed.length ? "净值估算" : "持仓快照";
  const allocationTag = $("#allocationValueTag"); if (allocationTag) allocationTag.textContent = refreshed.length ? "净值估算" : "持仓快照";
  const sidebarDate = $("#sidebarNavDate"); if (sidebarDate) sidebarDate.textContent = latestNavDate ? `最晚${displayChinaDate(latestNavDate)}净值` : "等待净值";
  const sourceNode = $("#assetSourceLabel"); if (sourceNode) sourceNode.textContent = latestNavDate ? `按各基金最新净值估算 · 最晚${displayChinaDate(latestNavDate)}` : "支付宝10月7日 + 直销10月3日持仓快照";
  const microcopyNode = $("#assetMicrocopy"); if (microcopyNode) microcopyNode.textContent = `较录入基准${difference >= 0 ? "+" : "-"}${formatCurrency(Math.abs(difference))}；${refreshed.length}/${holdings.length}笔可按净值估值（${dateSummary || "净值待更新"}）。录入基准：支付宝10月7日、直销10月3日；买卖、分红和账户余额未自动同步，不等于实时实盘余额。`;
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

function updateCurrentDateLabel() {
  const node = $("#topbarDate");
  if (node) node.textContent = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

const chartAssets = {
  NDX: { title: "QQQ · 纳指100 ETF盘中参考", symbol: "NASDAQ:QQQ", directSymbol: "NASDAQ:NDX", note: "图中是 QQQ ETF 的走势，不是纳指100指数点位；纳指100日线点位和市场温度仍按 FRED 计算。" },
  SPX: { title: "SPY · 标普500 ETF盘中参考", symbol: "AMEX:SPY", directSymbol: "SP:SPX", note: "图中是 SPY ETF 的走势，不是标普500指数点位；标普500日线点位仍按 FRED 显示。" },
  VIX: { title: "VIX 恐慌指数", symbol: "CBOE:VIX" },
  VXN: { title: "VXN 纳指波动率", symbol: "CBOE:VXN" },
  US10Y: { title: "美国 10 年期国债收益率（%）", symbol: "TVC:US10Y", note: "纵轴以百分比收益率显示：5.25 表示年化收益率约 5.25%，不是债券价格。图表由 TradingView 提供，可能延迟；卡片数值为 FRED 日线。" },
  USDCNY: { title: "美元兑人民币", symbol: "FX_IDC:USDCNY" },
};
let activeChartSymbol = "NDX";
let lastChartTrigger = null;
let tradingViewQuotesLoaded = false;

function loadTradingViewQuotes() {
  if (tradingViewQuotesLoaded) return;
  const frame = $("#tradingviewMarketQuotes");
  if (!frame) return;
  tradingViewQuotesLoaded = true;
  frame.replaceChildren();
  const widget = document.createElement("div");
  widget.className = "tradingview-widget-container";
  const quotes = document.createElement("div");
  quotes.className = "tradingview-widget-container__widget";
  widget.append(quotes);
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: [
      ["QQQ · 纳指参考", "NASDAQ:QQQ|1D"],
      ["纳指100 · 日线", "FRED:NDQ100|1D"],
      ["SPY · 标普参考", "AMEX:SPY|1D"],
      ["标普500 · 日线", "FRED:SP500|1D"],
      ["VIX", "CBOE:VIX|1D"],
      ["VXN", "CBOE:VXN|1D"],
      ["10年美债收益率（%）", "TVC:US10Y|1D"],
      ["美元/人民币", "FX_IDC:USDCNY|1D"],
    ],
    chartOnly: false,
    width: "100%",
    height: "100%",
    locale: "zh_CN",
    colorTheme: "light",
    autosize: true,
    showVolume: false,
    showMA: false,
    hideDateRanges: false,
    hideMarketStatus: false,
    hideSymbolLogo: false,
    scalePosition: "right",
    scaleMode: "Normal",
    valuesTracking: "1",
    changeMode: "price-and-percent",
    chartType: "area",
    lineWidth: 2,
    lineType: 0,
    upColor: "#198f77",
    downColor: "#ed4052",
    dateRanges: ["1d|1", "5d|5", "1m|30", "6m|1D", "12m|1D", "60m|1W", "all|1M"],
  });
  script.onerror = () => {
    tradingViewQuotesLoaded = false;
    frame.textContent = "TradingView 图表暂时无法加载。请检查网络或浏览器拦截设置后重新进入本页。";
  };
  widget.append(script);
  frame.append(widget);
}

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
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: [[asset.title, `${asset.symbol}|1D`]],
    chartOnly: false,
    width: "100%",
    height: "100%",
    locale: "zh_CN",
    colorTheme: "light",
    autosize: true,
    showVolume: false,
    showMA: false,
    hideDateRanges: false,
    hideMarketStatus: false,
    hideSymbolLogo: false,
    scalePosition: "right",
    scaleMode: "Normal",
    valuesTracking: "1",
    changeMode: "price-and-percent",
    chartType: "area",
    lineWidth: 2,
    lineType: 0,
    upColor: "#198f77",
    downColor: "#ed4052",
    dateRanges: ["1d|1", "5d|5", "1m|30", "6m|1D", "12m|1D", "60m|1W", "all|1M"],
  });
  script.onerror = () => {
    frame.textContent = "TradingView 图表暂时无法加载，请检查网络或浏览器拦截设置后重试。";
  };
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
}

function openMarketChart(symbolKey, trigger = null) {
  if (!chartAssets[symbolKey]) return;
  activeChartSymbol = symbolKey;
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
  if (sectionName === "market") loadTradingViewQuotes();
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

function updateMetricStatus(key, status, observedAt) {
  $$(`[data-status-for="${key}"]`).forEach((element) => {
    element.textContent = status === "live" ? "实时" : status === "daily" ? `${displayChinaDate(observedAt)}日线` : status === "error" ? "异常" : "待接入";
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
  const observed = temperature.updatedAt ? ` · ${displayChinaDate(temperature.updatedAt)}` : "";
  [tag, signalTag].forEach((node) => {
    if (node) {
      node.textContent = `${temperature.label} · ${temperature.status === "live" ? "实时" : "日线"}${observed}`;
      node.className = `tag ${color === "green" ? "verified" : "pending"}`;
    }
  });
  if (title) title.textContent = temperature.label;
  if (detail) detail.textContent = `${temperature.action}${observed ? `；数据至${displayChinaDate(temperature.updatedAt)}` : ""}`;
  if (fill) { fill.style.width = `${Math.max(8, band * 25)}%`; fill.dataset.level = color; }
  if (overview) overview.textContent = `市场温度：${temperature.label}${observed}`;
  if (marketStatus) marketStatus.textContent = `市场温度：${temperature.label}${observed}`;
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
  write("metric-us10y", us10y.value == null ? "—" : `${formatMetric(us10y.value)}%`);
  write("metric-ndx-caption", `纳指 100 · ${ndx.changePct == null ? "回撤 —" : `${ndx.changePct >= 0 ? "+" : ""}${formatMetric(ndx.changePct)}%`}`);
  write("metric-spx-caption", `标普 500 · ${spx.changePct == null ? "回撤 —" : `${spx.changePct >= 0 ? "+" : ""}${formatMetric(spx.changePct)}%`}`);
  write("indicator-ndx", formatMetric(ndx.value)); write("indicator-spx", formatMetric(spx.value));
  write("indicator-vix", formatMetric(vix.value)); write("indicator-vxn", formatMetric(vxn.value));
  write("indicator-us10y", us10y.value == null ? "—" : `${formatMetric(us10y.value)}%`); write("indicator-usdcny", formatMetric(usdcny.value, 4));
  write("drawdown-ndx", ndx.drawdownPct == null ? "—" : `${formatMetric(ndx.drawdownPct)}%`); write("drawdown-spx", spx.drawdownPct == null ? "—" : `${formatMetric(spx.drawdownPct)}%`);
  ["NDX", "SPX", "VIX", "VXN", "US10Y", "USDCNY"].forEach((key) => updateMetricStatus(key, get(key).status, get(key).updatedAt));
  const mode = $("#dataModeLabel"); if (mode) mode.textContent = payload.status === "live" ? "实时数据" : payload.status === "daily" ? "免费日线" : payload.status === "error" ? "接口异常" : "等待密钥";
  const note = $("#marketFootnote");
  if (note) {
    if (payload.status === "live") note.textContent = `已接入服务端快照，最近刷新 ${new Date(payload.updatedAt).toLocaleString("zh-CN")}`;
    else if (payload.status === "daily") note.textContent = `FRED 免费公开日线；云端快照更新于 ${new Date(payload.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）。各指标观察日见标签；不代表盘中实时。`;
    else note.textContent = "市场接口暂时没有返回数据；页面不会把占位值当成行情。";
  }
  const macro = payload.macro || {};
  const writeMacroDetail = (id, value) => { const node = $(`#${id}`)?.previousElementSibling?.querySelector("small"); if (node) node.textContent = value; };
  write("macro-fed", ["live", "daily"].includes(macro.FEDFUNDS?.status) ? `${formatMetric(macro.FEDFUNDS.value)}% · ${displayChinaDate(macro.FEDFUNDS.updatedAt)}` : "待更新");
  write("macro-inflation", ["live", "daily"].includes(macro.CPI?.status) ? `CPI ${formatMetric(macro.CPI.value)} · ${displayChinaDate(macro.CPI.updatedAt)}` : "待更新");
  writeMacroDetail("macro-inflation", ["live", "daily"].includes(macro.PCE?.status) ? `PCE指数 ${formatMetric(macro.PCE.value)}（${displayChinaDate(macro.PCE.updatedAt)}）；核心同比待接入` : "PCE与核心同比待接入");
  write("macro-jobs", ["live", "daily"].includes(macro.UNRATE?.status) ? `失业率 ${formatMetric(macro.UNRATE.value)}% · ${displayChinaDate(macro.UNRATE.updatedAt)}` : "待更新");
  writeMacroDetail("macro-jobs", ["live", "daily"].includes(macro.PAYEMS?.status) ? `非农总就业约${formatMetric(macro.PAYEMS.value / 100000, 2)}亿人（${displayChinaDate(macro.PAYEMS.updatedAt)}）；时薪和初请待接入` : "非农、时薪和初请待接入");
  applyTemperature(payload.temperature);
}

async function refreshMarketData() {
  try {
    let response;
    if (location.hostname.endsWith("github.io")) {
      try {
        response = await fetch(`https://raw.githubusercontent.com/hzbwbbdhhs-del/personal-investment-dashboard/main/market-data.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        response = await fetch(`./market-data.json?ts=${Date.now()}`, { cache: "no-store" });
      }
    } else {
      response = await fetch(`./market-data.json?ts=${Date.now()}`, { cache: "no-store" });
    }
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
$("#closeMarketChartButton")?.addEventListener("click", closeMarketChart);
$("#marketChartModal")?.addEventListener("click", (event) => { if (event.target.id === "marketChartModal") closeMarketChart(); });
$$(`[data-open-modal="holding"]`).forEach((button) => button.addEventListener("click", openModal));
$("#addHoldingButton")?.addEventListener("click", openModal);
$("#addHoldingButtonSecondary")?.addEventListener("click", openModal);
$("#closeModalButton")?.addEventListener("click", closeModal);
$("#cancelModalButton")?.addEventListener("click", closeModal);
$("#holdingModal")?.addEventListener("click", (event) => { if (event.target.id === "holdingModal") closeModal(); });
$("#refreshButton")?.addEventListener("click", async () => { await Promise.all([refreshMarketData(), refreshFundData()]); showToast("已检查公开数据；各项观察日以页面标注为准"); });
$("#clearHoldingsButton")?.addEventListener("click", () => { holdings = structuredClone(initialHoldings); saveHoldings(); renderHoldings(); showToast("已恢复初始估算"); });
$("#exportDataButton")?.addEventListener("click", exportData);
$("#addQdiiButton")?.addEventListener("click", () => { activateSection("holdings"); openModal(); $("select[name=category]").value = "主动 QDII"; });
$("#majorChangeOnly")?.addEventListener("change", () => showToast("仅记录页面偏好；自动通知尚未接入"));
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
updateCurrentDateLabel();
window.setInterval(updateCurrentDateLabel, 60 * 1000);
refreshMarketData();
window.setInterval(refreshMarketData, 60 * 1000);
refreshFundData();
window.setInterval(refreshFundData, 60 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshFundData(); });
