// Deterministic decision support from the current holdings and dated research.
(function() {
  const core=investmentInsightsCore;
  const el=id=>document.getElementById(id);
  const esc=escapeHtml;
  const pct=x=>Number.isFinite(x)?`${(x*100).toFixed(1)}%`:'—';
  const money=x=>formatCurrency(x);
  const link=(url,title)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
  const state={basis:'nav',query:'',filter:'all',showAll:false,summary:null};
  let researchReload=null,researchLoadFailed=false;
  function refreshResearch() {
    if(researchReload)return researchReload;
    researchReload=new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=`./investment-research.js?review=${Date.now()}`;
      let finished=false;
      const finish=failed=>{if(finished)return;finished=true;clearTimeout(timeout);researchLoadFailed=failed;script.remove();resolve();};
      const timeout=setTimeout(()=>finish(true),12000);
      script.onload=()=>finish(false);script.onerror=()=>finish(true);
      document.head.appendChild(script);
    }).finally(()=>{researchReload=null;renderResearch();});
    return researchReload;
  }
  function currentRows() {
    return holdings.map(row=>({...row,amount:state.basis==='snapshot'?row.value:valuationFor(row).value}));
  }
  function groupOf(summary,key){return summary.groups.find(g=>g.id===key);}
  function sourceLinks(ids){return ids.map(id=>{const s=window.investmentResearch.sources.find(s=>s.id===id);return s?link(s.url,s.organization):'';}).join(' · ');}
  function diagnostic(row) {
    if(row.blocked)return {label:'先核对在途',reason:'账面金额未拆分剩余持仓与赎回在途，暂不据此追加或重复扣减。',condition:'取得剩余份额、成交净值及到账明细后重算。'};
    if(row.group==='bond' && row.share>=.3)return {label:'复查集中度',reason:`单代码合并占${pct(row.share)}；关注管理人、信用和久期，不能把债基视为存款。`,condition:'若未来一年要用款，先核对赎回到账与波动承受度。30%是本站复查阈值。'};
    if(row.code==='003376')return {label:'关注利率风险',reason:'7–10年国开债指数的期限较长；债券也可能因收益率上行而下跌。',condition:'将用款期限与利率敏感度匹配，不能套用美债收益率判断其涨跌。'};
    if(row.group==='bond')return {label:'核对稳健资金用途',reason:'关注债券久期、信用质量及是否允许股票或可转债投资；同属债券基金不代表波动相同。',condition:'结合用款时间比较风险、费率与赎回到账，不把债券基金净值视为保本余额。'};
    if(['ndx','spx'].includes(row.group))return {label:'纳入指数总预算',reason:'同指数的不同代码与渠道合并看预算；额度增加并不等于投资价值提高。',condition:'在费用、跟踪差异、人民币汇率和可用额度之间选择；不按近期涨幅追逐。'};
    if(row.group==='equal')return {label:'单独看等权策略',reason:'等权标普与普通市值加权标普的行业和个股权重不同。',condition:'保留为独立策略观察，不放进普通标普的同类费用排名。'};
    if(row.group==='tech')return {label:'科技主题集中',reason:'纳斯达克科技指数不是纳斯达克100，行业范围更窄。',condition:'与纳指及主动科技QDII一起评估重叠，不靠新增基金名称增加分散感。'};
    if(row.group==='active')return {label:'核对主动风险',reason:'“全球”或QDII名称不能证明没有A股；本页未取得足够新且完整的地区穿透数据。',condition:'以最新定期报告的国家/地区、行业、前十大持仓及报告日期作比较，再决定保留或减少。'};
    if(row.group==='gold')return {label:'按组合角色观察',reason:'黄金不是利息资产，小额持有对组合的影响有限。',condition:'不因近期涨幅临时扩大比例；先明确用途与总预算。'};
    return {label:'核对投资范围',reason:'这部分不属于普通纳指100或标普500，需按各自市场与策略看待。',condition:'先查基金投资范围及最新报告，不把它自动归入美股或A股。'};
  }
  function renderPositions() {
    const summary=state.summary;if(!summary)return;
    const rows=summary.aggregate.filter(r=>(state.filter==='all'||r.group===state.filter)&&(r.name+r.code).toLowerCase().includes(state.query));
    const visible=state.showAll?rows:rows.slice(0,12);
    el('insightPositionCount').textContent=`显示${visible.length} / 匹配${rows.length}个代码 · 同代码跨渠道合并`;
    el('insightShowAll').hidden=rows.length<=12;el('insightShowAll').textContent=state.showAll?'收起至前12只':`显示全部${rows.length}只`;
    el('insightPositions').innerHTML=rows.length?visible.map(row=>{
      const d=diagnostic(row);
      return `<tr><td><strong>${esc(row.name)}</strong><small>${esc(row.code||'代码待补')} · ${esc(row.channels.join(' / '))}</small></td><td><strong>${money(row.amount)}</strong><small>占组合 ${pct(row.share)}</small></td><td><span class="insight-tag">${d.label}</span><p>${d.reason}</p><small>${d.condition}</small></td></tr>`;
    }).join(''):'<tr><td colspan="3">没有符合条件的持仓。</td></tr>';
  }
  function renderScenario() {
    if(!state.summary)return;
    const equity=Number(el('insightEquityShock').value),bond=Number(el('insightBondShock').value);
    el('insightEquityOutput').value=`${equity}%`;el('insightBondOutput').value=`${bond}%`;
    const result=core.scenario(state.summary,equity,bond);
    const node=el('insightScenarioResult');
    if(!result||!state.summary.total){node.innerHTML='<p>尚无可计算的持仓金额。</p>';return;}
    node.innerHTML=`<span>本情景下的账面金额变化</span><strong>${money(result.low)}${Math.abs(result.low-result.high)>.005?' 至 '+money(result.high):''}</strong><p>相当于当前合并参考金额的 ${result.lowPct.toFixed(1)}%${Math.abs(result.lowPct-result.highPct)>.01?' 至 '+result.highPct.toFixed(1)+'%':''}</p><small>范围两端分别假设未拆分的${state.summary.blockedCount}笔全部参与涨跌、或全部不参与；并非预测或概率区间。黄金${money(result.excluded)}未施加冲击。未单独模拟汇率、分红、费税与交易价格。</small>`;
  }
  function renderResearch() {
    const data=window.investmentResearch;
    if(!data?.sources?.length){el('insightResearch').textContent='暂无已核读的机构观点。';return;}
    const fresh=data.sources.filter(s=>core.researchState(s)==='reviewed');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const reviewedToday=data.reviewedAt===today;
    el('insightReviewSchedule').textContent=data.schedule?.enabled?'每天 08:00 · 北京时间':'定期核读';
    const readTime=data.reviewedAtTime&&Number.isFinite(Date.parse(data.reviewedAtTime))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(data.reviewedAtTime)):'';
    const partial=data.reviewStatus==='partial';
    el('insightReviewDate').textContent=`最近核读 ${data.reviewedAt}${readTime?' '+readTime+'（北京）':''}`;
    el('insightReviewState').textContent=researchLoadFailed?'检查失败，显示上次版本':reviewedToday?(partial?'今日部分更新':'今日已更新'):'今日研判待更新';
    el('insightReviewState').className='insight-review-state'+(!reviewedToday||researchLoadFailed||partial?' pending':'');
    renderDailyBrief(data);
    el('insightResearchStatus').textContent=`最近核读 ${data.reviewedAt} · ${fresh.length}/${data.sources.length}篇未到复核日`;
    el('insightResearch').innerHTML=data.sources.map(s=>{
      const review=core.researchState(s),outdated=review!=='reviewed';
      return `<article class="research-card ${outdated?'research-expired':''}" id="research-${esc(s.id)}"><div class="research-meta"><strong>${esc(s.organization)}</strong><span>${esc(s.date)} 发布</span></div><small>${esc(s.author)}</small><h4>${esc(s.title)}</h4><div class="research-badges"><span>${esc(s.horizon)}</span><span>${outdated?'待重新核读 · 仅历史参考':'已核读 · '+esc(s.reviewAfter)+'前复核'}</span></div><dl><dt>机构 / 专业人士观点</dt><dd>${esc(s.view)}</dd><dt>与你持仓的关系 · 本站推断</dt><dd>${esc(s.relevance)}</dd></dl><p class="research-limit">${esc(s.limit)}</p>${link(s.url,'阅读原文')}</article>`;
    }).join('');
    el('insightResearchNotice').textContent='观点仅代表原文发布时的判断。每天早上8点安排一次资料核读与建议更新，完成并发布后才改变核读日期；未有新观点时保留原文发布日期。各篇到复核日自动标为历史参考，刷新页面不会把旧观点变成新观点。';
  }
  function renderDailyBrief(data) {
    let node=el('insightDailyBrief');
    if(!node){node=document.createElement('article');node.id='insightDailyBrief';node.className='insight-panel insight-daily-brief';el('insightMetrics').before(node);}
    const b=data.dailyBrief;node.hidden=!b;if(!b)return;
    const basis=b.basis||{},funds=basis.funds||{},market=basis.market||{},quota=basis.qdii||{};
    const time=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'未记录';
    const navDates=Object.entries(funds.navDates||{}).map(([date,count])=>`${date}：${count}个代码`).join('；');
    const observations=Object.entries(market.observations||{}).map(([key,v])=>`${key} ${v.date}`).join('；');
    node.innerHTML=`<h3>${esc(b.date)} 早间观察 · ${esc(b.title)}</h3><p class="insight-daily-summary">${esc(b.summary)}</p><div class="insight-daily-points">${(b.points||[]).map(p=>`<section><h4>${esc(p.title)}</h4><p><b>事实</b>${esc(p.fact)}</p><p><b>本站判断</b>${esc(p.inference)}</p><p><b>可考虑</b>${esc(p.action)}</p><div class="priority-links">${(p.sources||[]).map(s=>link(s.url,s.title)).join(' · ')}</div></section>`).join('')}</div><details class="insight-method"><summary>本次依据、不同观点与数据日期</summary><p>${esc(b.holdingsNote)}</p><p>${esc(b.counterpoint)}</p><p>${esc(b.quotaNote)}</p><p>持仓版本：${esc(basis.holdingsVersion||'未记录')}；${basis.holdingsCount||'—'}笔 / ${basis.fundCodeCount||'—'}个代码。简报是核读时点记录，页面金额可随后更新。</p><p>净值检查：${time(funds.checkedAt)}（北京），${funds.successCount??'—'}个成功 / ${funds.failureCount??'—'}个失败。净值日：${esc(navDates)}。</p><p>行情检查：${time(market.checkedAt)}（北京）；观察日：${esc(observations)}。</p><p>宏观观察期：${esc(Object.entries(basis.macro?.observations||{}).map(([key,v])=>`${key} ${v.date}`).join('；'))}。月度序列的每月1日表示所属月份，不是公告日。</p><p>额度采集：${time(quota.collectedAt)}（北京）；公告检查：${time(quota.noticeCheckedAt)}（北京）。采集成功不表示每个渠道均已核实。</p></details>`;
  }
  function renderMarket() {
    const snapshot=marketSnapshot||{},market=snapshot.market||{};
    const cards=[
      {key:'NDX',title:'纳指回撤',value:m=>m.drawdownPct==null?'—':`${m.drawdownPct.toFixed(2)}%`,body:'对照原来的回撤分档，只是观察条件；不据此自动加倍投入。'},
      {key:'US10Y',title:'美国10年期国债收益率',value:m=>`${Number(m.value).toFixed(2)}%`,body:'关注成长股估值和美元债久期；该收益率不是人民币债基的收益承诺。'},
      {key:'USDCNY',title:'美元 / 人民币',value:m=>Number(m.value).toFixed(4),body:'人民币升值可能拖累未对冲美元资产；未掌握真实货币敞口，不计算组合汇兑损益。'}
    ];
    el('insightMarket').innerHTML=cards.map(c=>{
      const m=market[c.key],status=core.marketState(m,snapshot);const ok=status==='available'&&!feedErrors.market;
      return `<article><span>${c.title}</span><strong>${status==='missing'?'—':c.value(m)}</strong><small>${m?.updatedAt?esc(m.updatedAt)+' 观察值':'日期未获取'} · ${ok?'已取公开日线':'数据不足或较旧'}</small><p>${ok?c.body:'暂停基于此数值作时点判断；保留日期供查阅。'}</p><a href="https://fred.stlouisfed.org/series/${{NDX:'NASDAQ100',US10Y:'DGS10',USDCNY:'DEXCHUS'}[c.key]}" target="_blank" rel="noopener noreferrer">FRED 来源 ↗</a></article>`;
    }).join('');
  }
  function render() {
    if(!el('section-insights'))return;
    const s=core.summarize(currentRows());state.summary=s;
    const bond=groupOf(s,'bond'),ndx=groupOf(s,'ndx'),spx=groupOf(s,'spx'),active=groupOf(s,'active');
    const staleNav=holdings.filter(row=>!row.valuationBlocked&&dashboardCore.fundState(fundData[row.code],fundSnapshot).level!=='ok').length;
    const dates=[...new Set(s.rows.map(row=>row.date).filter(Boolean))].sort();
    el('insightBasisNote').textContent=`${s.count}笔 / ${s.codeCount}个代码 · 基准日期 ${dates.join('、')} · ${state.basis==='nav'?'最新可得净值估算':'录入账面快照'}${s.invalidCount?' · '+s.invalidCount+'笔金额无效，未纳入':''}。${s.blockedCount}笔含在途，保留原值；比例是账面分类，非实时底层股票敞口。`;
    el('insightDataHealth').textContent=state.basis==='snapshot'?'当前使用录入快照，不代表今日余额':staleNav?`${staleNav}笔净值状态需留意，金额仅作参考`:'可估算持仓的净值检查正常';
    el('insightDataHealth').className='insight-health'+(staleNav?' attention':'');
    el('insightMetrics').innerHTML=[['债券类',bond.amount,'债券也有久期和信用风险'],['普通纳指100＋标普500',ndx.amount+spx.amount,'等权标普、科技指数另列'],['主动QDII',active.amount,'实际A股与行业穿透待核实'],['其中：在途未拆分持仓',s.blocked,'与上面分类重叠，不是另一笔资产']].map(([name,value,description])=>`<div><span>${name}</span><strong>${s.total?pct(value/s.total):'—'}</strong><b>${money(value)}</b><small>${description}</small></div>`).join('');
    const priorities=[];
    if(s.blockedCount)priorities.push({title:'先核对赎回到账，再安排新增投入',fact:`${s.blockedCount}笔未拆分持仓共${money(s.blocked)}；这不是赎回到账金额。`,action:'这些记录暂不做自动加减仓测算；确认成交、费用和到账后，优先更新台账。',boundary:'截图在途金额与剩余基金市值尚未逐笔对应。',target:'holdings',button:'查看相关持仓'});
    if(active.amount||groupOf(s,'tech').amount)priorities.push({title:'减少A股风险，应先辨明真实暴露',fact:`主动QDII账面占${pct(active.share)}；基金名称不能提供实时A股比例。`,action:'若减少A股仍是你的目标，可先暂缓向未核实地区配置的主动基金增加新钱；对照最新报告与原计划评估，不因一次下跌整体清仓。',boundary:'未取得完整最新地区持仓，不给出虚假的A股百分比或具体卖出金额。',sources:['jpm','vanguard','harvest']});
    if(ndx.amount+spx.amount)priorities.push({title:'将分散申购渠道，收拢成清晰的指数预算',fact:`纳指100 ${ndx.codes.length}个代码、标普500市值加权 ${spx.codes.length}个代码，共${money(ndx.amount+spx.amount)}。`,action:'保留多渠道获取额度的便利，但按指数汇总投入；相同策略优先比较总费用和跟踪表现，额度放开只解决“能买”，不自动提高预算。',boundary:'纳指和标普仍可能重叠于大盘科技；等权标普另算，近期涨幅不等于未来优势。',target:'qdii',button:'查看额度与费用参考'});
    if(s.top?.share>=.3)priorities.push({title:'复查最大单只基金的用途',fact:`${s.top.name}，同代码跨渠道合并${money(s.top.amount)}，占${pct(s.top.share)}。`,action:s.top.group==='bond'?'关注信用、久期、赎回到账及用款时间。若需要分散管理人，可先比较替代方案和赎回成本；无需仅因比例高立刻卖出。':'先明确单只基金波动是否在可承受范围，再考虑用新增资金或分批调整降低集中度。',boundary:'30%是本站设置的复查阈值，不是风险安全线，也不代表必然亏损。'});
    el('insightPriorities').innerHTML=priorities.length?priorities.map((p,i)=>`<article class="insight-priority"><div class="priority-number">${String(i+1).padStart(2,'0')}</div><div><h3>${p.title}</h3><p class="priority-fact"><b>当前事实</b>${esc(p.fact)}</p><p><b>可考虑</b>${p.action}</p><small>${p.boundary}</small>${p.sources?`<div class="priority-links">观点对照：${sourceLinks(p.sources)}</div>`:''}${p.target?`<button type="button" class="insight-link-button" data-insight-target="${p.target}">${p.button} →</button>`:''}</div></article>`).join(''):'<p>目前没有足够持仓数据生成组合建议。请先录入持仓。</p>';
    el('insightAllocation').innerHTML=s.groups.filter(g=>g.amount>0).sort((a,b)=>b.amount-a.amount).map(g=>`<div class="insight-allocation-row"><span>${g.label}</span><div class="insight-allocation-track"><i style="width:${g.share*100}%"></i></div><strong>${pct(g.share)}</strong><small>${money(g.amount)}</small></div>`).join('');
    el('insightAllocationNote').textContent=`分类合计${money(s.total)}；等权标普和纳斯达克科技单列。未取得完整底层成分，不能量化股票重叠率或实时A股占比。`;
    renderPositions();renderScenario();renderResearch();renderMarket();
    document.querySelectorAll('[data-insight-target]').forEach(button=>button.addEventListener('click',()=>activateSection(button.dataset.insightTarget)));
  }
  el('insightBasis').addEventListener('change',event=>{state.basis=event.target.value;render();});
  el('insightShowAll').addEventListener('click',()=>{state.showAll=!state.showAll;renderPositions();});
  el('insightSearch').addEventListener('input',event=>{state.query=event.target.value.trim().toLowerCase();renderPositions();});
  el('insightGroup').addEventListener('change',event=>{state.filter=event.target.value;renderPositions();});
  ['insightEquityShock','insightBondShock'].forEach(id=>el(id).addEventListener('input',renderScenario));
  el('insightResetScenario').addEventListener('click',()=>{el('insightEquityShock').value=-20;el('insightBondShock').value=-1;renderScenario();});
  el('insightRefresh').addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;button.textContent='正在检查…';await Promise.allSettled([refreshFundData(),refreshMarketData(),refreshQdiiLimits(),refreshResearch()]);render();button.disabled=false;button.textContent='刷新公开数据';});
  window.addEventListener('dashboard-data',render);
  window.addEventListener('holdings-changed',render);
  document.querySelector('[data-section="insights"]').addEventListener('click',()=>{history.replaceState(null,'',location.pathname+location.search+'#insights');render();});
  window.addEventListener('hashchange',()=>{if(location.hash==='#insights'){activateSection('insights');render();}});
  if(location.hash==='#insights')activateSection('insights');
  setInterval(render,60000);
  setInterval(()=>{if(!document.hidden)refreshResearch();},600000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshResearch();});
  render();
})();
