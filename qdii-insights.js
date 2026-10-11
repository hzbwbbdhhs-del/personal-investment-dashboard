// Website-only notifications. No AI calls, brokerage actions, or external messages.
const qdiiInsights = { fees: null, history: null, expanded: false };
function renderQdiiInsights() {
  if (!qdiiView.payload || typeof qdiiMonitorCore === 'undefined') return;
  const scope = qdiiScopeFunds().filter(f=>qdiiView.category==='all'||f.category===qdiiView.category);
  const index = scope.filter(f=>['nasdaq100','sp500'].includes(f.category));
  const large = index.flatMap(f=>{
    const e=qdiiEvidence(f);
    return qdiiMonitorCore.largeChannels(e.alipay,e.direct).map(([channel,amount])=>({f,channel,amount}));
  }).sort((a,b)=>b.amount-a.amount);
  const alert=qdii$('#qdiiLargeAlert');
  if (alert) {
    alert.classList.toggle('has-quota',large.length>0);
    alert.innerHTML='<strong>大额度提醒 · 单渠道 ≥ ¥1,000/日</strong><p>'+ (large.length ? large.length+' 项新鲜公告参考额度达到阈值；实际可买金额仍需订单页确认。' : '当前没有符合阈值的新鲜公告证据；未核实或过期不代表没有额度。')+'</p>' + large.slice(0,6).map(x=>'<div>'+qdiiEscape(x.f.name)+' · '+qdiiEscape(x.channel)+' <b>¥'+x.amount.toLocaleString('zh-CN')+'/日</b></div>').join('')+(large.length>6?'<small>更多项目见下方额度清单。</small>':'')+'<small>仅网站内提示；关闭网站不推送。不把直销与代销相加触发，不按 A/C 累加。</small>';
  }
  const changes=qdiiInsights.history?.events || [];
  const shown=changes.filter(e=>scope.some(f=>f.code===e.code)).slice(0,20);
  const history=qdii$('#qdiiChanges');
  if(history) history.innerHTML=qdiiInsights.history ? '<p>记录开始：'+qdiiTime(qdiiInsights.history.initializedAt)+' · 只记录成功核验的公告上限变化，不补造历史。保存最近90天，最多300条。</p>'+ (shown.length?shown.map(e=>'<div class="qdii-change-row"><strong>'+qdiiEscape(e.name)+'</strong><span>'+ (e.channel==='agency'?'代销公告':'直销公告')+' · ¥'+e.before.toLocaleString('zh-CN')+' → ¥'+e.amount.toLocaleString('zh-CN')+'/日</span><small>发现 '+qdiiTime(e.observedAt)+' · 生效 '+qdiiEscape(e.effectiveDate||'未注明')+'</small></div>').join(''):'<p>尚未记录到额度变化；首次读取只建立基线。</p>') : '<p>变化记录暂不可用；不代表额度没有变化。</p>';
  const card=qdii$('#qdiiRanking');
  if(!card) return;
  card.hidden=!['nasdaq100','sp500'].includes(qdiiView.category);
  if(card.hidden) return;
  const fees=qdiiInsights.fees?.funds || {};
  const period=qdiiMonitorCore.returnWindow(index,fees);
  const candidates=index.filter(qdiiMonitorCore.comparable);
  const ranked=candidates.filter(f=>qdiiMonitorCore.feeValid(fees[f.code])).sort((a,b)=>fees[a.code].operatingPct-fees[b.code].operatingPct||a.code.localeCompare(b.code));
  let rank=0, last=null;
  qdii$('#qdiiRankingNote').textContent='长期定投费用优先参考：按产品资料概要的年化综合运作费率从低到高，同费率并列；不是收益预测，也不是立即买入建议。人民币同指数场外份额比较；等权、增强、美元和场内ETF不混排。'+ (period?'净值区间 '+period.start+' 至 '+period.end+'（非复权单位净值涨幅，不是含分红总回报，不参与排名）。':'暂无同日期近一年净值区间。')+' 数据核验 '+qdiiTime(qdiiInsights.fees?.checkedAt)+'；综合费率有效 '+ranked.length+'/'+candidates.length+' 只。';
  qdii$('#qdiiRankingMore').hidden=ranked.length<=5;
  qdii$('#qdiiRankingMore').textContent=qdiiInsights.expanded?'收起为前5项':'展开完整费用顺序（'+ranked.length+'项）';
  qdii$('#qdiiRankingRows').innerHTML=(qdiiInsights.expanded?ranked:ranked.slice(0,5)).map((f,i)=>{
    const fee=fees[f.code]; if(fee.operatingPct!==last)rank=i+1; last=fee.operatingPct;
    const change=qdiiMonitorCore.periodReturn(fee,period);
    const pct=n=>Number.isFinite(n)?n.toFixed(2)+'%':'待核实';
    const quota=qdiiEvidence(f);
    return '<tr><td data-label="费用顺位">'+rank+'</td><td data-label="基金"><strong>'+qdiiEscape(f.name)+'</strong><small>'+f.code+'</small></td><td data-label="年化运作费率"><strong>'+pct(fee.operatingPct)+'</strong><small>每1万元约 ¥'+(fee.operatingPct*100).toFixed(0)+'/年</small></td><td data-label="费用构成"><small>管理 '+pct(fee.managementPct)+' / 托管 '+pct(fee.custodyPct)+'</small><small>销售服务 '+pct(fee.salesPct)+'；已披露费用不重复相加</small><small>申购折扣、赎回费须按支付宝／直销订单页；未计入本排序</small></td><td data-label="同期净值涨幅">'+(change==null?'不可比较':(change>=0?'+':'')+change.toFixed(2)+'%')+'<small>非复权；已扣净值内运作费用</small><a href="'+qdiiEscape(fee.navSourceUrl || fee.indexUrl)+'" target="_blank" rel="noopener noreferrer">净值来源 ↗</a><small>净值核验 '+qdiiTime(fee.navCheckedAt)+'</small></td><td data-label="额度与来源"><small>支付宝：'+(quota.alipay==null?'待核实':'公告 ¥'+quota.alipay.toLocaleString('zh-CN')+'/日')+'</small><small>直销：'+(quota.direct==null?'待核实':'公告 ¥'+quota.direct.toLocaleString('zh-CN')+'/日')+'</small><a href="'+qdiiEscape(fee.sourceUrl)+'" target="_blank" rel="noopener noreferrer">产品资料概要 '+qdiiEscape(fee.documentDate)+' ↗</a><small>核验 '+qdiiTime(fee.checkedAt)+'</small></td></tr>';
  }).join('') || '<tr><td colspan="6">费用资料未核实，不生成推荐名次。</td></tr>';
  qdii$('#qdiiRankingMissing').textContent='未排名：'+candidates.filter(f=>!ranked.includes(f)).map(f=>f.name+'（'+f.code+'）').join('、') + (index.some(f=>/等权/.test(f.name))?'。等权标普500另属策略，仍可查看下面额度，不与市值加权标普500比名次。':'');
}
async function refreshQdiiInsights(){
  const results=await Promise.allSettled([qdiiFetch('qdii-fees.json'),qdiiFetch('qdii-quota-history.json')]);
  if(results[0].status==='fulfilled'&&results[0].value.schemaVersion===1)qdiiInsights.fees=results[0].value;
  if(results[1].status==='fulfilled'&&results[1].value.schemaVersion===1)qdiiInsights.history=results[1].value;
  renderQdiiInsights();
}
refreshQdiiInsights();
qdii$('#qdiiRankingMore')?.addEventListener('click',()=>{qdiiInsights.expanded=!qdiiInsights.expanded;renderQdiiInsights();});
window.setInterval(refreshQdiiInsights,15*60000);
