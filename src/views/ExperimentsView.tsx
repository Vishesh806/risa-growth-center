import React, { useMemo } from 'react';
import { experiments } from '../engine/advanced';
import { fmt, fmtDate, pct } from '../engine/format';
import { useGrowthStore } from '../state/useGrowthStore';
import { Card, inputClass, Tag } from '../components/ui/Primitives';
import type { ExperimentEval } from '../engine/types';

export const ExperimentsView: React.FC = () => {
  const { state, setExperimentThreshold, setSettingValue } = useGrowthStore();
  const data = useMemo(() => experiments(state), [state]);

  const formatVal = (e: ExperimentEval, v: number | null) => {
    if (v == null) return '–';
    if (e.unit === 'pct') return pct(v);
    if (e.unit === 'x') return v.toFixed(2) + '×';
    if (e.unit === 'ratio') return v.toFixed(3);
    return fmt(v);
  };

  return (
    <Card title={`Growth bets · ${fmtDate(data.as_of)} (${data.phase})`}>
      {/* Mobile stacked list */}
      <div className="divide-y divide-[#E5E2DC] md:hidden">
        {data.experiments.map((e, i) => (
          <div key={e.id} className="py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[#141413]">{e.name}</div>
                {e.proxy && <div className="text-[11px] text-[#8A847C]">proxy metric</div>}
              </div>
              <Tag tone={e.verdict} />
            </div>

            <div className="mt-2 text-xs text-[#57534E]">{e.label}</div>
            <div className="mt-1 text-lg font-semibold text-[#141413] tabular-nums">
              {formatVal(e, e.value)}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-[6px] bg-[#F8F7F4] px-3 py-2 text-xs border border-[#E5E2DC]">
              <label className="flex items-center gap-1.5 text-[#57534E]">
                <span>Scale {e.higher ? '≥' : '≤'}</span>
                <input
                  type="number"
                  step="0.01"
                  value={e.scale}
                  onChange={(ev) => setExperimentThreshold(i, 'scale', Number(ev.target.value))}
                  className={`${inputClass} h-8 w-16 py-0.5 px-1.5 text-right text-xs tabular-nums`}
                />
              </label>
              <label className="flex items-center gap-1.5 text-[#57534E]">
                <span>Stop {e.higher ? '<' : '≥'}</span>
                <input
                  type="number"
                  step="0.01"
                  value={e.stop}
                  onChange={(ev) => setExperimentThreshold(i, 'stop', Number(ev.target.value))}
                  className={`${inputClass} h-8 w-16 py-0.5 px-1.5 text-right text-xs tabular-nums`}
                />
              </label>
              <span className="text-[11px] text-[#8A847C]">{e.unit}</span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
              {e.calculation}
              {e.guardrail && (
                <>
                  <br />
                  Guardrail: {e.guardrail}
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop/Tablet table */}
      <div className="thin-scroll hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#E5E2DC] bg-[#F1EFEA] text-right text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
              <th className="px-3.5 py-2.5 text-left">Bet</th>
              <th className="px-3.5 py-2.5 text-left">Decision metric</th>
              <th className="px-3.5 py-2.5">Value</th>
              <th className="px-3.5 py-2.5">Scale if</th>
              <th className="px-3.5 py-2.5">Stop if</th>
              <th className="px-3.5 py-2.5 text-center">Verdict</th>
              <th className="px-3.5 py-2.5 text-left">Calculation · guardrail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E2DC]">
            {data.experiments.map((e, i) => (
              <tr key={e.id} className="hover:bg-[#F8F7F4]">
                <td className="px-3.5 py-2.5 text-left font-medium text-[#141413]">
                  {e.name}
                  {e.proxy && <div className="text-[11px] font-normal text-[#8A847C]">proxy metric</div>}
                </td>
                <td className="px-3.5 py-2.5 text-left text-[#57534E]">{e.label}</td>
                <td className="px-3.5 py-2.5 text-right font-semibold text-[#141413] tabular-nums">
                  {formatVal(e, e.value)}
                </td>
                <td className="px-3.5 py-2.5 text-right whitespace-nowrap tabular-nums">
                  <span className="text-[#8A847C] mr-1">{e.higher ? '≥' : '≤'}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={e.scale}
                    onChange={(ev) => setExperimentThreshold(i, 'scale', Number(ev.target.value))}
                    className={`${inputClass} w-20 py-1 text-right text-xs tabular-nums`}
                  />
                </td>
                <td className="px-3.5 py-2.5 text-right whitespace-nowrap tabular-nums">
                  <span className="text-[#8A847C] mr-1">{e.higher ? '<' : '≥'}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={e.stop}
                    onChange={(ev) => setExperimentThreshold(i, 'stop', Number(ev.target.value))}
                    className={`${inputClass} w-20 py-1 text-right text-xs tabular-nums`}
                  />
                </td>
                <td className="px-3.5 py-2.5 text-center">
                  <Tag tone={e.verdict} />
                </td>
                <td className="max-w-md px-3.5 py-2.5 text-left text-xs text-[#57534E]">
                  {e.calculation}
                  {e.guardrail && (
                    <>
                      <br />
                      Guardrail: {e.guardrail}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#E5E2DC] pt-3.5 text-xs text-[#57534E]">
        <label className="flex items-center gap-2">
          <span>Assumed partner colleges</span>
          <input
            type="number"
            value={state.settings.partnerColleges}
            onChange={(e) => setSettingValue('partnerColleges', Number(e.target.value))}
            className={`${inputClass} min-h-9 w-20 text-right tabular-nums`}
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Assumed ambassadors</span>
          <input
            type="number"
            value={state.settings.ambassadors}
            onChange={(e) => setSettingValue('ambassadors', Number(e.target.value))}
            className={`${inputClass} min-h-9 w-20 text-right tabular-nums`}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-[#8A847C]">
        Change the dashboard date to replay any week: verdicts use only data available on that day.
        Thresholds match Slide 3 and persist.
      </p>
    </Card>
  );
};
