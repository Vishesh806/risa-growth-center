import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_SETTINGS,
  freshState,
  HIST_END,
  RAW,
  SEED_EXPS,
  SEED_PLAN,
} from '../engine/dataset';
import { addDays, validDate } from '../engine/format';
import { snapshot } from '../engine/snapshot';
import type {
  AIConfig,
  AppState,
  CampaignConfig,
  CampaignStatus,
  DailyOverride,
  ExperimentDef,
  ManualEntry,
  PendingProposal,
  PlanChannel,
  PlanModel,
  Settings,
  Snapshot,
  TargetVersion,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../engine/types';

const LS_KEY = 'campusfest_growth_center_v1';

declare global {
  interface Window {
    GC_CONFIG?: Partial<AIConfig>;
  }
}

function loadInitialState(): AppState {
  const cfg = typeof window !== 'undefined' ? window.GC_CONFIG : undefined;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return freshState(cfg);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = freshState(cfg);
    return {
      ...base,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      ai: {
        ...DEFAULT_AI_CONFIG,
        ...(cfg || {}),
        ...(parsed.ai || {}),
        key: parsed.ai?.key || cfg?.key || '',
      },
      plan: parsed.plan || (JSON.parse(JSON.stringify(SEED_PLAN)) as PlanModel),
    };
  } catch {
    return freshState(cfg);
  }
}

function withLog(state: AppState, msg: string): AppState {
  const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return { ...state, log: [{ at, msg }, ...state.log].slice(0, 200) };
}

interface GrowthContextValue {
  state: AppState;
  snap: Snapshot;
  setAsOf: (date: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  saveTask: (id: string | null, data: Omit<TaskItem, 'id' | 'created' | 'source'>) => void;
  saveCampaign: (
    id: string | null,
    data: { name?: string; channel?: string; owner: string; budget: number; status: CampaignStatus; notes: string }
  ) => void;
  saveDailyOverride: (id: string, data: DailyOverride) => void;
  deleteDailyRow: (id: string) => void;
  revertDailyRow: (id: string) => void;
  addManualEntry: (entry: Omit<ManualEntry, 'id'>) => void;
  deleteManualEntry: (id: string) => void;
  setTargetValue: (index: number, key: 'leads' | 'regs' | 'visitors' | 'budget', value: number) => void;
  setSettingValue: (key: keyof Settings, value: number) => void;
  setPlanChannelValue: (index: number, key: keyof PlanChannel, value: number) => void;
  setPlanTopValue: (key: keyof Omit<PlanModel, 'channels'>, value: number) => void;
  resetPlan: () => void;
  setExperimentThreshold: (index: number, key: 'scale' | 'stop', value: number) => void;
  setAIConfig: (ai: AIConfig) => void;
  importStateJson: (jsonText: string) => void;
  resetAllData: () => void;
  applyProposal: (p: PendingProposal) => string;
}

const GrowthContext = createContext<GrowthContextValue | null>(null);

export const GrowthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const snap = useMemo(() => snapshot(state), [state]);

