// QDII quotas are a timestamped third-party snapshot, not an Alipay or
// fund-company direct-sale quote.
const qdiiView = { payload: null, category: "all", shown: 30 };
const qdii$ = (selector) => document.querySelector(selector);
const qdii$$ = (selector) => [...document.querySelectorAll(selector)];

function qdiiEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function qdiiHeldCodes() {
  return new Set(holdings.map((item) => item.code).filter((code) => /^\d{6}$/.test(code || "")));
}

function renderQdiiLimits() {
  const payload = qdiiView.payload;
  if (!payload) return;
  const heldCodes = qdiiHeldCodes();
  const search = (qdii$("#qdiiSearch")?.value || "").trim().toLowerCase();
  const heldOnly = Boolean(qdii$("#qdiiHeldOnly")?.checked);
  const status = qdii$("#qdiiStatusFilter")?.value || "all";
  const selected = payload.funds.filter((fund) =>
    (qdiiView.category === "all" || fund.category === qdiiView.category)
    && (!heldOnly || heldCodes.has(fund.code))
    && (status === "all" || fund.status === status)
    && (!search || (fund.name + " " + fund.code).toLowerCase().includes(search))
  );
  selected.sort((a, b) => Number(heldCodes.has(b.code)) - Number(heldCodes.has(a.code)) || a.code.localeCompare(b.code));
  const visible = selected.slice(0, qdiiView.shown);
  const categoryLabel = { nasdaq100: "纳指100", sp500: "标普500", active: "主动型" };
  const stateClass = (value) => value === "开放申购" ? "open" : value === "限大额" ? "limited" : value === "暂停申购" ? "paused" : "unknown";
  const html = visible.map((fund) => {
    const quota = fund.status === "暂停申购" ? "不可申购" : fund.status === "限大额"
      ? fund.quotaCny == null ? "额度未披露" : "¥" + Number(fund.quotaCny).toLocaleString("zh-CN") + "/日"
      : fund.status === "开放申购" ? "未显示限额" : "—";
    const held = heldCodes.has(fund.code) ? '<span class="qdii-held">我的持仓</span>' : "";
    const code = qdiiEscape(fund.code);
    return '<tr><td><strong>' + qdiiEscape(fund.name) + held + '</strong><small>' + code + '</small></td>'
      + '<td>' + (categoryLabel[fund.category] || "—") + '</td>'
      + '<td><span class="qdii-state ' + stateClass(fund.status) + '">' + qdiiEscape(fund.status) + '</span></td>'
      + '<td><strong>' + qdiiEscape(quota) + '</strong></td>'
      + '<td>待逐只核验<small>不可套用天天基金额度</small></td>'
      + '<td><a href="https://fundf10.eastmoney.com/jjfl_' + code + '.html" target="_blank" rel="noopener noreferrer">交易规则 ↗</a>'
      + '<small><a href="https://fundf10.eastmoney.com/jjgg_' + code + '.html" target="_blank" rel="noopener noreferrer">基金公告 ↗</a></small></td></tr>';
  }).join("");
  qdii$("#qdiiRows").innerHTML = html || '<tr><td colspan="6">没有符合条件的基金。可清空搜索或切换筛选条件。</td></tr>';
  qdii$("#qdiiCount").textContent = selected.length + " 只";
  qdii$("#qdiiShown").textContent = "已显示 " + visible.length + " / " + selected.length + " 只；全库 " + payload.funds.length + " 只";
  qdii$("#qdiiMoreButton").hidden = visible.length >= selected.length;
  qdii$$("[data-qdii-category]").forEach((button) => {
    const active = button.dataset.qdiiCategory === qdiiView.category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function refreshQdiiLimits() {
  const label = qdii$("#qdiiUpdatedAt");
  try {
    const response = await fetch("./qdii-limits.json?ts=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    if (payload.status !== "available" || !Array.isArray(payload.funds) || payload.funds.length < 100) throw new Error("限额快照不完整");
    qdiiView.payload = payload;
    const updated = new Date(payload.updatedAt);
    const stale = !Number.isFinite(updated.getTime()) || Date.now() - updated.getTime() > 3 * 60 * 60 * 1000;
    const time = Number.isFinite(updated.getTime()) ? updated.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "未知";
    label.textContent = "天天基金快照 " + time + "（北京时间）" + (stale ? " · 超过3小时未更新" : " · 约每小时更新");
    qdii$("#qdiiScope").textContent = "覆盖 " + (payload.counts?.nasdaq100 || 0) + " 只纳指100、" + (payload.counts?.sp500 || 0) + " 只标普500、" + (payload.counts?.active || 0) + " 只主动型 QDII；人民币场外份额，A/C 类分别计数。来源页面日期 " + (payload.sourceDataDates?.[0] || "未提供") + "；公告发布日期未自动核验。";
    renderQdiiLimits();
  } catch {
    label.textContent = qdiiView.payload ? "限额快照刷新失败，保留上一版" : "限额数据暂时不可用";
    if (!qdiiView.payload) qdii$("#qdiiRows").innerHTML = '<tr><td colspan="6">限额源暂时不可用。请稍后刷新；不要把空白当作无限额。</td></tr>';
  }
}

qdii$$("[data-qdii-category]").forEach((button) => button.addEventListener("click", () => {
  qdiiView.category = button.dataset.qdiiCategory;
  qdiiView.shown = 30;
  renderQdiiLimits();
}));
qdii$("#qdiiSearch")?.addEventListener("input", () => { qdiiView.shown = 30; renderQdiiLimits(); });
qdii$("#qdiiHeldOnly")?.addEventListener("change", () => { qdiiView.shown = 30; renderQdiiLimits(); });
qdii$("#qdiiStatusFilter")?.addEventListener("change", () => { qdiiView.shown = 30; renderQdiiLimits(); });
qdii$("#qdiiMoreButton")?.addEventListener("click", () => { qdiiView.shown += 30; renderQdiiLimits(); });
qdii$("#qdiiRefreshButton")?.addEventListener("click", refreshQdiiLimits);
qdii$("#refreshButton")?.addEventListener("click", refreshQdiiLimits);
const fundConnector = qdii$(".fund-logo")?.parentElement;
if (fundConnector) {
  fundConnector.querySelector("strong").textContent = "基金：净值与 QDII 限额";
  fundConnector.querySelector("small").textContent = "净值每日更新；天天基金申购状态约每小时更新；直销和支付宝待核验";
  fundConnector.querySelector(".connector-status").textContent = "部分接入";
}
refreshQdiiLimits();
window.setInterval(refreshQdiiLimits, 15 * 60 * 1000);
