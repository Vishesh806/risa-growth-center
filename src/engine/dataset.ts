import rawSeed from '../data/seed.json';
import type {
  AIConfig,
  AppState,
  CampaignConfig,
  DailyOverride,
  EventMeta,
  ExperimentDef,
  PlanModel,
  RawCampaign,
  Settings,
  TargetVersion,
  TaskItem,
} from './types';

interface SeedSchema {
  event: EventMeta;
  campaigns: RawCampaign[];
  targets: TargetVersion[];
  people: [string, number, string, number, string][];
  regs: [string, string, number, string][];
  hist: [string, string, string][];
  checkins: [string, string, string, number, string, string, string, string][];
  daily: [string, number, string, number, number, number, number, number, number][];
  inter: [number, string, string, number][];
  itypes: string[];
  interp: [string, number, string, number][];
  quality: {
    excluded: {
      non_external_people: number;
      non_external_registrations: number;
      checkins_denied: number;
      checkins_pending_unverified: number;
      admitted_verified_events: number;
      negative_spend_rows_vendor_credits: number;
    };
    [table: string]: { rows?: number; exact_duplicates_removed?: number } | Record<string, number>;
  };
}

export const RAW = rawSeed as unknown as SeedSchema;
export const BASE_CAMPS: RawCampaign[] = RAW.campaigns;
export const HIST_END = RAW.event.historyEnd;
export const HIST_START = RAW.event.historyStart;
export const EVENT_D1 = '2025-04-12';
export const EVENT_D2 = '2025-04-13';

export interface PersonRecord {
  id: string;
  type: number;
  first: string;
  camp: number;
  touch: string;
}

export interface RegRecord {
  id: string;
  pid: string;
  camp: number;
  at: string;
}

export interface CheckinRecord {
  id: string;
  pid: string;
  reg: string;
  camp: number;
  at: string;
  result: string;
  ver: string;
  src: string;
}

export interface DailyRecord {
  id: string;
  camp: number;
  date: string;
  impr: number;
  clicks: number;
  reach: number;
  sess: number;
  starts: number;
  spend: number;
}

export interface InterAggRecord {
  camp: number;
  date: string;
  type: string;
  n: number;
}

export interface InterPersonRecord {
  pid: string;
  camp: number;
  at: string;
  type: string;
}

export const PEOPLE: PersonRecord[] = RAW.people.map((p) => ({
  id: p[0],
  type: p[1],
  first: p[2],
  camp: p[3],
  touch: p[4],
}));

export const EXT = new Set(PEOPLE.filter((p) => p.type === 0).map((p) => p.id));

export const REGS: RegRecord[] = RAW.regs
  .map((r) => ({ id: r[0], pid: r[1], camp: r[2], at: r[3] }))
  .filter((r) => EXT.has(r.pid));

export const HIST: Record<string, { at: string; s: string }[]> = {};
RAW.hist.forEach((h) => {
  (HIST[h[0]] = HIST[h[0]] || []).push({ at: h[1], s: h[2] });
});
Object.values(HIST).forEach((a) => a.sort((x, y) => (x.at < y.at ? -1 : 1)));

export const CHK: CheckinRecord[] = RAW.checkins.map((c) => ({
  id: c[0],
  pid: c[1],
  reg: c[2],
  camp: c[3],
  at: c[4],
  result: c[5],
  ver: c[6],
  src: c[7],
}));

export const SRC_DAILY: DailyRecord[] = RAW.daily.map((d) => ({
  id: d[0],
  camp: d[1],
  date: d[2],
  impr: d[3],
  clicks: d[4],
  reach: d[5],
  sess: d[6],
  starts: d[7],
  spend: d[8],
}));

export const INTER: InterAggRecord[] = RAW.inter.map((i) => ({
  camp: i[0],
  date: i[1],
  type: i[2],
  n: i[3],
}));

export const ITYPES = RAW.itypes;
export const INTERP: InterPersonRecord[] = RAW.interp.map((r) => ({
  pid: r[0],
  camp: r[1],
  at: r[2],
  type: ITYPES[r[3]],
}));

export const PTYPE_NAMES = ['external', 'internal', 'staff', 'test'] as const;
export const PERSON: Record<string, PersonRecord> = {};
PEOPLE.forEach((p) => {
  PERSON[p.id] = p;
});

