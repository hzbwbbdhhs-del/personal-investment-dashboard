// Read-only observation layer: never changes holdings or executes transactions.
const dashboardMonitor = { portfolioStatus: null, portfolioError: false, readAt: null };
function monitorTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未记录';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
function renderDashboardMonitor() {
  const checks = [];
  const notices = [];
  const funds = Object.values(fundData);
  const navDates = [...new Set(funds.map(fund => fund.latestDate).filter(Boolean))].sort();
  const navCheck = fundSnapshot.checkedAt;
  const navIssues = funds.filter(fund => dashboardCore.fundState(fund, fundSnapshot).level !== 'ok');
  const fundBad = feedErrors.fund || fundSnapshot.checkStatus === 'failed';
  checks.push({ name: '基金净值', level: fundBad ? 'error' : !funds.length || navIssues.length ? 'warning' : 'ok',
    value: fundBad ? '读取或检查失败' : !funds.length ? '等待数据' : navIssues.length ? `${navIssues.length}只需要留意` : `${funds.length}只已取数`,
    detail: `${navCheck ? '检查 ' + monitorTime(navCheck) : '文件更新 ' + monitorTime(fundSnapshot.updatedAt)}；净值 ${navDates.length ? navDates[0] + (navDates.length > 1 ? ' 至 ' + navDates.at(-1) : '') : '未取得'}` });
  if (fundBad || navIssues.length) notices.push({ level: 'warning', title: '净值状态需要留意', detail: fundBad ? '本次读取或源站检查失败，保留旧数据及原日期；稍后会自动重试。' : `${navIssues.length}只基金检查失败或日期较早。假期或披露延迟也可能造成日期较早，请展开查看。`, target: 'today-returns' });
  const marketValues = Object.values(marketSnapshot.market || {});
  const marketBad = feedErrors.market || marketSnapshot.checkStatus === 'failed';
  const marketStale = dashboardCore.ageDays(marketSnapshot.checkedAt || marketSnapshot.updatedAt) > 2 / 24;
  const marketPartial = marketSnapshot.checkStatus === 'partial' || marketValues.some(value => value.refreshStatus === 'failed' || value.status === 'error');
  checks.push({ name: '市场与宏观', level: marketBad ? 'error' : marketStale || marketPartial ? 'warning' : 'ok', value: marketBad ? '读取或检查失败' : marketStale ? '检查时间较久' : marketPartial ? '部分来源异常' : '日线 / 按发布周期', detail: `检查 ${monitorTime(marketSnapshot.checkedAt || marketSnapshot.updatedAt)}；非逐秒行情` });
  if ((marketBad || marketStale || marketPartial) && marketValues.length) notices.push({ level: 'warning', title: '市场数据需检查', detail: '部分来源异常或检查超过2小时；显示原观察日，暂不据此提高加仓档位。', target: 'market' });
  const qdii = typeof qdiiView !== 'undefined' ? qdiiView.payload : null;
  const qdiiBad = typeof qdiiView !== 'undefined' && qdiiView.refreshFailed;
  const qdiiStale = !qdii || !qdiiRecent(qdii.updatedAt);
  const qdiiPartial = Boolean(qdii?.errors?.length || qdii?.evidenceSources?.parser?.error || qdii?.catalogStale);
  checks.push({ name: 'QDII 额度', level: qdiiBad ? 'error' : qdiiStale || qdiiPartial ? 'warning' : 'ok', value: qdiiBad ? '读取失败' : qdiiStale ? '等待新快照' : qdiiPartial ? '部分来源异常' : '公告参考 · 分渠道', detail: `采集 ${monitorTime(qdii?.updatedAt)}；实际可买额以订单页为准` });
  const status = dashboardMonitor.portfolioStatus;
  const pending = status?.reconciliationRequired !== false;
  const settling = status?.settlementDetailsRequired === true;
  const banner = $('#reconcileBanner');
  if (banner) {
    banner.hidden = !pending && !settling;
    banner.querySelector('strong').textContent = dashboardMonitor.portfolioError ? '持仓核对状态暂不可用' : pending ? '持仓待对账 · 近期交易未补录' : '支付宝持仓已核对 · 赎回在途待拆分';
    banner.querySelector('p').textContent = status ? pending ? `${status.reportedOn}已知有新增卖出；${status.pendingRecordedRequests || 0}笔已记录赎回也待补成交/到账。金额与配置比例仅作旧持仓参考。` : '62笔与录屏总额一致；4笔赎回对应基金暂保留录屏金额，不重复记入现金。直销10笔无交易，保持原记录。' : '尚未读取到最新对账状态，暂不能将网站估值视为实际账户余额。';
  }
  if ($('#assetValueTag')) $('#assetValueTag').textContent = pending ? '持仓待对账' : settling ? '含在途 / 部分估算' : '净值估算';
  if ($('#assetTotalLabel')) $('#assetTotalLabel').textContent = pending ? '旧持仓参考估值' : '合并参考金额（含在途）';
  const receipt = window.portfolioSnapshot?.['支付宝账户快照'];
  const account = $('#accountReceipt');
  if (account && receipt) account.innerHTML = `<div class="receipt-heading"><strong>支付宝账户快照</strong><span>${escapeHtml(receipt['日期'])} ${escapeHtml(receipt['时间'])} · 录屏核对</span></div><div class="receipt-values">${[['总金额', receipt['总金额_元']], ['持有收益', receipt['持有收益_元']], ['录屏昨日收益', receipt['昨日收益_元']], ['累计收益', receipt['累计收益_元']]].map(([name, value]) => `<div><span>${name}</span><strong class="${name === '总金额' ? '' : value > 0 ? 'positive' : value < 0 ? 'negative' : ''}">${name !== '总金额' && value > 0 ? '+' : ''}${formatCurrency(value)}</strong></div>`).join('')}</div><small>62笔明细三项合计均相符。买入待确认 ${formatCurrency(receipt['买入待确认_元'])}；卖出将到账 ${formatCurrency(receipt['卖出将到账_元'])}，不额外加到总金额，也不作为已到账现金。此处保留录屏原值，非每日自动同步。</small>`;
  const strip = $('#feedStrip');
  if (strip) strip.innerHTML = checks.map(check => `<div class="feed-item feed-${check.level}"><span><i aria-hidden="true"></i>${check.name}</span><strong>${check.value}</strong><small>${escapeHtml(check.detail)}</small></div>`).join('') + `<button type="button" class="feed-details" data-monitor-section="settings">更新详情</button>`;
  // Use the source's NDX observation date, never the time this page refreshed.
  const ndx = marketSnapshot.market?.NDX;
  const band = dashboardCore.drawdownBand(ndx?.drawdownPct);
  if (!marketBad && !marketStale && ndx?.refreshStatus !== 'failed' && band != null && dashboardCore.ageDays(ndx.updatedAt) <= 5) {
    if (band > 0) notices.push({ level: 'warning', title: `纳指回撤 ${Math.abs(ndx.drawdownPct).toFixed(2)}%`, detail: `${ndx.updatedAt}日线，相对数据区间高点；对应原规则第${band + 1}档。${pending || settling ? '在途与持仓确认前，不据此自动增加投入。' : '结合可用资金与风险承受能力看原计划。'}`, target: 'market' });
  }
  if (qdii && !qdiiBad && !qdiiStale) {
    const opportunities = (qdii.funds || []).filter(fund => ['nasdaq100', 'sp500'].includes(fund.category) && fund.currency === 'CNY' && !fund.exchangeOnly).flatMap(fund => {
      const e = qdiiEvidence(fund);
      return [['直销公告', e.direct], ['代销公告（支付宝在售）', e.alipay]].filter(([, amount]) => Number.isFinite(amount) && amount >= 1000).map(([channel, amount]) => ({ fund, channel, amount }));
    }).sort((a, b) => b.amount - a.amount);
    if (opportunities.length) notices.push({ level: 'opportunity', title: `${opportunities.length}项单渠道公告额度 ≥1,000元/日`, detail: opportunities.slice(0, 2).map(item => `${item.fund.name} · ${item.channel} ${formatCurrency(item.amount)}/日`).join('；') + '。公告参考，不合并额度；下单页仍需确认。', target: 'qdii' });
  }
  const majorOnly = $('#majorChangeOnly')?.checked !== false;
  if (!majorOnly && funds.length) notices.push({ level: 'info', title: '日常数据摘要', detail: `已取得${funds.length}只基金净值，分布在${navDates.length}个净值日。不同日期的收益分开查看。`, target: 'today-returns' });
  const items = $('#attentionItems');
  if (items) items.innerHTML = notices.length ? notices.map(notice => `<button type="button" class="attention-item attention-${notice.level}" data-monitor-section="${notice.target}"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.detail)}</span><b aria-hidden="true">查看</b></button>`).join('') : '<p class="attention-empty">暂无触发条件的提示。数据缺失或额度未核实不代表市场没有风险、基金没有额度。</p>';
  if ($('#attentionCount')) $('#attentionCount').textContent = `${notices.length}项`;
  const detail = $('#updateHealthDetails');
  if (detail) detail.innerHTML = `<p>当前设备最近读取：${monitorTime(dashboardMonitor.readAt)}（北京时间）。读取时间不等于源站检查时间，也不等于净值日期。</p><div class="health-detail-list">${checks.map(check => `<div><strong>${check.name}：${check.value}</strong><span>${escapeHtml(check.detail)}</span></div>`).join('')}</div>` + (navIssues.length ? `<details><summary>${navIssues.length}只基金需要留意</summary>${navIssues.map(fund => `<p>${escapeHtml(fund.name || fund.code)}（${escapeHtml(fund.code)}）：${dashboardCore.fundState(fund, fundSnapshot).label}；净值日 ${escapeHtml(fund.latestDate || '未取得')}；上次成功 ${monitorTime(fund.lastSuccessAt)}</p>`).join('')}</details>` : '') + '<p>云端继续使用原定时任务，无模型调用。净值晚间约5分钟检查、QDII约15分钟、市场约30分钟；GitHub调度和数据源可能延迟。关闭网页也会采集；网站内提示需打开网页查看。</p>';
  $$('[data-monitor-section]').forEach(button => button.addEventListener('click', () => activateSection(button.dataset.monitorSection)));
}
async function refreshPortfolioStatus() {
  try {
    const data = await qdiiFetch('portfolio-status.json');
    if (data.schemaVersion !== 1 || typeof data.reconciliationRequired !== 'boolean') throw new Error('Invalid portfolio status');
    dashboardMonitor.portfolioStatus = data;
    dashboardMonitor.portfolioError = false;
  } catch { dashboardMonitor.portfolioError = true; }
  renderDashboardMonitor();
}
try { if ($('#majorChangeOnly')) $('#majorChangeOnly').checked = localStorage.getItem('dashboard-major-only') !== 'false'; } catch {}
const settings = $('#section-settings');
if (settings) {
  const health = document.createElement('article');
  health.className = 'content-card update-health-card';
  health.innerHTML = '<div class="content-card-head"><h3>数据更新详情</h3><a href="https://github.com/hzbwbbdhhs-del/personal-investment-dashboard/actions" target="_blank" rel="noopener noreferrer">查看自动任务</a></div><div id="updateHealthDetails"></div>';
  settings.querySelector('.section-heading').after(health);
}
window.addEventListener('dashboard-data', () => { dashboardMonitor.readAt = new Date().toISOString(); renderDashboardMonitor(); });
window.setInterval(renderDashboardMonitor, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPortfolioStatus(); });
$('#refreshButton')?.addEventListener('click', refreshPortfolioStatus);
refreshPortfolioStatus();
renderDashboardMonitor();
