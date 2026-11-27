import React, { useMemo } from 'react';
import { planCalc } from '../engine/advanced';
import { fmt, inr, pct } from '../engine/format';
import { useGrowthStore } from '../state/useGrowthStore';
import { btnSecondary, Callout, Card, inputClass, KpiCard } from '../components/ui/Primitives';
import type { PlanChannel } from '../engine/types';

export const Plan2026View: React.FC = () => {
  const { state, setPlanChannelValue, setPlanTopValue, resetPlan } = useGrowthStore();
  const P = useMemo(() => planCalc(state), [state]);
  const T = P.totals;

  const numInput = (i: number, k: keyof PlanChannel, step: number, val: number) => (
    <input
      type="number"
      step={step}
      value={val}
      onChange={(e) => setPlanChannelValue(i, k, Number(e.target.value))}
      className={`${inputClass} py-1 px-2 text-right text-xs tabular-nums ${
        step < 1 ? 'w-16' : 'w-20'
      }`}
    />
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Base attendees"
          value={fmt(T.base.vis)}
          badge={`${(T.base.growth_vs_2025 || 0) >= 0 ? '+' : ''}${pct(T.base.growth_vs_2025)} vs 2025`}
          sub={`Baseline ${fmt(state.plan.baseline2025)} · ${inr(T.base.cpv)}/attendee`}
        />
        <KpiCard
          label="Stretch attendees"
          value={fmt(T.stretch.vis)}
          badge={`+${pct(T.stretch.growth_vs_2025)} vs 2025`}
          sub={`${inr(T.stretch.cpv)}/attendee`}
        />
        <KpiCard
          label="Base spend"
          value={inr(T.base.spend)}
          badge={T.base.within_budget ? 'Within budget' : `Over by ${inr(-T.base.budget_gap)}`}
          sub={`Budget ${inr(state.plan.budget)}`}
          fraction={T.base.spend / state.plan.budget}
        />
        <KpiCard
          label="Stretch peak day"
          value={`${fmt(T.stretch.peak_day)} / ${fmt(state.plan.perDayCapacity)}`}
          badge={T.stretch.within_capacity ? 'Within cap' : 'Over cap'}
          sub={`2-day ceiling ≈ ${fmt(P.two_day_unique_ceiling)}`}
          fraction={T.stretch.peak_day / state.plan.perDayCapacity}
        />
      </div>

      {P.warnings.length ? (
        <Callout variant="bad">
          {P.warnings.map((w, idx) => (
            <div key={idx}>{w}</div>
          ))}
        </Callout>
      ) : (
        <Callout variant="good">
          All base assumptions are at or below 2025 evidence; within budget and capacity.
        </Callout>
      )}

      <Card
        title="2026 Bengaluru funnel model (editable)"
        action={
          <button type="button" onClick={resetPlan} className={btnSecondary}>
            Reset model
          </button>
        }
      >
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="sticky left-0 z-10 bg-[#F1EFEA] px-3.5 py-2.5 text-left">Channel</th>
                <th className="px-3 py-2.5">Leads</th>
                <th className="px-3 py-2.5">CPL ₹</th>
                <th className="px-3 py-2.5">Lead→Reg</th>
                <th className="px-3 py-2.5">Reg→Visit</th>
                <th className="px-3 py-2.5">Regs</th>
                <th className="px-3 py-2.5">Visitors</th>
                <th className="px-3 py-2.5">Spend</th>
                <th className="px-3 py-2.5">₹/visitor</th>
                <th className="px-3 py-2.5">vs 2025</th>
                <th className="px-3 py-2.5 text-left">Evidence check</th>
                <th className="px-3 py-2.5">2025 actual</th>
                <th className="px-3 py-2.5">Stretch leads</th>
                <th className="px-3 py-2.5">Stretch R→V</th>
                <th className="px-3 py-2.5">Stretch vis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {P.channels.map((c, i) => (
                <tr key={c.ref} className="group hover:bg-[#F8F7F4]">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8F7F4] px-3.5 py-2.5 text-left font-medium text-[#141413] whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="px-3 py-2.5">{numInput(i, 'leads', 1, state.plan.channels[i].leads)}</td>
                  <td className="px-3 py-2.5">{numInput(i, 'cpl', 1, state.plan.channels[i].cpl)}</td>
                  <td className="px-3 py-2.5">{numInput(i, 'l2r', 0.01, state.plan.channels[i].l2r)}</td>
                  <td className="px-3 py-2.5">{numInput(i, 'r2v', 0.01, state.plan.channels[i].r2v)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(c.base.regs)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#141413]">
                    {fmt(c.base.vis)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{inr(c.base.spend)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(c.base.cpv)}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-medium ${
                      c.incremental_vs_2025.base >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {c.incremental_vs_2025.base >= 0 ? '+' : ''}
                    {fmt(c.incremental_vs_2025.base)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-left text-xs ${
                      c.evidence_flags.length ? 'text-[#B91C1C]' : 'text-[#15803D]'
                    }`}
                  >
                    {c.evidence_flags.length ? c.evidence_flags.join('; ') : '✓ ≤ 2025'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-[#8A847C] whitespace-nowrap">
                    {inr(c.actual2025.cpl)} · {pct(c.actual2025.lead_to_reg)} ·{' '}
                    {pct(c.actual2025.reg_to_visit)}
                  </td>
                  <td className="px-3 py-2.5">
                    {numInput(i, 'sLeads', 1, state.plan.channels[i].sLeads)}
                  </td>
                  <td className="px-3 py-2.5">
                    {numInput(i, 'sR2v', 0.01, state.plan.channels[i].sR2v)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmt(c.stretch.vis)}</td>
                </tr>
              ))}
              <tr className="hover:bg-[#F8F7F4]">
                <td className="sticky left-0 z-10 bg-white px-3.5 py-2.5 text-left text-[#57534E]">
                  Walk-ins
                </td>
                <td colSpan={5} />
                <td className="px-3 py-2.5 text-right">
                  <input
                    type="number"
                    value={state.plan.walkins}
                    onChange={(e) => setPlanTopValue('walkins', Number(e.target.value))}
                    className={`${inputClass} w-20 py-1 px-2 text-right text-xs tabular-nums`}
                  />
                </td>
                <td colSpan={7} />
                <td className="px-3 py-2.5 text-right">
                  <input
                    type="number"
                    value={state.plan.walkinsStretch}
                    onChange={(e) => setPlanTopValue('walkinsStretch', Number(e.target.value))}
                    className={`${inputClass} w-20 py-1 px-2 text-right text-xs tabular-nums`}
                  />
                </td>
              </tr>
              <tr className="hover:bg-[#F8F7F4]">
                <td className="sticky left-0 z-10 bg-white px-3.5 py-2.5 text-left text-[#57534E]">
                  Show-up engine spend
                </td>
                <td colSpan={6} />
                <td className="px-3 py-2.5 text-right">
                  <input
                    type="number"
                    value={state.plan.showupSpend}
                    onChange={(e) => setPlanTopValue('showupSpend', Number(e.target.value))}
                    className={`${inputClass} w-24 py-1 px-2 text-right text-xs tabular-nums`}
                  />
                </td>
                <td colSpan={7} />
              </tr>
              <tr className="bg-[#F1EFEA] font-semibold text-[#141413]">
                <td className="sticky left-0 z-10 bg-[#F1EFEA] px-3.5 py-2.5 text-left">Total</td>
                <td className="px-3 py-2.5 text-right">{fmt(T.base.leads)}</td>
                <td />
                <td className="px-3 py-2.5 text-right">{pct(T.base.regs / (T.base.leads || 1))}</td>
                <td />
                <td className="px-3 py-2.5 text-right">{fmt(T.base.regs)}</td>
                <td className="px-3 py-2.5 text-right">{fmt(T.base.vis)}</td>
                <td className="px-3 py-2.5 text-right">{inr(T.base.spend)}</td>
                <td className="px-3 py-2.5 text-right">{inr(T.base.cpv)}</td>
                <td className="px-3 py-2.5 text-right text-[#15803D]">
                  +{fmt(T.base.vis - state.plan.baseline2025)}
                </td>
                <td colSpan={2} />
                <td className="px-3 py-2.5 text-right">{fmt(T.stretch.leads)}</td>
                <td />
                <td className="px-3 py-2.5 text-right">{fmt(T.stretch.vis)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#E5E2DC] pt-3.5 text-xs text-[#57534E]">
          <label className="flex items-center gap-2">
            <span>Budget</span>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-[#8A847C]">
                ₹
              </span>
              <input
                type="number"
                value={state.plan.budget}
                onChange={(e) => setPlanTopValue('budget', Number(e.target.value))}
                className={`${inputClass} min-h-9 w-28 pl-6 text-right tabular-nums`}
              />
            </div>
          </label>
          <label className="flex items-center gap-2">
            <span>Venue capacity / day</span>
            <input
              type="number"
              value={state.plan.perDayCapacity}
              onChange={(e) => setPlanTopValue('perDayCapacity', Number(e.target.value))}
              className={`${inputClass} min-h-9 w-24 text-right tabular-nums`}
            />
          </label>
          <label className="flex items-center gap-2">
            <span>Day-1 share</span>
            <input
              type="number"
              step="0.01"
              value={state.plan.day1Share}
              onChange={(e) => setPlanTopValue('day1Share', Number(e.target.value))}
              className={`${inputClass} min-h-9 w-20 text-right tabular-nums`}
            />
          </label>
        </div>

        <p className="mt-2.5 text-xs text-[#8A847C]">
          {P.method} Red flags mean a base assumption is more optimistic than what 2025 delivered.
        </p>
      </Card>
    </div>
  );
};
