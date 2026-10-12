import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { compareOfficialLimit } = require('../vendor/qdii-purchase-limits/scripts/lib/official-pdf.js');

export const beijingDate = stamp => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(stamp));

// The pinned upstream treats a resume announcement as status-only. Some resume
// PDFs ALSO set new limits: retain those parsed rules instead of reviving old caps.
export function reviewedTimeline(notice) {
  const parsed = structuredClone(notice?.parsed || {});
  parsed.limits ||= [];
  for (const event of notice?.events || []) {
    if (!['resume','full-suspend'].includes(event.category) || !event.parsed?.parsed) continue;
    for (const rule of event.parsed.limits || []) {
      if (!Object.keys(rule.perShareLimits || {}).length) continue;
      if (parsed.limits.some(r => r.noticeId === event.id && r.scope === rule.scope && JSON.stringify(r.perShareLimits) === JSON.stringify(rule.perShareLimits))) continue;
      parsed.limits.push({ ...rule, accountBasis: rule.accountBasis || event.parsed.accountBasis,
        effectiveDate: rule.effectiveDate || event.parsed.effectiveDate, noticeId: event.id,
        noticeDate: event.date, noticeUrl: event.url, noticeTitle: event.title });
    }
  }
  // A broad fallback must not override a more explicit share-class sentence.
  const original = structuredClone(parsed.limits);
  for (const rule of parsed.limits) for (const code of Object.keys(rule.perShareLimits || {})) {
    const peers = original.filter(r => r.noticeId === rule.noticeId && r.scope === rule.scope
      && JSON.stringify(r.channels || []) === JSON.stringify(rule.channels || []) && r.perShareLimits?.[code]);
    const smallest = Math.min(...peers.map(r => Object.keys(r.perShareLimits).length));
    const precise = peers.filter(r => Object.keys(r.perShareLimits).length === smallest);
    if (Object.keys(rule.perShareLimits).length > smallest) delete rule.perShareLimits[code];
    else if (new Set(precise.map(r => r.perShareLimits[code].amount)).size > 1) {
      parsed.conflicts ||= []; parsed.conflicts.push({ code, noticeId: rule.noticeId, scope: rule.scope });
    }
  }
  return parsed;
}

export function announcementEvidence(row, queriedAt) {
  const unknown = { status: 'unknown', amount: null, checkedAt: queriedAt };
  if (row.officialNoticeError || !row.officialNotice?.parsed?.parsed) return { agency: unknown, direct: unknown, pending: [] };
  const notice = row.officialNotice;
  const timeline = reviewedTimeline(notice);
  const resolve = (channel, at) => {
    const rule = compareOfficialLimit({ code: row.code, channel, status: 'unknown', limitAmount: null }, timeline, at, 'Asia/Shanghai');
    if (timeline.conflicts?.some(c => c.code === row.code && c.noticeId === rule.noticeId && c.scope === rule.scope)) return { ...unknown, parserStatus: 'conflicting-rules', sourceUrl: rule.noticeUrl };
    const suspended = rule.status === 'official-suspended';
    const covered = suspended || rule.status === 'official-open' || ['match', 'channel-no-limit-shown', 'channel-lower', 'channel-higher'].includes(rule.status);
    const daily = String(rule.accountBasis || '').startsWith('single-fund-account-daily-cumulative');
    return {
      status: !covered ? 'unknown' : suspended ? 'suspended' : rule.status === 'official-open' ? 'open' : daily && rule.currency === 'CNY' ? 'limited' : 'unknown',
      amount: covered && daily && rule.currency === 'CNY' && Number.isFinite(rule.amount) && rule.amount > 0 ? rule.amount : null,
      currency: rule.currency || null, accountBasis: rule.accountBasis || 'unknown', scope: rule.scope,
      effectiveDate: rule.effectiveDate || null, noticeDate: rule.noticeDate || notice.date || null,
      noticeId: rule.noticeId || notice.id || null, sourceUrl: rule.noticeUrl || notice.url || null,
      checkedAt: queriedAt, currentAvailability: 'unverified', parserStatus: rule.status
    };
  };
  const channels = { agency: '代销机构（含支付宝）', direct: '基金公司直销' };
  const current = Object.fromEntries(Object.entries(channels).map(([key, label]) => [key, resolve(label, queriedAt)]));
  const today = beijingDate(queriedAt);
  const dates = [...new Set(timeline.limits.filter(r => r.perShareLimits?.[row.code] || r.perShareStatuses?.[row.code])
    .map(r => r.effectiveDate).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d > today))].sort();
  const pending = dates.flatMap(date => Object.entries(channels).flatMap(([channel, label]) => {
    const next = resolve(label, date + 'T12:00:00+08:00');
    if (next.status === 'unknown' || next.effectiveDate !== date) return [];
    return [{ ...next, channel, pending: true }];
  }));
  return { ...current, pending,
    reviewedNoticeIds: [...new Set([notice.id, ...(notice.timeline || []).map(n => n.id), ...(notice.events || []).map(n => n.id)].filter(Boolean))],
    crossChannelPolicy: 'not-confirmed-independent',
    ruleResolvedAt: queriedAt
  };
}

export function auditSummary(funds, scope, checkedAt) {
  const rows = funds.filter(f => scope.has(f.code));
  const ready = f => f.evidence && !f.evidence.error && !f.audit?.error;
  const known = (f,c) => ready(f) && (f.evidence[c]?.status === 'suspended' || f.evidence[c]?.status === 'limited' && Number.isFinite(f.evidence[c]?.amount));
  return { checkedAt, scopeCount: rows.length,
    indexCount: rows.filter(f => f.category !== 'held').length,
    heldActiveCount: rows.filter(f => f.category === 'held').length,
    currentRules: rows.filter(f => ready(f) && ['agency', 'direct'].some(c => ['limited', 'suspended', 'open'].includes(f.evidence[c]?.status))).length,
    pendingCount: rows.filter(f => ready(f) && f.evidence.pending?.length).length,
    fullyResolved: rows.filter(f => ['agency','direct'].every(c=>known(f,c))).length,
    unresolved: rows.filter(f => !['agency','direct'].every(c=>known(f,c)))
      .map(f => ({ code: f.code, name: f.name, reason: f.audit?.error || f.evidence?.error || ['agency','direct'].filter(c=>!known(f,c)).map(c=>c==='agency'?'代销公告额度待核实':'直销公告额度待核实').join('；') })) };
}
