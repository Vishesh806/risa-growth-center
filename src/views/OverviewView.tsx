import React, { useMemo } from 'react';
import { fmt, fmtDate, inr, pct } from '../engine/format';
import { weekly } from '../engine/snapshot';
import { useGrowthStore } from '../state/useGrowthStore';
import { HorizontalBarList, WeeklyTrendChart } from '../components/charts/Charts';
import { Callout, Card, KpiCard } from '../components/ui/Primitives';

export const OverviewView: React.FC = () => {
  const { state, snap } = useGrowthStore();
  const T = snap.totals;
  const P = snap.pacing;
  const post = snap.phase === 'post-event';
  const weeklyData = useMemo(() => weekly(state), [state]);

  const funnelRows = [
    { name: 'Identified external people', value: T.leads },
    { name: 'Registrations', value: T.regs },
    { name: 'Confirmed (latest status)', value: T.confirmed },
    {
      name: post ? 'Verified visitors (attributed)' : 'Projected visitors (confirmed × show)',
      value: post ? T.visitors : T.projected_visitors,
    },
  ];

  const best = snap.campaigns.filter((c) => c.recommendation === 'SCALE');
  const worst = snap.campaigns.filter((c) => c.recommendation === 'CUT');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Verified external visitors"
          value={fmt(P.visitors.actual)}
          badge={`${pct(P.visitors.pct_of_goal)} of goal`}
          sub={`Goal ${fmt(P.visitors.goal)} · projected ${fmt(P.visitors.projected)}`}
          fraction={P.visitors.projected / P.visitors.goal}
        />
        <KpiCard
          label="Registrations"
          value={fmt(P.registrations.actual)}
          badge={`${pct(P.registrations.pct_of_goal)} of goal`}
          sub={`Goal ${fmt(P.registrations.goal)} · linear plan ${fmt(P.registrations.expected_by_now_linear)}`}
          fraction={P.registrations.pct_of_goal}
        />
        <KpiCard
          label="Identified people (leads)"
          value={fmt(P.leads.actual)}
          badge={`${pct(P.leads.pct_of_goal)} of goal`}
          sub={`Goal ${fmt(P.leads.goal)}`}
          fraction={P.leads.pct_of_goal}
        />
        <KpiCard
          label="Marketing spend"
          value={inr(P.budget.spent)}
          badge={`${pct(P.budget.pct_used)} used`}
          sub={`Budget ${inr(P.budget.approved)} · left ${inr(P.budget.remaining)}`}
          fraction={P.budget.pct_used}
        />
        <KpiCard
          label={post ? 'Cost per verified visitor' : 'Projected cost / visitor'}
          value={inr(T.blended_cpv)}
          sub={`CPL ${inr(T.cpl)} · cost/reg ${inr(T.cost_per_reg)}`}
        />
        <KpiCard
          label="Show-up rate"
          value={post ? pct(T.reg_to_visit) : 'Pre-event'}
          sub={
            post
              ? `Confirmed→visit ${pct(T.confirmed_to_visit)} · walk-ins ${fmt(T.walkin_visitors)}`
              : `Assumed ${pct(state.settings.showRate)} of confirmed`
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title={`Funnel (${fmtDate(snap.as_of)})`}>
          <HorizontalBarList rows={funnelRows} formatValue={fmt} defaultColor="#0F766E" />
          <p className="mt-3.5 text-xs leading-relaxed text-[#57534E] tabular-nums">
            Top-of-funnel (anonymous events): {fmt(T.impr)} impressions → {fmt(T.clicks)} clicks
            (CTR {pct(T.ctr)}) → {fmt(T.sessions)} sessions. Lead→reg {pct(T.lead_to_reg)}
            {post ? `, reg→visit ${pct(T.reg_to_visit)}` : ''}.
          </p>
        </Card>

        <Card title="Weekly trend (leads, registrations, cancellations)">
          <WeeklyTrendChart
            data={weeklyData}
            series={[
              { key: 'leads', label: 'Leads', color: '#0F766E' },
              { key: 'registrations', label: 'Registrations', color: '#57534E' },
              { key: 'cancellations', label: 'Cancellations', color: '#D97706' },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Recommended actions">
          <div className="space-y-2">
            {best.map((c) => (
              <Callout key={c.id} variant="good">
                <b className="text-[#15803D]">Scale {c.name}</b> — {c.reasons.join('; ')}
              </Callout>
            ))}
            {worst.map((c) => (
              <Callout key={c.id} variant="bad">
                <b className="text-[#B91C1C]">Cut / restructure {c.name}</b> — {c.reasons.join('; ')}
                {c.bottleneck ? `; bottleneck: ${c.bottleneck.stage}` : ''}
              </Callout>
            ))}
            {P.visitors.projected < P.visitors.goal ? (
              <Callout variant="bad">
                Projected visitors {fmt(P.visitors.projected)} miss the goal by{' '}
                <span className="font-semibold text-[#B91C1C] tabular-nums">
                  {fmt(P.visitors.goal - P.visitors.projected)}
                </span>
                .
              </Callout>
            ) : (
              <Callout variant="good">Projected visitors meet the goal.</Callout>
            )}
          </div>
          <p className="mt-3 text-xs text-[#8A847C]">
            Thresholds: scale ≤ {state.settings.scaleCPV}× blended CPV, cut ≥{' '}
            {state.settings.cutCPV}× or opt-out ≥ {pct(state.settings.optoutCut)}.
          </p>
        </Card>

        <Card title={`Cost per ${post ? 'verified' : 'projected'} visitor by campaign`}>
          <HorizontalBarList
            rows={snap.campaigns.map((c) => ({
              name: c.name,
              value: post ? c.cost_per_visitor : c.projected_cost_per_visitor,
              color:
                c.recommendation === 'SCALE'
                  ? '#0F766E'
                  : c.recommendation === 'CUT'
                    ? '#B91C1C'
                    : '#D97706',
            }))}
            formatValue={inr}
          />
        </Card>
      </div>
    </div>
  );
};