  const setAsOf = useCallback((date: string) => {
    setState((prev) => ({ ...prev, asOf: date || HIST_END }));
  }, []);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setState((prev) => {
      const target = prev.tasks.find((t) => t.id === id);
      if (!target) return prev;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      };
      return withLog(next, `Task "${target.title}" → ${status}`);
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.tasks.find((t) => t.id === id);
      const next = { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) };
      return target ? withLog(next, `Deleted task "${target.title}"`) : next;
    });
  }, []);

  const saveTask = useCallback(
    (id: string | null, data: Omit<TaskItem, 'id' | 'created' | 'source'>) => {
      setState((prev) => {
        if (id) {
          const next = {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
          };
          return withLog(next, `Updated task "${data.title}"`);
        }
        const seq = prev.seq + 1;
        const created: TaskItem = {
          id: `T${seq}`,
          created: prev.asOf,
          source: 'manual',
          ...data,
        };
        return withLog({ ...prev, seq, tasks: [...prev.tasks, created] }, `Created task "${data.title}"`);
      });
    },
    []
  );

  const saveCampaign = useCallback(
    (
      id: string | null,
      data: { name?: string; channel?: string; owner: string; budget: number; status: CampaignStatus; notes: string }
    ) => {
      setState((prev) => {
        if (id) {
          const next = {
            ...prev,
            campaigns: {
              ...prev.campaigns,
              [id]: { ...(prev.campaigns[id] || {}), ...data },
            },
          };
          return withLog(next, `Updated campaign ${id}: ${JSON.stringify(data)}`);
        }
        const seq = prev.seq + 1;
        const nc: CampaignConfig = {
          id: `N${seq}`,
          idx: -1,
          isNew: true,
          name: data.name || 'New campaign',
          channel: data.channel || 'other',
          audience: '',
          objective: '',
          start: prev.asOf,
          end: '2025-04-13T20:00',
          owner: data.owner,
          budget: data.budget,
          status: data.status,
          notes: data.notes,
        };
        return withLog(
          { ...prev, seq, newCampaigns: [...prev.newCampaigns, nc] },
          `Created campaign ${nc.name}`
        );
      });
    },
    []
  );

  const saveDailyOverride = useCallback((id: string, data: DailyOverride) => {
    setState((prev) => {
      const next = {
        ...prev,
        dailyOverrides: { ...prev.dailyOverrides, [id]: data },
      };
      return withLog(next, `Edited daily row ${id}: ${JSON.stringify(data)}`);
    });
  }, []);

  const deleteDailyRow = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        dailyDeleted: prev.dailyDeleted.includes(id) ? prev.dailyDeleted : [...prev.dailyDeleted, id],
      };
      return withLog(next, `Deleted daily row ${id}`);
    });
  }, []);

  const revertDailyRow = useCallback((id: string) => {
    setState((prev) => {
      const copy = { ...prev.dailyOverrides };
      delete copy[id];
      return { ...prev, dailyOverrides: copy };
    });
  }, []);

  const addManualEntry = useCallback((entry: Omit<ManualEntry, 'id'>) => {
    setState((prev) => {
      const seq = prev.seq + 1;
      const m: ManualEntry = { id: `M${seq}`, ...entry };
      return withLog({ ...prev, seq, manual: [...prev.manual, m] }, `Manual entry ${m.id} for ${m.camp}`);
    });
  }, []);

  const deleteManualEntry = useCallback((id: string) => {
    setState((prev) =>
      withLog({ ...prev, manual: prev.manual.filter((m) => m.id !== id) }, `Deleted manual entry ${id}`)
    );
  }, []);

  const setTargetValue = useCallback(
    (index: number, key: 'leads' | 'regs' | 'visitors' | 'budget', value: number) => {
      setState((prev) => {
        const targets: TargetVersion[] = prev.targets
          ? prev.targets.map((t) => ({ ...t }))
          : (JSON.parse(JSON.stringify(RAW.targets)) as TargetVersion[]);
        if (!targets[index]) return prev;
        targets[index][key] = value;
        return withLog(
          { ...prev, targets },
          `Target ${targets[index].version}: ${key} = ${value}`
        );
      });
    },
    []
  );

  const setSettingValue = useCallback((key: keyof Settings, value: number) => {
    setState((prev) =>
      withLog({ ...prev, settings: { ...prev.settings, [key]: value } }, `Setting ${key} = ${value}`)
    );
  }, []);

  const setPlanChannelValue = useCallback((index: number, key: keyof PlanChannel, value: number) => {
    setState((prev) => {
      const channels = prev.plan.channels.map((c, i) => (i === index ? { ...c, [key]: value } : c));
      const chName = prev.plan.channels[index]?.name || String(index);
      return withLog({ ...prev, plan: { ...prev.plan, channels } }, `Plan ${chName}: ${key} = ${value}`);
    });
  }, []);

  const setPlanTopValue = useCallback((key: keyof Omit<PlanModel, 'channels'>, value: number) => {
    setState((prev) => withLog({ ...prev, plan: { ...prev.plan, [key]: value } }, `Plan ${key} = ${value}`));
  }, []);

  const resetPlan = useCallback(() => {
    setState((prev) =>
      withLog({ ...prev, plan: JSON.parse(JSON.stringify(SEED_PLAN)) as PlanModel }, 'Plan reset')
    );
  }, []);

  const setExperimentThreshold = useCallback((index: number, key: 'scale' | 'stop', value: number) => {
    setState((prev) => {
      const list: ExperimentDef[] = prev.exps
        ? prev.exps.map((e) => ({ ...e }))
        : JSON.parse(JSON.stringify(SEED_EXPS));
      if (!list[index]) return prev;
      list[index][key] = value;
      return withLog({ ...prev, exps: list }, `Experiment ${list[index].id} ${key} = ${value}`);
    });
  }, []);

  const setAIConfig = useCallback((ai: AIConfig) => {
    setState((prev) => ({ ...prev, ai }));
  }, []);

  const importStateJson = useCallback((jsonText: string) => {
    const parsed = JSON.parse(jsonText) as Partial<AppState>;
    setState((prev) => withLog({ ...freshState(prev.ai), ...parsed }, 'Imported state'));
  }, []);

  const resetAllData = useCallback(() => {
    setState((prev) => freshState(prev.ai));
  }, []);

  const applyProposal = useCallback((p: PendingProposal): string => {
    let resultMsg = 'Unknown proposal';
    setState((prev) => {
      if (p.type === 'create_task') {
        const seq = prev.seq + 1;
        const t: TaskItem = {
          id: `T${seq}`,
          title: p.title || 'Untitled task',
          camp: p.campaign || '',
          owner: p.owner || 'Vishesh (Growth lead)',
          due: validDate(p.due) || addDays(prev.asOf, 7),
          status: 'todo',
          priority: (p.priority || 'medium') as TaskPriority,
          source: 'ai',
          created: prev.asOf,
        };
        resultMsg = `Created task ${t.id}: "${t.title}" (owner ${t.owner}, due ${t.due}).`;
        return withLog({ ...prev, seq, tasks: [...prev.tasks, t] }, `AI-proposed task created: "${t.title}" (${p.rationale})`);
      }
      if (p.type === 'update_task_status' && p.task_id && p.status) {
        resultMsg = `Task ${p.task_id} set to ${p.status}.`;
        return withLog(
          {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === p.task_id ? { ...t, status: p.status as TaskStatus } : t
            ),
          },
          `AI-proposed: task ${p.task_id} → ${p.status}`
        );
      }
      if (p.type === 'update_campaign' && p.campaign) {
        const v: Partial<Pick<CampaignConfig, 'status' | 'budget' | 'owner'>> = {};
        if (p.status) v.status = p.status as CampaignStatus;
        if (p.budget != null) v.budget = +p.budget;
        if (p.owner) v.owner = p.owner;
        resultMsg = `Updated ${p.campaign_name || p.campaign}: ${JSON.stringify(v)}.`;
        return withLog(
          {
            ...prev,
            campaigns: {
              ...prev.campaigns,
              [p.campaign]: { ...(prev.campaigns[p.campaign] || {}), ...v },
            },
          },
          `AI-proposed campaign update ${p.campaign_name || p.campaign}: ${JSON.stringify(v)}`
        );
      }
      return prev;
    });
    return resultMsg;
  }, []);

  return (
    <GrowthContext.Provider
      value={{
        state,
        snap,
        setAsOf,
        setTaskStatus,
        deleteTask,
        saveTask,
        saveCampaign,
        saveDailyOverride,
        deleteDailyRow,
        revertDailyRow,
        addManualEntry,
        deleteManualEntry,
        setTargetValue,
        setSettingValue,
        setPlanChannelValue,
        setPlanTopValue,
        resetPlan,
        setExperimentThreshold,
        setAIConfig,
        importStateJson,
        resetAllData,
        applyProposal,
      }}
    >
      {children}
    </GrowthContext.Provider>
  );
};

export function useGrowthStore() {
  const ctx = useContext(GrowthContext);
  if (!ctx) throw new Error('useGrowthStore must be used inside GrowthProvider');
  return ctx;
}
