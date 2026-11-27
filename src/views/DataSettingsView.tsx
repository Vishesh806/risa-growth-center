import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { allCampaigns, campById, dailyRows, RAW, type MergedDailyRow } from '../engine/dataset';
import { fmt, fmtDate, fmtTimestamp, inr } from '../engine/format';
import { useGrowthStore } from '../state/useGrowthStore';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  ModalSheet,
} from '../components/ui/Primitives';
import type { DailyOverride, Settings } from '../engine/types';

export const DataSettingsView: React.FC = () => {
  const {
    state,
    saveDailyOverride,
    deleteDailyRow,
    revertDailyRow,
    addManualEntry,
    deleteManualEntry,
    setTargetValue,
    setSettingValue,
    importStateJson,
    resetAllData,
  } = useGrowthStore();

  const [campFilter, setCampFilter] = useState('C02');
  const [editingDaily, setEditingDaily] = useState<MergedDailyRow | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const shownRows = useMemo(
    () =>
      dailyRows(state)
        .filter((r) => r.campId === campFilter)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state, campFilter]
  );

  const settingLabels: [keyof Settings, string][] = [
    ['showRate', 'Pre-event show-rate (confirmed→visit)'],
    ['walkins', 'Walk-in assumption'],
    ['scaleCPV', 'SCALE if cost/visitor ≤ × blended'],
    ['cutCPV', 'CUT if cost/visitor ≥ × blended'],
    ['optoutCut', 'CUT if opt-out rate ≥'],
    ['minRegToVisit', 'Min reg→visit to SCALE'],
    ['diminishing', 'Diminishing-returns factor'],
    ['partnerColleges', 'Assumed partner colleges (2025)'],
    ['ambassadors', 'Assumed ambassadors (2025)'],
  ];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ ...state, ai: { ...state.ai, key: '' } }, null, 1)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'growth-center-state.json';
    a.click();
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card
        title="Source daily marketing records (editable)"
        action={
          <select
            value={campFilter}
            onChange={(e) => setCampFilter(e.target.value)}
            className={inputClass}
          >
            {allCampaigns(state)
              .filter((c) => !c.isNew)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        }
      >
        <div className="mb-2.5 flex items-center justify-between gap-2 text-xs text-[#8A847C]">
          <span>{shownRows.length} rows · edits recalculate every view and the AI</span>
          <span className="shrink-0 font-medium text-[#0F766E] sm:hidden">Scroll →</span>
        </div>
        <div className="relative">
          <div className="thin-scroll max-h-96 overflow-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">Date</th>
                <th className="px-3.5 py-2.5">Impr.</th>
                <th className="px-3.5 py-2.5">Clicks</th>
                <th className="px-3.5 py-2.5">Sessions</th>
                <th className="px-3.5 py-2.5">Starts</th>
                <th className="px-3.5 py-2.5">Spend ₹</th>
                <th className="px-3.5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {shownRows.map((r) => (
                <tr
                  key={r.id}
                  className={r.edited ? 'bg-[#FFFBEB]' : 'hover:bg-[#F8F7F4]'}
                >
                  <td className="px-3.5 py-2.5 text-left whitespace-nowrap text-[#57534E]">
                    {fmtDate(r.date)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.impr)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.clicks)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.sess)}</td>
                  <td className="px-3.5 py-2.5 text-right">{fmt(r.starts)}</td>
                  <td
                    className={`px-3.5 py-2.5 text-right ${
                      r.spend < 0 ? 'font-medium text-[#B45309]' : ''
                    }`}
                  >
                    {inr(r.spend)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingDaily(r)}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      </Card>

      <Card
        title="Manual outcome entries"
        action={
          <button type="button" onClick={() => setShowManualModal(true)} className={btnSecondary}>
            <Plus className="h-3.5 w-3.5" /> Add entry
          </button>
        }
      >
        <p className="mb-2.5 text-xs text-[#8A847C]">
          Add dated results (offline registrations, corrections). They roll into every metric from
          their date onward.
        </p>
        {!state.manual.length ? (
          <div className="rounded-[8px] border border-dashed border-[#E5E2DC] bg-[#F8F7F4] p-5 text-center text-xs text-[#8A847C]">
            No manual entries yet.
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#E5E2DC] sm:hidden">
              {state.manual.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                  <div>
                    <div className="font-medium text-[#141413]">{campById(state, m.camp)?.name}</div>
                    <div className="text-[#8A847C] tabular-nums">
                      {fmtDate(m.date)} · {inr(m.spend)} · {fmt(m.visitors)} vis
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteManualEntry(m.id)}
                    className="text-[#B91C1C] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="thin-scroll hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Campaign</th>
                    <th className="px-3 py-2">Spend</th>
                    <th className="px-3 py-2">Leads</th>
                    <th className="px-3 py-2">Regs</th>
                    <th className="px-3 py-2">Conf.</th>
                    <th className="px-3 py-2">Vis.</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
                  {state.manual.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8F7F4]">
                      <td className="px-3 py-2 text-left whitespace-nowrap">{fmtDate(m.date)}</td>
                      <td className="px-3 py-2 text-left">{campById(state, m.camp)?.name}</td>
                      <td className="px-3 py-2 text-right">{inr(m.spend)}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.leads)}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.regs)}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.confirmed)}</td>
                      <td className="px-3 py-2 text-right">{fmt(m.visitors)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => deleteManualEntry(m.id)}
                          className="text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Targets">
        <div className="space-y-3">
          {(state.targets || RAW.targets).map((t, i) => (
            <div
              key={t.version}
              className="rounded-[8px] border border-[#E5E2DC] bg-[#F8F7F4] p-3"
            >
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <b className="text-[#141413]">{t.version}</b>
                <span className="text-[#8A847C]">Effective {fmtTimestamp(t.effective)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
                {(['leads', 'regs', 'visitors', 'budget'] as const).map((field) => (
                  <label key={field} className="flex flex-col gap-1 text-[#57534E] capitalize">
                    <span>{field}</span>
                    <div className="relative">
                      {field === 'budget' && (
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-[#8A847C]">
                          ₹
                        </span>
                      )}
                      <input
                        type="number"
                        value={t[field]}
                        onChange={(e) => setTargetValue(i, field, Number(e.target.value))}
                        className={`${inputClass} min-h-9 w-full text-right tabular-nums ${
                          field === 'budget' ? 'pl-6' : ''
                        }`}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Data quality & cleaning applied">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
                <th className="px-3.5 py-2.5 text-left">Source table</th>
                <th className="px-3.5 py-2.5">Rows</th>
                <th className="px-3.5 py-2.5">Duplicates removed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] tabular-nums">
              {Object.entries(RAW.quality)
                .filter(([k]) => k !== 'excluded')
                .map(([k, v]) => {
                  const row = v as { rows?: number; exact_duplicates_removed?: number };
                  return (
                    <tr key={k} className="hover:bg-[#F8F7F4]">
                      <td className="px-3.5 py-2.5 text-left text-[#141413]">{k}</td>
                      <td className="px-3.5 py-2.5 text-right">{fmt(row.rows)}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        {fmt(row.exact_duplicates_removed)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-[#8A847C]">
          Excluded from targets: {RAW.quality.excluded.non_external_people} internal/staff/test
          people, {RAW.quality.excluded.non_external_registrations} internal registrations,{' '}
          {RAW.quality.excluded.checkins_denied} denied and{' '}
          {RAW.quality.excluded.checkins_pending_unverified} pending/unverified check-ins.{' '}
          {fmt(RAW.quality.excluded.admitted_verified_events)} admitted+verified events collapse to
          distinct external visitors.
        </p>
      </Card>

      <Card title="Decision thresholds & assumptions" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {settingLabels.map(([k, label]) => (
            <label
              key={k}
              className="flex items-center justify-between gap-2 rounded-[6px] border border-[#E5E2DC] bg-[#F8F7F4] px-3 py-2 text-xs text-[#57534E]"
            >
              <span>{label}</span>
              <input
                type="number"
                step="0.01"
                value={state.settings[k]}
                onChange={(e) => setSettingValue(k, Number(e.target.value))}
                className={`${inputClass} min-h-8 w-24 text-right text-xs tabular-nums`}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[#E5E2DC] pt-3.5">
          <button type="button" onClick={handleExport} className={btnSecondary}>
            Export JSON
          </button>
          <label className={btnSecondary}>
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) file.text().then(importStateJson);
              }}
            />
          </label>
          <button type="button" onClick={() => setShowResetModal(true)} className={btnDanger}>
            Reset to original dataset
          </button>
        </div>
        <p className="mt-2 text-xs text-[#8A847C]">
          All changes persist in this browser (localStorage). Source: CampusFest 2025 attendee
          dataset (synthetic), deduplicated by stable IDs.
        </p>
      </Card>

      {editingDaily && (
        <EditDailyModal
          row={editingDaily}
          onClose={() => setEditingDaily(null)}
          onSave={(v) => {
            saveDailyOverride(editingDaily.id, v);
            setEditingDaily(null);
          }}
          onDelete={() => {
            deleteDailyRow(editingDaily.id);
            setEditingDaily(null);
          }}
          onRevert={() => {
            revertDailyRow(editingDaily.id);
            setEditingDaily(null);
          }}
        />
      )}

      {showManualModal && (
        <ManualEntryModal
          defaultDate={state.asOf}
          onClose={() => setShowManualModal(false)}
          onSave={(entry) => {
            addManualEntry(entry);
            setShowManualModal(false);
          }}
        />
      )}

      <ModalSheet
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset to original dataset?"
      >
        <p className="text-sm text-[#57534E]">
          All edits, manual entries, tasks, and settings return to the source data. AI connection is
          kept.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowResetModal(false)}
            className={btnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              resetAllData();
              setShowResetModal(false);
            }}
            className="inline-flex items-center justify-center rounded-[6px] bg-[#B91C1C] px-4 py-2 text-sm font-medium text-white hover:bg-[#991B1B] cursor-pointer"
          >
            Reset
          </button>
        </div>
      </ModalSheet>
    </div>
  );
};

const EditDailyModal: React.FC<{
  row: MergedDailyRow;
  onClose: () => void;
  onSave: (v: DailyOverride) => void;
  onDelete: () => void;
  onRevert: () => void;
}> = ({ row, onClose, onSave, onDelete, onRevert }) => {
  const [vals, setVals] = useState<DailyOverride>({
    impr: row.impr,
    clicks: row.clicks,
    sess: row.sess,
    starts: row.starts,
    spend: row.spend,
  });

  return (
    <ModalSheet open onClose={onClose} title={`Edit ${row.id} (${fmtDate(row.date)})`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(vals);
        }}
      >
        {(['impr', 'clicks', 'sess', 'starts', 'spend'] as const).map((k) => (
          <div key={k}>
            <label className="mb-1 block text-xs font-medium text-[#57534E] capitalize">{k}</label>
            <input
              type="number"
              value={vals[k]}
              onChange={(e) => setVals((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
              className={`${inputClass} min-h-10 w-full text-right tabular-nums`}
            />
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <button type="button" onClick={onDelete} className={btnDanger}>
              Delete row
            </button>
            <button type="button" onClick={onRevert} className={btnSecondary}>
              Revert
            </button>
          </div>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </form>
    </ModalSheet>
  );
};

const ManualEntryModal: React.FC<{
  defaultDate: string;
  onClose: () => void;
  onSave: (entry: {
    date: string;
    camp: string;
    note: string;
    spend: number;
    impr: number;
    clicks: number;
    leads: number;
    regs: number;
    confirmed: number;
    cancelled: number;
    visitors: number;
  }) => void;
}> = ({ defaultDate, onClose, onSave }) => {
  const { state } = useGrowthStore();
  const [date, setDate] = useState(defaultDate);
  const [camp, setCamp] = useState('C01');
  const [note, setNote] = useState('');
  const [nums, setNums] = useState({
    spend: 0,
    impr: 0,
    clicks: 0,
    leads: 0,
    regs: 0,
    confirmed: 0,
    cancelled: 0,
    visitors: 0,
  });

  return (
    <ModalSheet open onClose={onClose} title="Manual outcome entry">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ date, camp, note, ...nums });
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Date</label>
            <input
              type="date"
              min="2025-01-15"
              max="2025-04-20"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} min-h-10 w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Campaign</label>
            <select
              value={camp}
              onChange={(e) => setCamp(e.target.value)}
              className={`${inputClass} min-h-10 w-full`}
            >
              {allCampaigns(state).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(['spend', 'impr', 'clicks', 'leads', 'regs', 'confirmed', 'cancelled', 'visitors'] as const).map(
            (k) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-medium text-[#57534E] capitalize">
                  {k}
                </label>
                <input
                  type="number"
                  value={nums[k]}
                  onChange={(e) => setNums((prev) => ({ ...prev, [k]: Number(e.target.value) || 0 }))}
                  className={`${inputClass} min-h-10 w-full text-right tabular-nums`}
                />
              </div>
            )
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} min-h-10 w-full`}
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
