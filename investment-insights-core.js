(function(root) {
  const finite = x => x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x));
  const labels = { bond:'债券类',ndx:'纳斯达克100',spx:'标普500（市值加权）',equal:'标普500等权重',tech:'纳斯达克科技指数',active:'主动QDII',gold:'黄金',other:'其他股票 / 混合' };
  function group(row) {
    const n = row.name || '';
    if (/黄金/.test(n)) return 'gold';
    if (row.category === '债券 / 现金' || /债券|纯债|国开行/.test(n)) return 'bond';
    if (/等权/.test(n) && /标普/.test(n)) return 'equal';
    if (/纳斯达克科技/.test(n)) return 'tech';
    if (/纳斯达克.*100|纳指.*100/.test(n)) return 'ndx';
    if (/标普.*500/.test(n)) return 'spx';
    if (row.category === '主动 QDII') return 'active';
    return 'other';
  }
  function summarize(rows) {
    const valid = rows.filter(r => finite(r.amount) && Number(r.amount) >= 0);
    const groups = Object.fromEntries(Object.keys(labels).map(k=>[k,{id:k,label:labels[k],amount:0,count:0,codes:new Set()}]));
    const codes = new Map();
    for (const row of valid) {
      const g=group(row), amount=Number(row.amount); groups[g].amount+=amount;groups[g].count++;groups[g].codes.add(row.code || row.id);
      const key=row.code || row.id;
      const item=codes.get(key)||{code:row.code,name:row.name,group:g,amount:0,count:0,channels:new Set(),blocked:false};
      item.amount+=amount;item.count++;item.channels.add(row.channel||'未注明');item.blocked ||= Boolean(row.valuationBlocked);codes.set(key,item);
    }
    const total=valid.reduce((s,r)=>s+Number(r.amount),0);
    const aggregate=[...codes.values()].sort((a,b)=>b.amount-a.amount).map(r=>({...r,share:total?r.amount/total:0,channels:[...r.channels]}));
    return {total,count:valid.length,invalidCount:rows.length-valid.length,codeCount:codes.size,groups:Object.values(groups).map(g=>({...g,codes:[...g.codes],share:total?g.amount/total:0})),aggregate,
      blocked:valid.filter(r=>r.valuationBlocked).reduce((s,r)=>s+Number(r.amount),0),blockedCount:valid.filter(r=>r.valuationBlocked).length,
      top:aggregate[0]||null,rows:valid};
  }
  function scenario(summary, equityPct, bondPct) {
    if (![equityPct,bondPct].every(finite)) return null;
    const e=Number(equityPct),b=Number(bondPct);
    if (e < -100 || e > 100 || b < -100 || b > 100) return null;
    let known=0,blockedImpact=0,excluded=0;
    for(const r of summary.rows) {
      const g=group(r);
      if(g==='gold'){excluded+=Number(r.amount);continue;}
      const impact=Number(r.amount)*(g==='bond'?b:e)/100;
      if(r.valuationBlocked) blockedImpact+=impact;else known+=impact;
    }
    return {low:Math.min(known,known+blockedImpact),high:Math.max(known,known+blockedImpact),excluded,
      lowPct:summary.total?Math.min(known,known+blockedImpact)/summary.total*100:null,
      highPct:summary.total?Math.max(known,known+blockedImpact)/summary.total*100:null};
  }
  function researchState(source, now=Date.now()) {
    const due=Date.parse((source.reviewAfter||'')+'T00:00:00+08:00');
    const publication=Date.parse((source.date||'')+'T00:00:00+08:00');
    if(!Number.isFinite(due)||!Number.isFinite(publication)||publication>now)return 'unverified';
    return now >= due ? 'expired':'reviewed';
  }
  function marketState(metric,snapshot,now=Date.now()) {
    if(!metric||!finite(metric.value))return 'missing';
    if(metric.refreshStatus==='failed'||snapshot?.checkStatus==='failed')return 'stale';
    const checked=Date.parse(snapshot?.checkedAt||snapshot?.updatedAt||'');
    const observed=Date.parse((metric.updatedAt||'')+'T23:59:59+08:00');
    return !Number.isFinite(checked)||!Number.isFinite(observed)||checked>now+300000||observed>now+86400000||now-checked>2*3600000||now-observed>5*86400000?'stale':'available';
  }
  root.investmentInsightsCore={group,labels,summarize,scenario,researchState,marketState};
})(globalThis);