export const SEED_BUDGET: Record<string, number> = {
  C01: 46000,
  C02: 102000,
  C03: 65000,
  C04: 34000,
  C05: 21000,
  C06: 15000,
  C07: 17000,
};

export const DEFAULT_SETTINGS: Settings = {
  showRate: 0.77,
  walkins: 100,
  scaleCPV: 0.8,
  cutCPV: 2.0,
  optoutCut: 0.08,
  minRegToVisit: 0.65,
  diminishing: 1.25,
  partnerColleges: 10,
  ambassadors: 40,
};

export const OWNERS = [
  'Meera Iyer',
  'Arjun Verma',
  'Nisha Rao',
  'Dev Malhotra',
  'Vishesh (Growth lead)',
];

const SEED_TASKS: Omit<TaskItem, 'id' | 'created' | 'source'>[] = [
  {
    title: 'Cap Paid Social to retargeting audiences only; pause cold prospecting ad sets',
    camp: 'C02',
    owner: 'Arjun Verma',
    due: '2025-03-20',
    status: 'todo',
    priority: 'high',
  },
  {
    title: 'Sign 5 more college clubs for group-registration codes',
    camp: 'C04',
    owner: 'Meera Iyer',
    due: '2025-03-25',
    status: 'doing',
    priority: 'high',
  },
  {
    title: 'Launch "bring 3 friends" referral reward (group pass)',
    camp: 'C05',
    owner: 'Dev Malhotra',
    due: '2025-03-18',
    status: 'todo',
    priority: 'high',
  },
  {
    title: 'WhatsApp reminder + QR ticket to all confirmed registrants (T-7, T-1)',
    camp: '',
    owner: 'Vishesh (Growth lead)',
    due: '2025-04-05',
    status: 'todo',
    priority: 'high',
  },
  {
    title: 'Renegotiate creator deliverables to cost-per-registration',
    camp: 'C03',
    owner: 'Nisha Rao',
    due: '2025-03-22',
    status: 'todo',
    priority: 'medium',
  },
  {
    title: 'Reduce email frequency for Community Groups (opt-out guardrail)',
    camp: 'C07',
    owner: 'Nisha Rao',
    due: '2025-03-28',
    status: 'done',
    priority: 'low',
  },
];

export const SEED_PLAN: PlanModel = {
  budget: 300000,
  baseline2025: 2050,
  perDayCapacity: 3000,
  day1Share: 0.7,
  daysPerVisitor: 1.35,
  showupSpend: 14000,
  showupSpendStretch: 20000,
  walkins: 150,
  walkinsStretch: 250,
  channels: [
    { name: 'College club partnerships', ref: 'C04', leads: 1000, cpl: 65, l2r: 0.88, r2v: 0.82, sLeads: 1400, sCpl: 68, sL2r: 0.88, sR2v: 0.86 },
    { name: 'Campus ambassadors', ref: 'C01', leads: 900, cpl: 75, l2r: 0.85, r2v: 0.72, sLeads: 1100, sCpl: 78, sL2r: 0.85, sR2v: 0.8 },
    { name: 'Referral "squad pass"', ref: 'C05', leads: 750, cpl: 55, l2r: 0.84, r2v: 0.76, sLeads: 1100, sCpl: 55, sL2r: 0.84, sR2v: 0.84 },
    { name: 'Organic search', ref: 'C06', leads: 380, cpl: 50, l2r: 0.86, r2v: 0.78, sLeads: 450, sCpl: 50, sL2r: 0.86, sR2v: 0.84 },
    { name: 'Community groups', ref: 'C07', leads: 330, cpl: 65, l2r: 0.8, r2v: 0.8, sLeads: 400, sCpl: 65, sL2r: 0.8, sR2v: 0.86 },
    { name: 'Paid social (retargeting)', ref: 'C02', leads: 450, cpl: 97, l2r: 0.7, r2v: 0.5, sLeads: 450, sCpl: 97, sL2r: 0.7, sR2v: 0.6 },
    { name: 'Creators (pay per reg.)', ref: 'C03', leads: 200, cpl: 120, l2r: 0.71, r2v: 0.5, sLeads: 200, sCpl: 120, sL2r: 0.71, sR2v: 0.6 },
  ],
};

