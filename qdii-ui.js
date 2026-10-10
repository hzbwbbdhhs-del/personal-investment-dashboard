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
  "017730": { date: "2026-07-23", direct: "¥100,000/日", agency: "非直销 ¥1,000/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "017731": { date: "2026-07-23", direct: "¥100,000/日", agency: "非直销 ¥1,000/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "000043": { date: "2025-11-04", direct: "¥100,000/日", agency: "非直销 ¥100/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "016532": { date: "2026-02-03", direct: "暂停申购", agency: "暂停申购", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "016533": { date: "2026-02-03", direct: "暂停申购", agency: "暂停申购", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "000988": { date: "2025-03-17", direct: "未分渠道 ¥100/日", agency: "未分渠道 ¥100/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "070012": { date: "2025-03-20", direct: "未分渠道 ¥100/日", agency: "未分渠道 ¥100/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "013328": { date: "2025-03-17", direct: "未分渠道 ¥100/日", agency: "未分渠道 ¥100/日", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "017429": { date: "2025-03-17", direct: "未分渠道，官网表暂无限额", agency: "未分渠道，官网表暂无限额", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
  "017431": { date: "2025-03-17", direct: "未分渠道，官网表暂无限额", agency: "未分渠道，官网表暂无限额", sourceType: "官网限额表", checkedAt: "2026-10-11", url: "https://www.jsfund.cn/main/a/20151216/191092.shtml" },
};
const qdii$ = (selector) => document.querySelector(selector);
const qdii$$ = (selector) => [...document.querySelectorAll(selector)];

function qdiiEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function qdiiHeldCodes() {
  return new Set(holdings.map((item) => item.code).filter((code) => /^\d{6}$/.test(code || "")));
}

function qdiiNoticeConflict(fund) {
  const agency = qdiiNotices[fund.code]?.agency;
  if (!agency) return false;
  if (agency === "暂停申购") return fund.status !== "暂停申购";
  const limitText = agency.match(/¥([\d,]+)/)?.[1];
  if (!limitText) return false;
  const publishedLimit = Number(limitText.replaceAll(",", ""));
  return fund.status === "暂停申购" || (fund.status === "限大额" && fund.quotaCny != null && publishedLimit !== Number(fund.quotaCny));
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
  selected.sort((a, b) => Number(heldCodes.has(b.code)) - Number(heldCodes.has(a.code)) || Number(Boolean(qdiiNotices[b.code])) - Number(Boolean(qdiiNotices[a.code])) || a.code.localeCompare(b.code));
  const visible = selected.slice(0, qdiiView.shown);
  const categoryLabel = { nasdaq100: "纳指100", sp500: "标普500", active: "主动型" };
  const stateClass = (value) => value === "开放申购" ? "open" : value === "限大额" ? "limited" : value === "暂停申购" ? "paused" : "unknown";
  const collectedAt = new Date(payload.updatedAt);
  const isRecent = Number.isFinite(collectedAt.getTime()) && Date.now() >= collectedAt.getTime() && Date.now() - collectedAt.getTime() <= 90 * 60 * 1000;
  const html = visible.map((fund) => {
    const notice = qdiiNotices[fund.code];
    const held = heldCodes.has(fund.code) ? '<span class="qdii-held">我的持仓</span>' : "";
    const code = qdiiEscape(fund.code);
    const category = categoryLabel[fund.category] || "—";
    const conflict = isRecent && qdiiNoticeConflict(fund);
    const reference = !isRecent
      ? '<span class="qdii-state unknown">快照过期</span><small>上次记录：' + qdiiEscape(fund.status) + '；额度暂不展示</small>'
      : fund.status === "限大额" && fund.quotaCny != null
        ? '<span class="qdii-state limited">限大额</span><strong class="qdii-reference-value">¥' + Number(fund.quotaCny).toLocaleString("zh-CN") + '/日</strong><small>天天基金页面参考，非支付宝额度</small>' + (conflict ? '<small class="qdii-conflict">与已收录代销公告口径不同，待复核</small>' : '')
        : '<span class="qdii-state ' + stateClass(fund.status) + '">' + qdiiEscape(fund.status) + '</span><small>' + (fund.status === "开放申购" ? "该页面未列出限额；不代表不限购" : "天天基金页面参考") + '</small>';
    const direct = notice?.direct
      ? '<strong>' + qdiiEscape(notice.direct) + '</strong><small>' + (notice.sourceType || '官网公告') + ' · 规则日期 ' + notice.date + (notice.checkedAt ? ' · 核验 ' + notice.checkedAt : '；后续调整待复核') + '</small>'
      : '<span class="qdii-unverified">尚无已核公告</span>';
    const alipay = notice?.agency
      ? '<strong>' + qdiiEscape(notice.agency) + '</strong><small>' + (notice.sourceType ? '基金官网记录' : '基金公告代销口径') + '；支付宝实际可买额度待核对' + (conflict ? '；与公开参考不同' : '') + '</small>'
      : '<span class="qdii-unverified">支付宝待核对</span><small>不可沿用天天基金参考额</small>';
    return '<tr><td data-label="基金"><strong>' + qdiiEscape(fund.name) + held + '</strong><small>' + code + ' · ' + qdiiEscape(category) + '</small></td>'
      + '<td data-label="公开参考">' + reference + '</td>'
      + '<td data-label="官网直销">' + direct + '</td>'
      + '<td data-label="支付宝代销">' + alipay + '</td>'
      + '<td data-label="核对来源">' + (notice ? '<a href="' + notice.url + '" target="_blank" rel="noopener noreferrer">基金公司' + (notice.sourceType ? '官网' : '公告') + ' ↗</a><small>' + (notice.sourceType ? '官网表规则日期 ' : '公告发布 ') + notice.date + (notice.checkedAt ? '；核验 ' + notice.checkedAt : '') + '</small>' : '')
      + '<a href="' + qdiiEscape(fund.sourceUrl || 'https://fundf10.eastmoney.com/jjfl_' + code + '.html') + '" target="_blank" rel="noopener noreferrer">天天基金参考页 ↗</a></td></tr>';
  }).join("");
  qdii$("#qdiiRows").innerHTML = html || '<tr><td colspan="5">没有符合条件的基金。可清空搜索或切换筛选条件。</td></tr>';
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
    let response;
    if (location.hostname.endsWith("github.io")) {
      try {
        response = await fetch("https://raw.githubusercontent.com/hzbwbbdhhs-del/personal-investment-dashboard/main/qdii-limits.json?ts=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
      } catch {
        response = await fetch("./qdii-limits.json?ts=" + Date.now(), { cache: "no-store" });
      }
    } else {
      response = await fetch("./qdii-limits.json?ts=" + Date.now(), { cache: "no-store" });
    }
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    if (payload.status !== "available" || !Array.isArray(payload.funds) || payload.funds.length < 100) throw new Error("限额快照不完整");
    qdiiView.payload = payload;
    const updated = new Date(payload.updatedAt);
    const stale = !Number.isFinite(updated.getTime()) || Date.now() < updated.getTime() || Date.now() - updated.getTime() > 90 * 60 * 1000;
    const time = Number.isFinite(updated.getTime()) ? updated.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "未知";
    label.textContent = "第三方快照采集于 " + time + "（北京时间）" + (stale ? " · 已过期，隐藏参考额度" : " · 非实时限额");
    qdii$("#qdiiMarketCount").textContent = String(payload.funds.length);
    qdii$("#qdiiQuotaCount").textContent = String(stale ? 0 : payload.funds.filter((fund) => fund.status === "限大额" && Number.isFinite(Number(fund.quotaCny)) && fund.quotaCny != null).length);
    qdii$("#qdiiNoticeCount").textContent = String(payload.funds.filter((fund) => Boolean(qdiiNotices[fund.code])).length);
    const conflicts = payload.funds.filter(qdiiNoticeConflict).length;
    qdii$("#qdiiScope").textContent = "公开页面覆盖纳指100 " + (payload.counts?.nasdaq100 || 0) + " 只、标普500 " + (payload.counts?.sp500 || 0) + " 只、主动型 QDII " + (payload.counts?.active || 0) + " 只（含 A/C 等份额）。源页面显示的数据日：" + (payload.sourceDataDates || []).join("、") + "；采集时间不等于各基金限额公告生效日。" + (!stale && conflicts ? " 有 " + conflicts + " 只的公开参考与已收录代销公告口径不同，已标出待复核。" : "");
    renderQdiiLimits();
  } catch {
    label.textContent = qdiiView.payload ? "限额快照刷新失败，保留上一版" : "限额数据暂时不可用";
    if (!qdiiView.payload) qdii$("#qdiiRows").innerHTML = '<tr><td colspan="5">限额源暂时不可用。请稍后刷新；不要把空白当作无限额。</td></tr>';
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
