(function (root) {
  const recent = (stamp, now = Date.now(), max = 90 * 60000) => {
    const age = now - Date.parse(stamp); return Number.isFinite(age) && age >= -60000 && age <= max;
  };
  const chinaDay = (now = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(now));
  function newerNotice(fund) {
    const e=fund.evidence;
    const date=[e?.noticeDate,e?.agency?.noticeDate,e?.direct?.noticeDate,...(e?.pending||[]).map(r=>r.noticeDate)].filter(Boolean).sort().at(-1)||'';
    const lastId=(e?.reviewedNoticeIds||[]).slice().sort().at(-1)||'';
    return (fund.latestNotices||[]).find(n=>n.id&&e?.reviewedNoticeIds?.includes(n.id)?false:n.date>date || (n.date===date && n.id && lastId && n.id>lastId));
  }
  function pendingRules(fund, now = Date.now()) {
    const e=fund.evidence;
    if (!e || e.error || fund.audit?.error || newerNotice(fund) || !recent(e.checkedAt,now) || !recent(fund.noticeCheckedAt,now)) return [];
    return (e.pending || []).filter(r => ['agency','direct'].includes(r.channel) && /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveDate || '')
      && ['limited','suspended','open'].includes(r.status) && r.sourceUrl);
  }
  function observations(funds, now = Date.now()) {
    return funds.flatMap(fund => {
      const e = fund.evidence;
      const date = [e?.noticeDate, e?.agency?.noticeDate, e?.direct?.noticeDate].filter(Boolean).sort().at(-1) || '';
      if (fund.currency !== 'CNY' || fund.exchangeOnly || !e || e.error || fund.audit?.error || !recent(e.checkedAt, now) || !recent(fund.noticeCheckedAt, now)
        || pendingRules(fund,now).some(r=>r.effectiveDate<=chinaDay(now))
        || newerNotice(fund)) return [];
      return ['agency','direct'].flatMap(channel => {
        const rule = e[channel];
        const amount = rule?.status === 'suspended' ? 0 : rule?.amount;
        if (!Number.isFinite(amount) || amount < 0) return [];
        return [{ key: fund.code + ':' + channel, code: fund.code, name: fund.name, category: fund.category, channel, amount, checkedAt: e.checkedAt, noticeDate: rule.noticeDate, effectiveDate: rule.effectiveDate, sourceUrl: rule.sourceUrl }];
      });
    });
  }
  function track(previous, funds, now = Date.now()) {
    const state = { schemaVersion: 1, initializedAt: previous?.initializedAt || new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), baseline: { ...previous?.baseline }, events: [...(previous?.events || [])] };
    for (const item of observations(funds, now)) {
      const old = state.baseline[item.key];
      // First observation is a baseline, not an invented change; failed reads leave it intact.
      if (old && Date.parse(item.checkedAt) < Date.parse(old.checkedAt)) continue;
      if (old && old.amount !== item.amount) {
        const event = { ...item, before: old.amount, observedAt: new Date(now).toISOString(), id: item.key + ':' + item.checkedAt + ':' + item.amount };
        if (!state.events.some(e=>e.id===event.id)) state.events.unshift(event);
      }
      state.baseline[item.key] = item;
    }
    state.events = state.events.filter(e=>now-Date.parse(e.observedAt)<90*86400000).slice(0,300);
    return state;
  }
  function feeValid(fee, now = Date.now()) {
    return fee?.status === 'available' && Number.isFinite(fee.operatingPct) && fee.operatingPct >= 0 && recent(fee.checkedAt, now, 7*86400000) && recent(fee.documentDate, now, 370*86400000);
  }
  const comparable = fund => ['nasdaq100','sp500'].includes(fund.category) && fund.currency === 'CNY' && !fund.exchangeOnly && !/等权|增强|杠杆|反向|行业|科技指数/.test(fund.name);
  const largeChannels = (alipay, direct, threshold=1000) => [['支付宝代销',alipay],['官方直销',direct]].filter(([,amount])=>Number.isFinite(amount)&&amount>=threshold);
  function purchaseRanking(funds, fees, evidenceFor, now=Date.now()) {
    const hasQuota = fund => fund.currency==='CNY' && !fund.exchangeOnly && Number.isFinite(evidenceFor(fund).available) && evidenceFor(fund).available>0;
    const eligible=funds.filter(hasQuota);
    const valid=fund=>comparable(fund)&&feeValid(fees[fund.code],now);
    eligible.sort((a,b)=>Number(valid(b))-Number(valid(a)) || (valid(a)&&valid(b)?fees[a.code].operatingPct-fees[b.code].operatingPct:0) || a.code.localeCompare(b.code));
    const ranks={}; let last=null, rank=0, count=0;
    for(const fund of eligible){if(!valid(fund))continue;count++;const fee=fees[fund.code].operatingPct;if(fee!==last)rank=count;last=fee;ranks[fund.code]=rank;}
    return { eligible, ranks };
  }
  function returnWindow(funds, fees) {
    const counts = {};
    for (const f of funds.filter(comparable)) {
      const date = fees[f.code]?.nav?.[0]?.date;
      if (date) counts[date] = (counts[date] || 0) + 1;
    }
    const end = Object.keys(counts).sort((a,b)=>counts[b]-counts[a] || b.localeCompare(a))[0];
    if (!end) return null;
    const target = new Date(end+'T00:00:00Z'); target.setUTCFullYear(target.getUTCFullYear()-1);
    const date = target.toISOString().slice(0,10);
    const starts = {};
    for (const f of funds.filter(comparable)) {
      const row = fees[f.code]?.nav?.find(r=>r.date<=date);
      if (row && Date.parse(date)-Date.parse(row.date)<=14*86400000) starts[row.date]=(starts[row.date]||0)+1;
    }
    const start = Object.keys(starts).sort((a,b)=>starts[b]-starts[a] || b.localeCompare(a))[0];
    return start ? { start, end } : null;
  }
  function periodReturn(fee, period, now = Date.now()) {
    if (!period || fee?.navDistributionChanged || !recent(fee?.navCheckedAt, now, 2*86400000)) return null;
    const rows = fee.nav || [];
    const start=rows.find(r=>r.date===period.start), end=rows.find(r=>r.date===period.end);
    if (!start || !end || rows[0]?.date!==period.end || !start.accumulated || !end.accumulated) return null;
    const gap = start.accumulated-start.value;
    if (rows.filter(r=>r.date>=period.start&&r.date<=period.end).some(r=>!r.accumulated || Math.abs(r.accumulated-r.value-gap)>0.0002)) return null;
    return (end.value/start.value-1)*100;
  }
  const api = { recent, chinaDay, newerNotice, pendingRules, observations, track, feeValid, comparable, largeChannels, purchaseRanking, returnWindow, periodReturn };
  if (typeof module !== 'undefined') module.exports = api;
  root.qdiiMonitorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