export const SEED_EXPS: ExperimentDef[] = [
  { id: 'E1', name: 'College Club Partnerships 2.0', camps: ['C04'], metric: 'leads_per_college', label: 'Leads per partner college', higher: true, scale: 40, stop: 20, unit: 'leads' },
  { id: 'E2', name: 'Referral "Squad Pass"', camps: ['C05'], metric: 'referral_leads_per_registrant', label: 'Referral leads per registrant (proxy for invites)', higher: true, scale: 0.2, stop: 0.1, unit: 'ratio', proxy: true },
  { id: 'E3', name: 'Show-up engine', camps: [], metric: 'confirmed_to_visit', label: 'Confirmed → verified visit', higher: true, scale: 0.8, stop: 0.7, unit: 'pct' },
  { id: 'E4', name: 'Paid Social + Creators restructure', camps: ['C02', 'C03'], metric: 'cpv_vs_blended', label: 'Cost/visitor ÷ blended (lower is better)', higher: false, scale: 1.0, stop: 2.0, unit: 'x' },
  { id: 'E5', name: 'Ambassadors paid per verified check-in', camps: ['C01'], metric: 'regs_per_ambassador', label: 'Registrations per ambassador', higher: true, scale: 15, stop: 8, unit: 'regs' },
];

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  key: '',
  model: 'gemini-3.5-flash-lite',
  baseUrl: '',
};

export function freshState(aiOverride?: Partial<AIConfig>): AppState {
  return {
    campaigns: {},
    newCampaigns: [],
    dailyOverrides: {},
    dailyDeleted: [],
    manual: [],
    targets: null,
    settings: { ...DEFAULT_SETTINGS },
    tasks: SEED_TASKS.map((t, i) => ({ id: 'T' + (i + 1), created: 'seed', source: 'seed', ...t })),
    log: [],
    asOf: HIST_END,
    ai: { ...DEFAULT_AI_CONFIG, ...(aiOverride || {}) },
    seq: 100,
    plan: JSON.parse(JSON.stringify(SEED_PLAN)) as PlanModel,
    exps: null,
  };
}

export function allCampaigns(state: AppState): CampaignConfig[] {
  const base: CampaignConfig[] = BASE_CAMPS.map((c, i) => ({
    ...c,
    idx: i,
    budget: SEED_BUDGET[c.id] || 0,
    status: 'active',
    notes: '',
    isNew: false,
    ...(state.campaigns[c.id] || {}),
  }));
  const extra: CampaignConfig[] = state.newCampaigns.map((c) => ({
    ...c,
    idx: -1,
    isNew: true,
    ...(state.campaigns[c.id] || {}),
  }));
  return base.concat(extra);
}

export function campById(state: AppState, id: string): CampaignConfig | undefined {
  return allCampaigns(state).find((c) => c.id === id);
}

export function resolveCamp(state: AppState, q: string | undefined | null): CampaignConfig | null {
  if (!q) return null;
  const s = String(q).toLowerCase().trim();
  const camps = allCampaigns(state);
  return (
    camps.find((c) => c.id.toLowerCase() === s || c.name.toLowerCase() === s) ||
    camps.find((c) => c.name.toLowerCase().includes(s) || c.channel.toLowerCase().includes(s)) ||
    null
  );
}

export interface MergedDailyRow extends DailyRecord {
  campId: string;
  source: 'source';
  edited: boolean;
}

export function dailyRows(state: AppState): MergedDailyRow[] {
  const del = new Set(state.dailyDeleted);
  return SRC_DAILY.filter((d) => !del.has(d.id)).map((d) => {
    const ov: Partial<DailyOverride> | undefined = state.dailyOverrides[d.id];
    return {
      ...d,
      campId: BASE_CAMPS[d.camp].id,
      source: 'source',
      ...(ov || {}),
      edited: !!ov,
    };
  });
}

export function targetAt(state: AppState, asOf: string): TargetVersion {
  const T = state.targets || RAW.targets;
  const e = asOf + 'T23:59';
  return (
    [...T].filter((t) => t.effective <= e).sort((a, b) => (a.effective < b.effective ? 1 : -1))[0] ||
    T[0]
  );
}

export function regStatusAt(regId: string, endTs: string): string | null {
  const h = HIST[regId];
  if (!h) return null;
  let s: string | null = null;
  for (const v of h) {
    if (v.at <= endTs) s = v.s;
    else break;
  }
  return s;
}

export const campName = (i: number): string =>
  i >= 0 && BASE_CAMPS[i] ? BASE_CAMPS[i].name : '(unattributed)';
