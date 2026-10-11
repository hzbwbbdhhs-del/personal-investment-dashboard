// Channel limits are issuer announcement rules, never copied from another distributor.
// Ant Fund's public page supplies saleStatus only; its 0-- limit is a placeholder.
const qdiiView = { payload: null, rules: null, category: "all", shown: 30, refreshFailed: false };
const qdii$ = selector => document.querySelector(selector);
const qdii$$ = selector => [...document.querySelectorAll(selector)];
const qdiiEscape = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const qdiiRecent = stamp => {
  const age = Date.now() - new Date(stamp).getTime();
  return Number.isFinite(age) && age >= -60000 && age <= 90 * 60 * 1000;
};
const qdiiTime = stamp => {
  if (!stamp) return "未核实";
  const time = new Date(stamp);
  return Number.isFinite(time.getTime()) ? time.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "未核实";
};
function renderQdiiUpdateTimes() {
  const payload = qdiiView.payload;
  if (!payload) return;
  for (const [selector, stamp] of [
    ["#qdiiCollectedAt", payload.updatedAt],
    ["#qdiiParserAt", payload.evidenceSources?.parser?.checkedAt],
    ["#qdiiComparisonAt", payload.evidenceSources?.comparison?.sourceUpdatedAt]
  ]) {
    const node = qdii$(selector);
    if (!node) continue;
    node.textContent = qdiiTime(stamp);
    if (stamp && Number.isFinite(new Date(stamp).getTime())) node.setAttribute("datetime", new Date(stamp).toISOString());
    else node.removeAttribute("datetime");
  }
  const status = [qdiiRecent(payload.updatedAt) ? "定时检查 · 非逐秒实时" : "采集数据过期"];
  if (qdiiView.refreshFailed) status.push("刷新失败，保留原时间");
  if (payload.errors?.length || payload.evidenceSources?.parser?.error) status.push("部分来源失败");
  if (payload.catalogStale) status.push("基金名录未刷新");
  const node = qdii$("#qdiiUpdatedAt");
  if (node) node.textContent = status.join(" · ");
}
const qdiiHeldCodes = () => new Set(holdings.map(item => item.code).filter(code => /^\d{6}$/.test(code || "")));
const qdiiHeldActiveCodes = () => new Set(holdings.filter(item => item.category === "主动 QDII" && Number(item.value) > 0).map(item => item.code).filter(code => /^\d{6}$/.test(code || "")));
function qdiiScopeFunds() {
  const activeHeld = qdiiHeldActiveCodes();
  const extras = Boolean(qdii$("#qdiiIncludeExtra")?.checked);
  return (qdiiView.payload?.funds || []).filter(f =>
    (f.category === "nasdaq100" || f.category === "sp500" || (f.category === "held" && activeHeld.has(f.code) && !/指数|ETF|联接/i.test(f.name)))
    && (extras || (f.currency === "CNY" && !f.exchangeOnly)));
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
  const available = channel === "alipay" ? alipay : channel === "direct" ? direct : alipay == null && direct == null ? null : (alipay ?? 0) + (direct ?? 0);
  const paused = channel === "alipay" ? antBlocked || (ruleValid && rule.agency === 0) : channel === "direct" ? ruleValid && rule.direct === 0 : (antBlocked || (ruleValid && rule.agency === 0)) && ruleValid && rule.direct === 0;
  return { rule, ruleValid, newNotice, antFresh, antOpen, antBlocked, alipay, direct, available, paused };
}
function qdiiCompare(a, b) {
  const left = qdiiEvidence(a), right = qdiiEvidence(b);
  const holdingDifference = (qdiiHoldingValue(b.code) ?? -1) - (qdiiHoldingValue(a.code) ?? -1);
  if (qdii$("#qdiiSortSelect")?.value === "holding" && holdingDifference) return holdingDifference;
  const leftTotal = qdiiCombinedQuota(a, left), rightTotal = qdiiCombinedQuota(b, right);
  return (rightTotal.amount ?? -1) - (leftTotal.amount ?? -1)
    || Number(rightTotal.complete) - Number(leftTotal.complete)
    || holdingDifference
    || a.code.localeCompare(b.code);
}
function qdiiHoldingValue(code) {
  const records = holdings.filter(item => item.code === code);
  if (!records.length) return null;
  const values = records.map(item => typeof valuationFor === 'function' ? valuationFor(item).value : Number(item.value));
  return values.every(value => Number.isFinite(value) && value >= 0) ? values.reduce((sum, value) => sum + value, 0) : null;
}
function qdiiCombinedQuota(fund, evidence) {
  if (fund.exchangeOnly || fund.currency !== 'CNY') return { amount: null, complete: false };
  const agency = evidence.antBlocked || evidence.ruleValid && evidence.rule?.agency === 0 ? 0 : evidence.alipay;
  const direct = evidence.ruleValid && evidence.rule?.direct === 0 ? 0 : evidence.direct;
  const known = [direct, agency].filter(value => Number.isFinite(value) && value >= 0);
  return { amount: known.length ? known.reduce((sum, value) => sum + value, 0) : null, complete: known.length === 2 };
}
function qdiiRowSummary(fund, evidence) {
  const total = qdiiCombinedQuota(fund, evidence);
  const holding = qdiiHoldingValue(fund.code);
  const quota = total.amount == null ? '直销＋代销参考合计：待核实' : '直销＋代销参考合计：¥' + total.amount.toLocaleString('zh-CN') + '/日' + (total.complete ? '' : '（仅已知渠道）');
  return '<small>' + quota + '</small>' + (holding == null ? '' : '<small>我的持仓金额（估算）：¥' + holding.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</small>');
}
function qdiiAmount(amount) {
  return amount === 0 ? '<span class="qdii-state paused">暂停申购</span>' : '<strong class="qdii-reference-value">¥' + Number(amount).toLocaleString("zh-CN") + '/日</strong>';
}
function qdiiDirectPlatform(fund) {
  const managers = ['工银瑞信', '交银施罗德', '景顺长城', '浦银安盛', '华泰柏瑞', '汇添富', '易方达', '国泰', '南方', '大成', '建信', '华安', '广发', '摩根', '招商', '宝盈', '天弘', '博时', '嘉实', '富国', '华夏', '华宝', '海富通', '银华', '万家', '中银', '诺安', '鹏华', '融通', '国富', '国联安', '国联', '长城'];
  const manager = managers.find(name => String(fund.name || '').startsWith(name));
  return manager ? (manager === '国富' ? '国海富兰克林' : manager) + '基金官方直销' : '基金公司官方直销';
}
function qdiiChannelHtml(fund, evidence, channel) {
  const { rule, ruleValid, antFresh, antBlocked, newNotice } = evidence;
  if (fund.exchangeOnly) return '<span class="qdii-unverified">场内 ETF</span><small>券商二级市场买卖，不适用支付宝/直销日限额</small>';
  if (fund.currency !== "CNY") return '<span class="qdii-unverified">美元份额</span><small>未核美元渠道额度；不可沿用人民币上限</small>';
  const amount = rule?.[channel === "alipay" ? "agency" : "direct"];
  const status = channel === "alipay" ? '<span class="qdii-state ' + (antFresh ? antBlocked ? "paused" : evidence.antOpen ? "open" : "unknown" : "unknown") + '">' + qdiiEscape(antFresh ? fund.alipay.status : "在售状态待更新") + '</span>' : "";
  const parsed = fund.evidence?.[channel === 'alipay' ? 'agency' : 'direct'];
  const platform = channel === 'direct' ? '<small>平台：' + qdiiEscape(qdiiDirectPlatform(fund)) + '（公告口径）</small>' : '';
  const saleTime = channel === 'alipay' ? '<small>在售状态核实：' + qdiiTime(fund.alipay?.checkedAt) + (antFresh ? '' : '（未取得最新状态）') + '</small>' : '';
  if (!ruleValid || amount == null) {
    const reason = fund.category === 'held' ? '此持仓尚无自动解析额度' : newNotice && fund.evidence ? '有更新公告，旧额度不沿用' : rule ? '公告证据过期或解析未完成' : '公告额度暂未获取';
    const lastCheck = parsed?.checkedAt || fund.evidence?.checkedAt;
    return status + '<span class="qdii-unverified">金额：未核实</span>' + platform + '<small>额度核实时间：未核实</small>' + (lastCheck ? '<small>上次公告检查：' + qdiiTime(lastCheck) + '</small>' : '') + saleTime + '<small>' + reason + '</small>';
  }
  const quotaTime = '<small>核实时间：' + qdiiTime(parsed?.checkedAt || fund.evidence.checkedAt) + '（公告自动核验）</small>';
  if (channel === 'alipay') return status + qdiiAmount(amount) + '<small>代销公告上限；支付宝实际限额未核实</small>' + quotaTime + saleTime + (antBlocked ? '<small>支付宝公开在售状态为不可买</small>' : '');
  return qdiiAmount(amount) + platform + quotaTime + '<small>直销公告上限；买入页是否在售未核实</small>';
}
function renderQdiiLimits() {
  renderQdiiUpdateTimes();
  if (!qdiiView.payload) return;
  const held = qdiiHeldCodes();
  const search = (qdii$("#qdiiSearch")?.value || "").trim().toLowerCase();
  const status = qdii$("#qdiiStatusFilter")?.value || "all";
  const scope = qdiiScopeFunds();
  const selected = scope.filter(fund => {
    const e = qdiiEvidence(fund);
    return (qdiiView.category === "all" || fund.category === qdiiView.category)
      && (!qdii$("#qdiiHeldOnly")?.checked || held.has(fund.code))
      && (!qdii$("#qdiiChangedOnly")?.checked || (typeof qdiiInsights !== 'undefined' && qdiiInsights.history?.events?.some(event=>event.code===fund.code)))
      && (status === "all" || status === "available" && e.available || status === "paused" && e.paused || status === "unknown" && !e.available && !e.paused)
      && (!search || (fund.name + " " + fund.code).toLowerCase().includes(search));
  }).sort(qdiiCompare);
  const visible = selected.slice(0, qdiiView.shown);
  const labels = { nasdaq100: "纳指100", sp500: "标普500", held: "我的主动 QDII" };
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
    return '<tr><td data-label="基金"><strong>' + qdiiEscape(fund.name) + (held.has(fund.code) ? '<span class="qdii-held">我的持仓</span>' : '') + '</strong><small>' + qdiiEscape(fund.code + " · " + labels[fund.category]) + (fund.currency === "USD" ? ' · 美元' : '') + '</small>' + qdiiRowSummary(fund, e) + '</td>'
      + '<td data-label="支付宝代销">' + qdiiChannelHtml(fund, e, "alipay") + '</td><td data-label="基金公司直销">' + qdiiChannelHtml(fund, e, "direct") + '</td>'
      + '<td data-label="来源与说明">' + sources + (e.newNotice ? '<small class="qdii-conflict">新公告需核对，不沿用旧额度</small>' : '') + '</td></tr>';
  }).join("") || '<tr><td colspan="4">没有符合条件的基金；可以清空搜索或调整筛选。</td></tr>';
  qdii$("#qdiiCount").textContent = selected.length + " 只";
  qdii$("#qdiiShown").textContent = "已显示 " + visible.length + " / " + selected.length + " 只";
  qdii$("#qdiiMoreButton").hidden = visible.length >= selected.length;
  qdii$("#qdiiMarketCount").textContent = scope.length;
  qdii$("#qdiiQuotaCount").textContent = scope.filter(f => qdiiEvidence(f).antFresh).length;
  qdii$("#qdiiNoticeCount").textContent = scope.filter(f => qdiiEvidence(f).ruleValid && qdiiEvidence(f).rule?.direct != null).length;
  const sorting = qdii$("#qdiiSortSelect")?.value === 'holding' ? '按我的持仓金额从高到低排；同一代码跨渠道持仓合并，未持有基金置后。' : '按直销＋代销已知参考上限之和从高到低排；暂停渠道不计入，缺失渠道不假定为零。';
  qdii$("#qdiiScope").textContent = sorting + '合计未扣跨渠道共享额度，不保证实际可以买满；支付宝实际限额未核实。仅显示纳指100、标普500和我持有的主动型QDII；默认人民币场外，其他基金不显示。持仓金额沿用总览净值估算；A/C合并规则以公告为准。';
  qdii$$("[data-qdii-category]").forEach(button => {
    const active = button.dataset.qdiiCategory === qdiiView.category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active);
  });
  if (typeof renderQdiiInsights === 'function') renderQdiiInsights();
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
    qdiiView.refreshFailed = false;
    renderQdiiLimits();
  } catch {
    qdiiView.refreshFailed = true;
    label.textContent = qdiiView.payload ? "刷新失败，保留原采集时间；过期额度自动隐藏" : "数据暂不可用，请稍后刷新";
    if (qdiiView.payload) renderQdiiLimits();
    else qdii$("#qdiiRows").innerHTML = '<tr><td colspan="4">数据源暂不可用；空白不代表不限购。</td></tr>';
  }
}
qdii$$("[data-qdii-category]").forEach(button => button.addEventListener("click", () => {
  qdiiView.category = button.dataset.qdiiCategory; qdiiView.shown = 30; renderQdiiLimits();
}));
["#qdiiSearch", "#qdiiHeldOnly", "#qdiiChangedOnly", "#qdiiStatusFilter", "#qdiiChannelFilter", "#qdiiSortSelect", "#qdiiIncludeExtra"].forEach(selector => qdii$(selector)?.addEventListener(selector === "#qdiiSearch" ? "input" : "change", () => { qdiiView.shown = 30; renderQdiiLimits(); }));
qdii$("#qdiiMoreButton")?.addEventListener("click", () => { qdiiView.shown += 30; renderQdiiLimits(); });
qdii$("#qdiiRefreshButton")?.addEventListener("click", refreshQdiiLimits);
qdii$("#refreshButton")?.addEventListener("click", refreshQdiiLimits);
refreshQdiiLimits();
window.setInterval(refreshQdiiLimits, 15 * 60 * 1000);
window.setInterval(renderQdiiLimits, 60 * 1000);
document.addEventListener?.('visibilitychange', () => { if (!document.hidden) refreshQdiiLimits(); });
window.addEventListener?.('online', refreshQdiiLimits);
