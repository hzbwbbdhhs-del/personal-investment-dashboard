// Website-only notifications. No AI calls, brokerage actions, or external messages.
const qdiiInsights = { fees: null, history: null };
function renderQdiiInsights() {
  if (!qdiiView.payload || typeof qdiiMonitorCore === 'undefined') return;
  const scope = qdiiScopeFunds().filter(f=>qdiiView.category==='all'||f.category===qdiiView.category);
  const index = scope.filter(f=>['nasdaq100','sp500'].includes(f.category));
  const checked=scope.filter(f=>qdiiEvidence(f).ruleValid && ['agency','direct'].some(c=>['limited','suspended','open'].includes(f.evidence?.[c]?.status)));
  const unresolved=scope.filter(f=>!qdiiEvidence(f).ruleValid || !['agency','direct'].every(c=>['limited','suspended'].includes(f.evidence?.[c]?.status)));
  const audit=qdii$('#qdiiAuditStatus');
  if(audit) audit.innerHTML='<strong>公告核查：'+checked.length+' / '+scope.length+' 只有新鲜规则 · '+(scope.length-unresolved.length)+' 只两渠道规则完整</strong><span>'+unresolved.length+' 只存在未核实渠道；未核实不等于没有额度。支付宝实际可买金额仍需买入页确认。</span>'+ (unresolved.length ? '<details><summary>查看待核实基金</summary>'+unresolved.map(f=>'<div>'+qdiiEscape(f.name)+'（'+f.code+'）<small>'+qdiiEscape(f.audit?.error || f.evidence?.error || (qdiiEvidence(f).newNotice?'新公告尚未解析':qdiiEvidence(f).due?'待生效规则已到期，等待重新核验':['agency','direct'].filter(c=>!['limited','suspended'].includes(f.evidence?.[c]?.status)).map(c=>c==='agency'?'代销规则未核实':'直销规则未核实').join('；')||'核查时间已过期'))+'</small></div>').join('')+'</details>':'');
  const pending=scope.flatMap(f=>qdiiMonitorCore.pendingRules(f).map(rule=>({f,rule})));
  const panel=qdii$('#qdiiPendingNotices');
  if(panel){
    panel.hidden=pending.length===0;
    panel.innerHTML='<strong>新公告 · 待生效额度（不计入今日可买排序）</strong>'+pending.map(({f,rule})=>'<div class="qdii-pending-row"><span>'+qdiiEscape(f.name)+' · '+f.code+'</span><span>'+ (rule.channel==='agency'?'代销公告':'直销公告')+'：'+(rule.status==='suspended'?'将暂停':rule.amount!=null?'¥'+rule.amount.toLocaleString('zh-CN')+'/日':'将恢复，金额待核实')+'</span><small>'+qdiiEscape(rule.effectiveDate)+' 起生效 · 核查 '+qdiiTime(rule.checkedAt)+' · <a href="'+qdiiEscape(rule.sourceUrl)+'" target="_blank" rel="noopener noreferrer">公告原文 ↗</a></small></div>').join('');
  }
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
}
async function refreshQdiiInsights(){
  const results=await Promise.allSettled([qdiiFetch('qdii-fees.json'),qdiiFetch('qdii-quota-history.json')]);
  if(results[0].status==='fulfilled'&&results[0].value.schemaVersion===1)qdiiInsights.fees=results[0].value;
  if(results[1].status==='fulfilled'&&results[1].value.schemaVersion===1)qdiiInsights.history=results[1].value;
  renderQdiiLimits();
}
refreshQdiiInsights();
window.setInterval(refreshQdiiInsights,15*60000);
