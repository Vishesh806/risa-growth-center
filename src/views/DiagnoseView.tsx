import React, { useMemo } from 'react';
import { alerts } from '../engine/advanced';
import { addDays, fmt, fmtDate, inr, pct } from '../engine/format';
import { snapshot } from '../engine/snapshot';
import { useGrowthStore } from '../state/useGrowthStore';
import { Callout, Card } from '../components/ui/Primitives';

export const DiagnoseView: React.FC = () => {
  const { state, snap } = useGrowthStore();
  const post = snap.phase === 'post-event';
  const T = snap.totals;

  const alertData = useMemo(() => alerts(state), [state]);
  const prev = useMemo(() => snapshot(state, addDays(snap.as_of, -7)), [state, snap.as_of]);

  const share = snap.campaigns
    .filter((c) => c.spend > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      spend: c.spend / (T.spend || 1),
      out:
        (post ? c.visitors : c.projected_visitors) /
        ((post ? T.visitors : T.projected_visitors) || 1),
    }));

  const dd = snap.campaigns.map((c) => {
    const p = prev.campaigns.find((x) => x.id === c.id);
    return {
      id: c.id,
      name: c.name,
      regs: c.regs - (p?.regs || 0),
      spend: c.spend - (p?.spend || 0),
      cancels: c.cancelled - (p?.cancelled || 0),
      optouts: c.optouts - (p?.optouts || 0),
    };
  });

  const [wStart, wEnd] = alertData.window.split(' vs ')[0].split('..');
  const pPart = alertData.window.split('weekly average of ')[1] || '';
  const [pStart, pEnd] = pPart.split('..');
  const cleanWindow =
    wStart && pStart
      ? `${fmtDate(wStart)} – ${fmtDate(wEnd)} vs weekly avg of ${fmtDate(pStart)} – ${fmtDate(pEnd)}`
      : alertData.window;

  const groupedAlerts = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; metric: string; direction: string; severity: string; items: typeof alertData.alerts }
    >();
    for (const a of alertData.alerts) {
      const allZero = a.last_7d === 0 && a.direction === 'down';
      const key = `${a.metric}|${a.direction}|${a.severity}|${allZero ? 'zero' : 'var'}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, metric: a.metric, direction: a.direction, severity: a.severity, items: [] };
        groups.set(key, g);
      }
      g.items.push(a);
    }
    return [...groups.values()];
  }, [alertData]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card title={`Alerts · ${cleanWindow}`} className="lg:col-span-2">
        {groupedAlerts.length ? (
          <div className="space-y-2.5">
            {groupedAlerts.map((g) => {
              const tone =
                g.severity === 'high' ? 'bad' : g.severity === 'info' ? 'good' : 'info';
              const metricLabel = g.metric.replace(/_/g, ' ');
              const allZero = g.items.every((i) => i.last_7d === 0);

              if (g.items.length > 1) {
                return (
                  <Callout key={g.key} variant={tone}>
                    <div className="mb-2 font-semibold text-[#141413]">
                      {g.items.length} channels ·{' '}
                      {allZero
                        ? `0 ${metricLabel} in last 7d (−100% vs prior 3-wk avg)`
                        : `${metricLabel} ${g.direction} vs prior 3-wk avg`}
                    </div>
                    <div className="divide-y divide-[#E5E2DC]/70 rounded-[6px] border border-[#E5E2DC] bg-white/85 px-3">
                      {g.items.map((a, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 py-1.5 text-xs"
                        >
                          <span className="font-medium text-[#141413]">{a.campaign}</span>
                          <span className="text-[#57534E] tabular-nums">
                            {fmt(a.last_7d)} vs {fmt(a.prior_3wk_weekly_avg)}/wk
                          </span>
                        </div>
                      ))}
                    </div>
                  </Callout>
                );
              }

              const a = g.items[0];
              return (
                <Callout key={g.key} variant={tone}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                    <span>
                      <b className="text-[#141413]">{a.campaign}</b> · {metricLabel} {a.direction}{' '}
                      {a.change != null ? pct(Math.abs(a.change)) : ''}
                    </span>
                    <span className="font-medium text-[#57534E] tabular-nums">
                      {fmt(a.last_7d)} vs {fmt(a.prior_3wk_weekly_avg)}/wk
                    </span>
                  </div>
                </Callout>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#8A847C]">No anomalies in this window.</p>
        )}
        <p className="mt-2.5 text-xs text-[#8A847C]">{alertData.note}</p>
      </Card>

      <Card title={`Spend share vs ${post ? 'visitor' : 'projected visitor'} share`}>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">Campaign</th>
                <th className="px-3.5 py-2.5">Spend share</th>
                <th className="px-3.5 py-2.5">Outcome share</th>
                <th className="px-3.5 py-2.5">Eff. index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {share.map((r) => {
                const idx = r.out / (r.spend || 1);
                return (
                  <tr key={r.id} className="hover:bg-[#F8F7F4]">
                    <td className="px-3.5 py-2.5 text-left font-medium text-[#141413]">{r.name}</td>
                    <td className="px-3.5 py-2.5 text-right">{pct(r.spend)}</td>
                    <td className="px-3.5 py-2.5 text-right">{pct(r.out)}</td>
                    <td
                      className={`px-3.5 py-2.5 text-right font-semibold ${
                        idx >= 1 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {idx.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 text-xs text-[#8A847C]">
          Index &gt; 1 means the campaign delivers more attendees than its share of spend.
        </p>
      </Card>

      <Card title="Bottlenecks (stage furthest below portfolio)">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">Campaign</th>
                <th className="px-3.5 py-2.5 text-left">Weakest stage</th>
                <th className="px-3.5 py-2.5">Campaign</th>
                <th className="px-3.5 py-2.5">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {snap.campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8F7F4]">
                  <td className="px-3.5 py-2.5 text-left font-medium text-[#141413]">{c.name}</td>
                  <td className="px-3.5 py-2.5 text-left text-[#57534E]">
                    {c.bottleneck ? c.bottleneck.stage : '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {c.bottleneck ? pct(c.bottleneck.campaign_value) : ''}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {c.bottleneck ? pct(c.bottleneck.portfolio_value) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Last 7 days change (to ${fmtDate(snap.as_of)})`}>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">Campaign</th>
                <th className="px-3.5 py-2.5">+Regs</th>
                <th className="px-3.5 py-2.5">+Spend</th>
                <th className="px-3.5 py-2.5">+Cancels</th>
                <th className="px-3.5 py-2.5">+Opt-outs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {dd.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8F7F4]">
                  <td className="px-3.5 py-2.5 text-left font-medium text-[#141413]">{r.name}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.regs)}</td>
                  <td
                    className={`px-3.5 py-2.5 text-right ${
                      r.spend < 0 ? 'font-medium text-[#B45309]' : ''
                    }`}
                  >
                    {inr(r.spend)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.cancels)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.optouts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Evidence vs assumption">
        <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[#57534E]">
          <p>
            <b className="text-[#15803D]">Evidence (source records):</b> spend, events, identified
            people, registrations, status history, verified admissions.
          </p>
          <p>
            <b className="text-[#B45309]">Assumptions:</b> show-rate before the event (
            {pct(state.settings.showRate)}), walk-ins ({state.settings.walkins}), budget allocations,
            diminishing-returns factor ({state.settings.diminishing}). Reach is platform-reported per
            day and is <i>not</i> summable to unique people. Attribution = recorded source, not
            causal incrementality.
          </p>
        </div>
      </Card>
    </div>
  );
};
