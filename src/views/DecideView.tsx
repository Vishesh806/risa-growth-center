import React, { useState } from 'react';
import { fmt, fmtTimestamp, inr } from '../engine/format';
import { simulateReallocation } from '../engine/snapshot';
import { useGrowthStore } from '../state/useGrowthStore';
import { btnPrimary, Callout, Card, inputClass, Tag } from '../components/ui/Primitives';
import type { ReallocationResult } from '../engine/types';

export const DecideView: React.FC = () => {
  const { state, snap } = useGrowthStore();
  const post = snap.phase === 'post-event';
  const [amount, setAmount] = useState('20000');
  const [fromId, setFromId] = useState(snap.campaigns[1]?.id || snap.campaigns[0]?.id || 'C02');
  const [toId, setToId] = useState(snap.campaigns[3]?.id || snap.campaigns[0]?.id || 'C04');
  const [simResult, setSimResult] = useState<ReallocationResult | null>(null);

  const ranked = [...snap.campaigns]
    .filter((c) => c.status === 'active')
    .sort(
      (a, b) =>
        ((post ? a.cost_per_visitor : a.projected_cost_per_visitor) || 1e9) -
        ((post ? b.cost_per_visitor : b.projected_cost_per_visitor) || 1e9)
    );

  const topCpv =
    (post ? ranked[0]?.cost_per_visitor : ranked[0]?.projected_cost_per_visitor) || 1;
  const estExtraFromRemaining =
    snap.pacing.budget.remaining > 0 && ranked[0]
      ? snap.pacing.budget.remaining / (topCpv * state.settings.diminishing)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card title="Priority ranking (cheapest attendee first)">
        {/* Mobile single-row list (< 640px) */}
        <div className="divide-y divide-[#E5E2DC] sm:hidden">
          {ranked.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-xs font-medium text-[#8A847C] tabular-nums">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-medium text-[#141413]">{c.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-medium text-[#57534E] tabular-nums">
                  {inr(post ? c.cost_per_visitor : c.projected_cost_per_visitor)}
                  <span className="text-[#8A847C]"> / vis</span>
                </span>
                <Tag tone={c.recommendation} />
              </div>
            </div>
          ))}
        </div>

        {/* Tablet & Desktop table (>= 640px) */}
        <div className="thin-scroll hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">#</th>
                <th className="px-3.5 py-2.5 text-left">Campaign</th>
                <th className="px-3.5 py-2.5">{post ? '₹/visitor' : 'Proj. CPV'}</th>
                <th className="px-3.5 py-2.5 text-center">Call</th>
                <th className="px-3.5 py-2.5 text-left">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {ranked.map((c, i) => (
                <tr key={c.id} className="hover:bg-[#F8F7F4]">
                  <td className="px-3.5 py-2.5 text-[#8A847C] tabular-nums">{i + 1}</td>
                  <td className="px-3.5 py-2.5 font-medium text-[#141413] whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {inr(post ? c.cost_per_visitor : c.projected_cost_per_visitor)}
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <Tag tone={c.recommendation} />
                  </td>
                  <td className="px-3.5 py-2.5 text-xs text-[#57534E]">{c.reasons.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Budget reallocation simulator">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-[#8A847C]">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} min-h-9 w-full pl-6 text-right tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">From campaign</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className={`${inputClass} min-h-9 w-full`}
            >
              {snap.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">To campaign</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className={`${inputClass} min-h-9 w-full`}
            >
              {snap.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() =>
              setSimResult(
                simulateReallocation(state, [
                  { from: fromId, to: toId, amount: Number(amount) || 0 },
                ])
              )
            }
            className={btnPrimary}
          >
            Simulate reallocation
          </button>
        </div>

        {simResult && (
          <Callout variant="info" className="mt-3">
            {simResult.moves.map((m, i) =>
              m.error ? (
                <div key={i} className="text-[#B91C1C]">
                  {m.error}
                </div>
              ) : (
                <div key={i} className="tabular-nums">
                  {m.from} → {m.to}: −{fmt(m.visitors_lost_est)} / +{fmt(m.visitors_gained_est)}{' '}
                  visitors ⇒{' '}
                  <b className={(m.net || 0) >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                    net {(m.net || 0) >= 0 ? '+' : ''}
                    {fmt(m.net)}
                  </b>
                </div>
              )
            )}
          </Callout>
        )}

        <p className="mt-3 text-xs text-[#8A847C]">
          Uses {post ? 'actual' : 'projected'} cost per visitor with a diminishing-returns factor of{' '}
          {state.settings.diminishing} (Settings). Directional only.
        </p>
      </Card>

      <Card title="Remaining budget">
        <div className="space-y-2 text-xs sm:text-sm text-[#57534E] tabular-nums">
          <p>
            Approved <b className="text-[#141413]">{inr(snap.pacing.budget.approved)}</b> · spent{' '}
            <b className="text-[#141413]">{inr(snap.pacing.budget.spent)}</b> · remaining{' '}
            <b className="text-[#0F766E]">{inr(snap.pacing.budget.remaining)}</b>. At the
            last-14-day run rate, projected spend by event end:{' '}
            {inr(snap.pacing.budget.projected_spend_14d_run_rate)}.
          </p>
          <p>
            Unallocated if put into the top-ranked active campaign ({ranked[0]?.name || '–'}): ≈{' '}
            <b className="text-[#141413]">{fmt(estExtraFromRemaining)}</b> extra visitors (estimate).
          </p>
        </div>
      </Card>

      <Card title="Change log">
        <div className="thin-scroll max-h-56 space-y-1.5 overflow-y-auto text-xs text-[#57534E]">
          {state.log.length ? (
            state.log.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-x-2">
                <span className="shrink-0 text-[#8A847C] tabular-nums">
                  {fmtTimestamp(l.at)}
                </span>
                <span>{l.msg}</span>
              </div>
            ))
          ) : (
            <p className="text-[#8A847C]">No changes yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
