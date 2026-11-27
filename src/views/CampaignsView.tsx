import React, { useMemo, useState } from 'react';
import { ArrowUpRight, MoreHorizontal, Plus } from 'lucide-react';
import { campById, OWNERS } from '../engine/dataset';
import { fmt, inr, pct } from '../engine/format';
import { weekly } from '../engine/snapshot';
import { useGrowthStore } from '../state/useGrowthStore';
import { WeeklyTrendChart } from '../components/charts/Charts';
import {
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  ModalSheet,
  Tag,
} from '../components/ui/Primitives';
import type { CampaignStatus } from '../engine/types';

export const CampaignsView: React.FC = () => {
  const { state, snap, saveCampaign } = useGrowthStore();
  const post = snap.phase === 'post-event';
  const [drillId, setDrillId] = useState(snap.campaigns[0]?.id || 'C01');
  const [modalCampId, setModalCampId] = useState<string | null | undefined>(undefined);

  const drillCamp = snap.campaigns.find((c) => c.id === drillId) || snap.campaigns[0];
  const drillWeekly = useMemo(
    () => (drillCamp && !drillCamp.isNew ? weekly(state, drillCamp.id) : []),
    [state, drillCamp]
  );

  return (
    <div className="space-y-4">
      <Card
        title="Campaign performance & management"
        action={
          <button type="button" onClick={() => setModalCampId(null)} className={btnPrimary}>
            <Plus className="h-3.5 w-3.5" /> New campaign
          </button>
        }
      >
        {/* Mobile stacked list */}
        <div className="divide-y divide-[#E5E2DC] md:hidden">
          {snap.campaigns.map((c) => (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-[#141413]">{c.name}</div>
                  <div className="text-xs text-[#8A847C]">
                    {c.id} · {c.owner} · {c.status}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Tag tone={c.recommendation} title={c.reasons.join('; ')} />
                  <button
                    type="button"
                    onClick={() => {
                      setDrillId(c.id);
                      document.getElementById('camp-drill')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="View trend"
                    className="inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-1 text-xs font-medium text-[#0F766E] hover:bg-[#F0FDFA] cursor-pointer"
                  >
                    <span>Trend</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCampId(c.id)}
                    aria-label={`Edit ${c.name}`}
                    title={`Edit ${c.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D1CDC4] bg-white text-[#57534E] hover:bg-[#F1EFEA] cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
                <div>
                  <div className="text-[#8A847C]">Spend</div>
                  <div className="font-medium text-[#141413]">{inr(c.spend)}</div>
                </div>
                <div>
                  <div className="text-[#8A847C]">{post ? 'Visitors' : 'Proj. vis'}</div>
                  <div className="font-medium text-[#141413]">{fmt(c.projected_visitors)}</div>
                </div>
                <div>
                  <div className="text-[#8A847C]">{post ? '₹/visitor' : 'Proj. CPV'}</div>
                  <div className="font-medium text-[#141413]">
                    {inr(post ? c.cost_per_visitor : c.projected_cost_per_visitor)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8A847C]">Leads</div>
                  <div className="font-medium text-[#141413]">{fmt(c.leads)}</div>
                </div>
                <div>
                  <div className="text-[#8A847C]">Regs</div>
                  <div className="font-medium text-[#141413]">{fmt(c.regs)}</div>
                </div>
                <div>
                  <div className="text-[#8A847C]">Opt-out</div>
                  <div className="font-medium text-[#141413]">{pct(c.optout_rate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet & Desktop sticky-column table */}
        <div className="thin-scroll hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="sticky left-0 z-10 bg-[#F1EFEA] px-3.5 py-2.5 text-left">Campaign</th>
                <th className="px-3.5 py-2.5 text-left">Status</th>
                <th className="px-3.5 py-2.5 text-left">Owner</th>
                <th className="px-3.5 py-2.5">Budget</th>
                <th className="px-3.5 py-2.5">Spend</th>
                <th className="px-3.5 py-2.5">% used</th>
                <th className="px-3.5 py-2.5">Leads</th>
                <th className="px-3.5 py-2.5">CPL</th>
                <th className="px-3.5 py-2.5">Regs</th>
                <th className="px-3.5 py-2.5">Lead→Reg</th>
                <th className="px-3.5 py-2.5">Confirmed</th>
                <th className="px-3.5 py-2.5">Cancel %</th>
                <th className="px-3.5 py-2.5">{post ? 'Visitors' : 'Proj. vis'}</th>
                <th className="px-3.5 py-2.5">Reg→Visit</th>
                <th className="px-3.5 py-2.5">{post ? '₹/visitor' : 'Proj. CPV'}</th>
                <th className="px-3.5 py-2.5">Opt-out %</th>
                <th className="px-3.5 py-2.5 text-center">Call</th>
                <th className="px-3.5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {snap.campaigns.map((c) => (
                <tr key={c.id} className="group hover:bg-[#F8F7F4]">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8F7F4] px-3.5 py-2.5 text-left">
                    <div className="font-semibold text-[#141413]">{c.name}</div>
                    <div className="text-[11px] text-[#8A847C]">
                      {c.id} · {c.channel}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-left text-[#57534E]">{c.status}</td>
                  <td className="px-3.5 py-2.5 text-left whitespace-nowrap text-[#57534E]">{c.owner}</td>
                  <td className="px-3.5 py-2.5 text-right">{inr(c.budget)}</td>
                  <td className="px-3.5 py-2.5 text-right">{inr(c.spend)}</td>
                  <td className="px-3.5 py-2.5 text-right">{pct(c.budget_used)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(c.leads)}</td>
                  <td className="px-3.5 py-2.5 text-right">{inr(c.cpl)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(c.regs)}</td>
                  <td className="px-3.5 py-2.5 text-right">{pct(c.lead_to_reg)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(c.confirmed)}</td>
                  <td className="px-3.5 py-2.5 text-right">{pct(c.cancel_rate)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(c.projected_visitors)}</td>
                  <td className="px-3.5 py-2.5 text-right">{pct(c.reg_to_visit)}</td>
                  <td className="px-3.5 py-2.5 text-right font-semibold text-[#141413]">
                    {inr(post ? c.cost_per_visitor : c.projected_cost_per_visitor)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">{pct(c.optout_rate)}</td>
                  <td className="px-3.5 py-2.5 text-center">
                    <Tag tone={c.recommendation} title={c.reasons.join('; ')} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setModalCampId(c.id)}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-[#F1EFEA] font-semibold text-[#141413]">
                <td className="sticky left-0 z-10 bg-[#F1EFEA] px-3.5 py-2.5 text-left">Total</td>
                <td colSpan={2} />
                <td className="px-3.5 py-2.5 text-right">{inr(snap.totals.budget)}</td>
                <td className="px-3.5 py-2.5 text-right">{inr(snap.totals.spend)}</td>
                <td />
                <td className="px-3.5 py-2.5 text-right">{fmt(snap.totals.leads)}</td>
                <td className="px-3.5 py-2.5 text-right">{inr(snap.totals.cpl)}</td>
                <td className="px-3.5 py-2.5 text-right">{fmt(snap.totals.regs)}</td>
                <td className="px-3.5 py-2.5 text-right">{pct(snap.totals.lead_to_reg)}</td>
                <td className="px-3.5 py-2.5 text-right">{fmt(snap.totals.confirmed)}</td>
                <td />
                <td className="px-3.5 py-2.5 text-right">{fmt(snap.totals.projected_visitors)}</td>
                <td className="px-3.5 py-2.5 text-right">{pct(snap.totals.reg_to_visit)}</td>
                <td className="px-3.5 py-2.5 text-right">{inr(snap.totals.blended_cpv)}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#8A847C]">
          Leads = identified external people by fixed first-touch campaign. Registrations and
          visitors use the campaign recorded on the registration or check-in. Walk-ins (
          {fmt(snap.totals.walkin_visitors)}) are unattributed.
        </p>
      </Card>

      <div id="camp-drill">
        <Card
          title="Campaign drill-down"
        action={
          <select
            value={drillId}
            onChange={(e) => setDrillId(e.target.value)}
            className={inputClass}
          >
            {snap.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WeeklyTrendChart
            data={drillWeekly}
            series={[
              { key: 'leads', label: 'Leads', color: '#0F766E' },
              { key: 'registrations', label: 'Registrations', color: '#57534E' },
              { key: 'cancellations', label: 'Cancellations', color: '#D97706' },
            ]}
          />
          <WeeklyTrendChart
            data={drillWeekly}
            series={[{ key: 'spend', label: 'Weekly Spend (₹)', color: '#0F766E' }]}
          />
        </div>
        {drillCamp && (
          <p className="mt-3 text-xs leading-relaxed text-[#57534E]">
            <b className="text-[#141413]">Bottleneck:</b>{' '}
            {drillCamp.bottleneck
              ? `${drillCamp.bottleneck.stage} — ${pct(drillCamp.bottleneck.campaign_value)} vs portfolio ${pct(drillCamp.bottleneck.portfolio_value)}`
              : 'none material vs portfolio'}
            . <b className="text-[#141413]">Tasks:</b>{' '}
            {state.tasks
              .filter((t) => t.camp === drillCamp.id)
              .map((t) => `${t.title} [${t.status}]`)
              .join('; ') || 'none'}
            .
          </p>
        )}
      </Card>
      </div>

      {modalCampId !== undefined && (
        <CampaignFormModal
          campId={modalCampId}
          onClose={() => setModalCampId(undefined)}
          onSave={(data) => {
            saveCampaign(modalCampId, data);
            setModalCampId(undefined);
          }}
        />
      )}
    </div>
  );
};

const CampaignFormModal: React.FC<{
  campId: string | null;
  onClose: () => void;
  onSave: (data: {
    name?: string;
    channel?: string;
    owner: string;
    budget: number;
    status: CampaignStatus;
    notes: string;
  }) => void;
}> = ({ campId, onClose, onSave }) => {
  const { state } = useGrowthStore();
  const existing = campId ? campById(state, campId) : null;
  const [name, setName] = useState(existing?.name || '');
  const [channel, setChannel] = useState(existing?.channel || '');
  const [owner, setOwner] = useState(existing?.owner || OWNERS[0]);
  const [budget, setBudget] = useState(String(existing?.budget || 0));
  const [status, setStatus] = useState<CampaignStatus>(existing?.status || 'active');
  const [notes, setNotes] = useState(existing?.notes || '');

  const owners = [...new Set([...OWNERS, owner].filter(Boolean))];

  return (
    <ModalSheet open onClose={onClose} title={campId ? `Edit ${existing?.name}` : 'New campaign'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!campId && !name.trim()) return;
          onSave({
            name: campId ? undefined : name.trim(),
            channel: campId ? undefined : channel.trim() || 'other',
            owner,
            budget: Number(budget) || 0,
            status,
            notes,
          });
        }}
      >
        {!campId && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#57534E]">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} min-h-10 w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#57534E]">Channel</label>
              <input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. whatsapp_groups"
                className={`${inputClass} min-h-10 w-full`}
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">Owner</label>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={`${inputClass} min-h-10 w-full`}
          >
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Planned budget</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#8A847C]">
                ₹
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`${inputClass} min-h-10 w-full pl-7 text-right tabular-nums`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
              className={`${inputClass} min-h-10 w-full`}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="stopped">stopped</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </form>
    </ModalSheet>
  );
};
