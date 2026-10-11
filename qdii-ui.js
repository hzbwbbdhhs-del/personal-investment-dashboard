// Channel limits are issuer announcement rules, never copied from another distributor.
// Ant Fund's public page supplies saleStatus only; its 0-- limit is a placeholder.
const qdiiView = { payload: null, rules: null, category: "all", shown: 30 };
const qdii$ = selector => document.querySelector(selector);
const qdii$$ = selector => [...document.querySelectorAll(selector)];
const qdiiEscape = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const qdiiRecent = stamp => {
  const age = Date.now() - new Date(stamp).getTime();
  return Number.isFinite(age) && age >= -60000 && age <= 90 * 60 * 1000;
};
const qdiiTime = stamp => {
  const time = new Date(stamp);
  return Number.isFinite(time.getTime()) ? time.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "未核验";
};
const qdiiHeldCodes = () => new Set(holdings.map(item => item.code).filter(code => /^\d{6}$/.test(code || "")));
function qdiiScopeFunds() {
  const held = qdiiHeldCodes();
  const extras = Boolean(qdii$("#qdiiIncludeExtra")?.checked);
  return (qdiiView.payload?.funds || []).filter(f => (f.category !== "held" || held.has(f.code)) && (extras || (f.currency === "CNY" && !f.exchangeOnly)));
}
function qdiiEvidence(fund) {
  const evidence = fund.evidence;
  const rule = evidence ? { agency: evidence.agency?.status === 'suspended' ? 0 : evidence.agency?.amount,
    direct: evidence.direct?.status === 'suspended' ? 0 : evidence.direct?.amount } : null;
  const noticeDate = [evidence?.noticeDate, evidence?.agency?.noticeDate, evidence?.direct?.noticeDate].filter(Boolean).sort().at(-1) || '';
  const newNotice = (fund.latestNotices || []).find(n => n.date > noticeDate);
  const ruleValid = Boolean(evidence && !newNotice && !evidence.error && qdiiRecent(evidence.checkedAt) && qdiiRecent(fund.noticeCheckedAt));
  const antFresh = Boolean(fund.alipay && !fund.alipay.stale && qdiiRecent(fund.alipay.checkedAt));
  const antOpen = antFresh && fund.alipay.status === "正常申购";
  const antBlocked = antFresh && /暂停|不可售|停售|停止/.test(fund.alipay.status);
  const alipay = ruleValid && antOpen && Number.isFinite(rule.agency) && rule.agency > 0 && (fund.alipay.minimumCny == null || rule.agency >= fund.alipay.minimumCny) ? rule.agency : null;
  const direct = ruleValid && Number.isFinite(rule.direct) && rule.direct > 0 ? rule.direct : null;
  const channel = qdii$("#qdiiChannelFilter")?.value || "either";
  const available = channel === "alipay" ? alipay : channel === "direct" ? direct : Math.max(alipay || 0, direct || 0) || null;
  const paused = channel === "alipay" ? antBlocked || (ruleValid && rule.agency === 0) : channel === "direct" ? ruleValid && rule.direct === 0 : (antBlocked || (ruleValid && rule.agency === 0)) && ruleValid && rule.direct === 0;
  return { rule, ruleValid, newNotice, antFresh, antOpen, antBlocked, alipay, direct, available, paused };
}
function qdiiCompare(a, b) {
  const left = qdiiEvidence(a), right = qdiiEvidence(b);
  const rank = (f, e) => f.category === "held" ? 0 : e.available ? 3 : e.antOpen ? 2 : e.paused ? -1 : 1;
  return rank(b, right) - rank(a, left)
    || (right.available || 0) - (left.available || 0)
    || Number(qdiiHeldCodes().has(b.code)) - Number(qdiiHeldCodes().has(a.code))
    || a.code.localeCompare(b.code);
}
function qdiiAmount(amount) {
  return amount === 0 ? '<span class="qdii-state paused">暂停申购</span>' : '<strong class="qdii-reference-value">¥' + Number(amount).toLocaleString("zh-CN") + '/日</strong>';
}
function qdiiChannelHtml(fund, evidence, channel) {
  const { rule, ruleValid, antFresh, antBlocked, newNotice } = evidence;
  if (fund.exchangeOnly) return '<span class="qdii-unverified">场内 ETF</span><small>券商二级市场买卖，不适用支付宝/直销日限额</small>';
  if (fund.currency !== "CNY") return '<span class="qdii-unverified">美元份额</span><small>未核美元渠道额度；不可沿用人民币上限</small>';
  const amount = rule?.[channel === "alipay" ? "agency" : "direct"];
  const status = channel === "alipay" ? '<span class="qdii-state ' + (antFresh ? antBlocked ? "paused" : evidence.antOpen ? "open" : "unknown" : "unknown") + '">' + qdiiEscape(antFresh ? fund.alipay.status : "在售状态待更新") + '</span><small>蚂蚁基金公开页 · ' + qdiiTime(fund.alipay?.checkedAt) + '</small>' : "";
  const parsed = fund.evidence?.[channel === 'alipay' ? 'agency' : 'direct'];
  const actualUnknown = channel === 'alipay' ? '<small>支付宝实际限额：未获取（以买入页为准）</small>' : '<small>直销买入页是否在售：未核实</small>';
  if (!ruleValid || amount == null) return status + '<span class="qdii-unverified">' + (fund.category === 'held' ? '自动公告解析暂不覆盖此持仓' : newNotice && fund.evidence ? "有更新公告，旧额度不沿用" : rule ? "公告证据过期或解析未完成" : "公告额度暂未获取") + '</span>' + actualUnknown;
  const effective = parsed?.effectiveDate || '公告未注明';
  if (channel === 'alipay') return status + '<span class="qdii-unverified">每日限额：未确认</span><small>支付宝买入页未接入，不能确认可买金额</small><details><summary>公告参考</summary>' + qdiiAmount(amount) + '<small>这是代销公告上限，不是支付宝实测额度；生效 ' + qdiiEscape(effective) + '</small></details>';
  if (channel === "alipay" && antBlocked && amount > 0) return status + '<small>公告代销上限 ¥' + Number(amount).toLocaleString("zh-CN") + '/日；支付宝当前不可买</small><small>生效 ' + qdiiEscape(effective) + '</small>';
  return qdiiAmount(amount) + '<small>直销公告上限（参考）</small>';
}
function renderQdiiLimits() {
  if (!qdiiView.payload) return;
  const held = qdiiHeldCodes();
  const search = (qdii$("#qdiiSearch")?.value || "").trim().toLowerCase();
  const status = qdii$("#qdiiStatusFilter")?.value || "all";
  const scope = qdiiScopeFunds();
  const selected = scope.filter(fund => {
    const e = qdiiEvidence(fund);
    return (qdiiView.category === "all" || fund.category === qdiiView.category)
      && (!qdii$("#qdiiHeldOnly")?.checked || held.has(fund.code))
      && (status === "all" || status === "available" && e.available || status === "paused" && e.paused || status === "unknown" && !e.available && !e.paused)
      && (!search || (fund.name + " " + fund.code).toLowerCase().includes(search));
  }).sort(qdiiCompare);
  const visible = selected.slice(0, qdiiView.shown);
  const labels = { nasdaq100: "纳指100", sp500: "标普500", held: "我的其他持仓" };
  qdii$("#qdiiRows").innerHTML = visible.map(fund => {
    const e = qdiiEvidence(fund);
    const parsedLinks = ['agency', 'direct'].map(channel => {
      const parsed = fund.evidence?.[channel];
      return parsed?.sourceUrl ? '<a href="' + qdiiEscape(parsed.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + (channel === 'agency' ? '代销' : '直销') + '公告证据 ↗</a><small>发布 ' + qdiiEscape(parsed.noticeDate || '未注明') + ' · 生效 ' + qdiiEscape(parsed.effectiveDate || '未注明') + '</small><small>解析 ' + qdiiTime(parsed.checkedAt) + '；直销买入页是否在售未核实。单基金账户单日累计，份额合并规则见原公告。</small>' : '';
    }).join('');
    const check = fund.comparison;
    const comparisonFresh = check && !check.stale && Date.now() - new Date(check.sourceUpdatedAt).getTime() < 26 * 60 * 60 * 1000;
    const sameChannel = fund.evidence?.sourceAmount;
    const conflict = comparisonFresh && Number.isFinite(sameChannel) && Number.isFinite(check.amount) && sameChannel !== check.amount;
    const comparisonHtml = check ? '<small>汇总交叉检查：' + qdiiEscape(check.status) + (check.amount != null ? ' ¥' + Number(check.amount).toLocaleString('zh-CN') + '/日' : '') + '</small><small>天天基金参考，非支付宝/直销 · 数据 ' + qdiiTime(check.sourceUpdatedAt) + (comparisonFresh ? '' : '（过期/采集失败）') + '</small>' + (conflict ? '<small class="qdii-conflict">同渠道参考数值不一致，请核对原公告；不自动替换额度</small>' : '') : '';
    const sources = '<details><summary>查看来源与采集时间</summary>' + parsedLinks + comparisonHtml
      + (fund.alipay ? '<a href="' + qdiiEscape(fund.alipay.sourceUrl) + '" target="_blank" rel="noopener noreferrer">支付宝公开资料 ↗</a>' : '')
      + '<details><summary>最新公告与其他参考</summary>' + (fund.latestNotices || []).slice(0, 3).map(n => '<a href="' + qdiiEscape(n.url) + '" target="_blank" rel="noopener noreferrer">' + qdiiEscape(n.date + " " + n.title) + ' ↗</a>').join("")
      + '<small>公告索引检查 ' + qdiiTime(fund.noticeCheckedAt) + '</small><a href="' + qdiiEscape(fund.sourceUrl) + '" target="_blank" rel="noopener noreferrer">天天基金参考（非支付宝） ↗</a>'
      + (qdiiRecent(qdiiView.payload.universeCheckedAt || qdiiView.payload.updatedAt) && fund.quotaCny != null ? '<small>该第三方渠道参考 ¥' + Number(fund.quotaCny).toLocaleString("zh-CN") + '/日，不参与排序</small>' : '') + '</details></details>';
    return '<tr><td data-label="基金"><strong>' + qdiiEscape(fund.name) + (held.has(fund.code) ? '<span class="qdii-held">我的持仓</span>' : '') + '</strong><small>' + qdiiEscape(fund.code + " · " + labels[fund.category]) + (fund.currency === "USD" ? ' · 美元' : '') + '</small></td>'
      + '<td data-label="支付宝代销">' + qdiiChannelHtml(fund, e, "alipay") + '</td><td data-label="基金公司直销">' + qdiiChannelHtml(fund, e, "direct") + '</td>'
      + '<td data-label="来源与说明">' + sources + (e.newNotice ? '<small class="qdii-conflict">新公告需核对，不沿用旧额度</small>' : '') + '</td></tr>';
  }).join("") || '<tr><td colspan="4">没有符合条件的基金；可以清空搜索或调整筛选。</td></tr>';
  qdii$("#qdiiCount").textContent = selected.length + " 只";
  qdii$("#qdiiShown").textContent = "已显示 " + visible.length + " / " + selected.length + " 只";
  qdii$("#qdiiMoreButton").hidden = visible.length >= selected.length;
  qdii$("#qdiiMarketCount").textContent = scope.length;
  qdii$("#qdiiQuotaCount").textContent = scope.filter(f => qdiiEvidence(f).antFresh).length;
  qdii$("#qdiiNoticeCount").textContent = scope.filter(f => qdiiEvidence(f).ruleValid && qdiiEvidence(f).rule?.direct != null).length;
  const availableIndices = scope.filter(f => f.category !== "held" && qdiiEvidence(f).available).length;
  qdii$("#qdiiScope").textContent = "默认人民币场外：你的持仓＋大陆公募纳指100/标普500。自动解析出公告参考额度的指数份额 " + availableIndices + " 只优先，按所选渠道参考上限从高到低排；不代表买入页实测可买。完整名录 " + qdiiView.payload.funds.length + " 个份额。主动QDII自动解析暂不覆盖，缺数据不代表不限购；A/C是否合并请阅读原公告。";
  qdii$$("[data-qdii-category]").forEach(button => {
    const active = button.dataset.qdiiCategory === qdiiView.category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active);
  });
}
async function qdiiFetch(path) {
  if (location.hostname.endsWith("github.io")) {
    try {
      const result = await fetch("https://raw.githubusercontent.com/hzbwbbdhhs-del/personal-investment-dashboard/main/" + path + "?ts=" + Date.now(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!result.ok) throw new Error("HTTP " + result.status);
      return await result.json();
    } catch { /* Pages copy is a fallback, with its own age checks. */ }
  }
  const response = await fetch("./" + path + "?ts=" + Date.now(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
async function refreshQdiiLimits() {
  const label = qdii$("#qdiiUpdatedAt");
  try {
    const payload = await qdiiFetch("qdii-limits.json");
    if (payload.status !== "available" || payload.schemaVersion < 2 || !Array.isArray(payload.funds) || payload.funds.length < 60) throw new Error("快照不完整");
    qdiiView.payload = payload;
    label.textContent = "采集 " + qdiiTime(payload.updatedAt) + "（北京时间）" + (qdiiRecent(payload.updatedAt) ? " · 定时检查，非逐秒实时" : " · 数据过期") + (payload.errors?.length ? " · 部分来源失败，见逐基金核验时间" : "") + (payload.catalogStale ? " · 名录未刷新，不保证完整" : "");
    label.textContent += ' · 公告解析 ' + qdiiTime(payload.evidenceSources?.parser?.checkedAt) + (payload.evidenceSources?.parser?.error ? '（部分失败）' : '') + ' · 汇总数据 ' + qdiiTime(payload.evidenceSources?.comparison?.sourceUpdatedAt);
    renderQdiiLimits();
  } catch {
    label.textContent = qdiiView.payload ? "刷新失败，保留原采集时间；过期额度自动隐藏" : "数据暂不可用，请稍后刷新";
    if (qdiiView.payload) renderQdiiLimits();
    else qdii$("#qdiiRows").innerHTML = '<tr><td colspan="4">数据源暂不可用；空白不代表不限购。</td></tr>';
  }
}
qdii$$("[data-qdii-category]").forEach(button => button.addEventListener("click", () => {
  qdiiView.category = button.dataset.qdiiCategory; qdiiView.shown = 30; renderQdiiLimits();
}));
["#qdiiSearch", "#qdiiHeldOnly", "#qdiiStatusFilter", "#qdiiChannelFilter", "#qdiiIncludeExtra"].forEach(selector => qdii$(selector)?.addEventListener(selector === "#qdiiSearch" ? "input" : "change", () => { qdiiView.shown = 30; renderQdiiLimits(); }));
qdii$("#qdiiMoreButton")?.addEventListener("click", () => { qdiiView.shown += 30; renderQdiiLimits(); });
qdii$("#qdiiRefreshButton")?.addEventListener("click", refreshQdiiLimits);
qdii$("#refreshButton")?.addEventListener("click", refreshQdiiLimits);
refreshQdiiLimits();
window.setInterval(refreshQdiiLimits, 15 * 60 * 1000);
window.setInterval(renderQdiiLimits, 60 * 1000);
document.addEventListener?.('visibilitychange', () => { if (!document.hidden) refreshQdiiLimits(); });
window.addEventListener?.('online', refreshQdiiLimits);
