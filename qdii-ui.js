// The market-wide list is a third-party snapshot. A scrape timestamp is not
// an announcement date, and neither source proves the Alipay order-page limit.
const qdiiView = { payload: null, category: "all", shown: 30 };
const qdiiNotices = {
  "000834": {
    date: "2026-06-03",
    direct: "¥100/日",
    agency: "各代销机构 ¥10/日",
    url: "https://www.dcfund.com.cn/plat_files/upload/ann_upload/20260602/202606021780401593666.pdf",
  },
  "008971": {
    date: "2026-06-03",
    direct: "¥100/日",
    agency: "各代销机构 ¥10/日",
    url: "https://www.dcfund.com.cn/plat_files/upload/ann_upload/20260602/202606021780401593666.pdf",
  },
  "096001": {
    date: "2026-01-23",
    direct: "¥500/日",
    agency: "各代销机构 ¥50/日",
    url: "https://www.dcfund.com.cn/plat_files/upload/ann_upload/20260122/202601221769072007404.pdf",
  },
  "008401": {
    date: "2026-01-23",
    direct: "¥500/日",
    agency: "各代销机构 ¥50/日",
    url: "https://www.dcfund.com.cn/plat_files/upload/ann_upload/20260122/202601221769072007404.pdf",
  },
  "019547": {
    date: "2026-09-01",
    direct: "¥10/日",
    agency: null,
    url: "https://static.cmfchina.com/web/noticedetails/226000/index.html",
  },
  "019548": {
    date: "2026-09-01",
    direct: "¥10/日",
    agency: null,
    url: "https://static.cmfchina.com/web/noticedetails/226000/index.html",
  },
  "270042": {
    date: "2026-09-30",
    direct: "暂停申购",
    agency: "暂停申购",
    url: "https://www.gffunds.com.cn/jjgg/zdsj/202609/P020260930313803993540.pdf",
  },
  "006479": {
    date: "2026-09-30",
    direct: "暂停申购",
    agency: "暂停申购",
    url: "https://www.gffunds.com.cn/jjgg/zdsj/202609/P020260930313803993540.pdf",
  },
  "021778": {
    date: "2026-09-30",
    direct: "暂停申购",
    agency: "暂停申购",
    url: "https://www.gffunds.com.cn/jjgg/zdsj/202609/P020260930313803993540.pdf",
  },
};
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
  const collectedAt = new Date(payload.updatedAt);
  const isRecent = Number.isFinite(collectedAt.getTime()) && Date.now() >= collectedAt.getTime() && Date.now() - collectedAt.getTime() <= 90 * 60 * 1000;
  const html = visible.map((fund) => {
    const notice = qdiiNotices[fund.code];
    const thirdPartyHint = !isRecent ? "公开页面快照已过期" : fund.status === "限大额" && fund.quotaCny != null
      ? "第三方参考 ¥" + Number(fund.quotaCny).toLocaleString("zh-CN") + "/日"
      : "第三方页面：" + fund.status;
    const held = heldCodes.has(fund.code) ? '<span class="qdii-held">我的持仓</span>' : "";
    const code = qdiiEscape(fund.code);
    const direct = notice?.direct
      ? '<strong>' + qdiiEscape(notice.direct) + '</strong><small>基金公司公告 · ' + notice.date + '</small>'
      : '<strong>待核实</strong><small>尚未逐只核对基金官网</small>';
    const alipay = notice?.agency
      ? '<strong>' + qdiiEscape(notice.agency) + '</strong><small>公告口径；支付宝下单页待复核</small>'
      : '<strong>待核实</strong><small>未找到可确认支付宝的适用公告</small>';
    return '<tr><td><strong>' + qdiiEscape(fund.name) + held + '</strong><small>' + code + '</small></td>'
      + '<td>' + (categoryLabel[fund.category] || "—") + '</td>'
      + '<td>' + direct + '</td>'
      + '<td>' + alipay + '</td>'
      + '<td><span class="qdii-state ' + (isRecent ? stateClass(fund.status) : "unknown") + '">' + (isRecent ? qdiiEscape(fund.status) : "快照过期") + '</span><small>' + qdiiEscape(thirdPartyHint) + '</small></td>'
      + '<td>' + (notice ? '<a href="' + notice.url + '" target="_blank" rel="noopener noreferrer">基金公司公告 ↗</a><small>公告 ' + notice.date + '；继续检查后续公告</small>' : '<strong>未找到已核公告</strong><small>当前不展示推测额度</small>')
      + '<a href="https://fundf10.eastmoney.com/jjfl_' + code + '.html" target="_blank" rel="noopener noreferrer">第三方页面 ↗</a></td></tr>';
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
    const stale = !Number.isFinite(updated.getTime()) || Date.now() < updated.getTime() || Date.now() - updated.getTime() > 90 * 60 * 1000;
    const time = Number.isFinite(updated.getTime()) ? updated.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "未知";
    label.textContent = "第三方快照采集于 " + time + "（北京时间）" + (stale ? " · 已过期，隐藏参考额度" : " · 非实时限额");
    qdii$("#qdiiScope").textContent = "公开页面筛选出 " + (payload.counts?.nasdaq100 || 0) + " 只纳指100、" + (payload.counts?.sp500 || 0) + " 只标普500、" + (payload.counts?.active || 0) + " 只主动型 QDII；A/C 等份额分别计数，不代表覆盖全市场。快照只记录采集时间，不记录每只基金的公告生效日期。";
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
  fundConnector.querySelector("small").textContent = "QDII 分开显示基金公司直销、代销公告与支付宝待核状态";
  fundConnector.querySelector(".connector-status").textContent = "部分接入";
}
refreshQdiiLimits();
window.setInterval(refreshQdiiLimits, 15 * 60 * 1000);
