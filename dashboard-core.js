// Pure rules shared by the browser and offline checks. Missing data stays missing.
(function (root) {
  const DAY = 86400000;
  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  function ageDays(date, now = Date.now()) {
    const stamp = Date.parse(date || '');
    return Number.isFinite(stamp) ? (now - stamp) / DAY : Infinity;
  }
  function fundState(fund, snapshot, now = Date.now()) {
    if (!fund || !finite(fund.nav) || Number(fund.nav) <= 0 || !fund.latestDate) return { level: 'error', label: '净值未获取' };
    if (fund.refreshStatus === 'failed') return { level: 'error', label: '检查失败 · 保留旧值' };
    const checked = fund.lastSuccessAt || snapshot?.checkedAt || snapshot?.updatedAt;
    if (ageDays(checked, now) > 1.5) return { level: 'warning', label: '检查时间过久' };
    // Calendar-age guard only: it does not infer publication or exchange calendars.
    if (ageDays(fund.latestDate + 'T23:59:59+08:00', now) > 4) return { level: 'warning', label: '净值日期较早' };
    return { level: 'ok', label: '已更新' };
  }
  function groupReturns(rows) {
    const groups = new Map();
    for (const row of rows) {
      const date = row.result?.fund?.latestDate;
      if (!date || !finite(row.result?.amount)) continue;
      const group = groups.get(date) || { date, rows: [], amount: 0, previousValue: 0 };
      group.rows.push(row);
      group.amount += row.result.amount;
      group.previousValue += Math.max(0, Number(row.value || 0) - row.result.amount);
      groups.set(date, group);
    }
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date)).map(group => ({
      ...group, rate: group.previousValue > 0 ? group.amount / group.previousValue * 100 : null,
    }));
  }
  function drawdownBand(value) {
    if (!finite(value)) return null;
    const drawdown = Math.max(0, -Number(value));
    return drawdown >= 20 ? 4 : drawdown >= 15 ? 3 : drawdown >= 10 ? 2 : drawdown >= 5 ? 1 : 0;
  }
  function sparkline(history) {
    const rows = (history || []).filter(row => finite(row.value) && row.date);
    if (rows.length < 2) return '';
    const values = rows.map(row => Number(row.value));
    const min = Math.min(...values), range = Math.max(...values) - min;
    return values.map((value, index) => `${index ? 'L' : 'M'}${(index / (values.length - 1) * 156 + 2).toFixed(2)},${(range ? 42 - (value - min) / range * 38 : 23).toFixed(2)}`).join(' ');
  }
  root.dashboardCore = { ageDays, fundState, groupReturns, drawdownBand, sparkline };
})(globalThis);
