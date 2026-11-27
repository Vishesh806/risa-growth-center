export type CampaignStatus = 'active' | 'paused' | 'stopped';
export type Recommendation = 'SCALE' | 'FIX' | 'CUT' | 'STOPPED' | 'PAUSED';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type Phase = 'pre-event' | 'event days' | 'post-event';
export type AIProvider = 'gemini' | 'openai';

export interface EventMeta {
  name: string;
  start: string;
  end: string;
  historyStart: string;
  historyEnd: string;
}

export interface RawCampaign {
  id: string;
  name: string;
  channel: string;
  audience: string;
  objective: string;
  owner: string;
  start: string;
  end: string;
}

export interface CampaignConfig extends RawCampaign {
  idx: number;
  budget: number;
  status: CampaignStatus;
  notes: string;
  isNew: boolean;
}

export interface TargetVersion {
  effective: string;
  leads: number;
  regs: number;
  visitors: number;
  budget: number;
  version: string;
}

export interface Settings {
  showRate: number;
  walkins: number;
  scaleCPV: number;
  cutCPV: number;
  optoutCut: number;
  minRegToVisit: number;
  diminishing: number;
  partnerColleges: number;
  ambassadors: number;
}

export interface TaskItem {
  id: string;
  title: string;
  camp: string;
  owner: string;
  due: string;
  status: TaskStatus;
  priority: TaskPriority;
  created: string;
  source: 'seed' | 'manual' | 'ai';
}

export interface DailyOverride {
  impr: number;
  clicks: number;
  sess: number;
  starts: number;
  spend: number;
}

export interface ManualEntry {
  id: string;
  date: string;
  camp: string;
  note: string;
  spend: number;
  impr: number;
  clicks: number;
  sessions?: number;
  form_starts?: number;
  leads: number;
  regs: number;
  confirmed: number;
  cancelled: number;
  visitors: number;
}

export interface PlanChannel {
  name: string;
  ref: string;
  leads: number;
  cpl: number;
  l2r: number;
  r2v: number;
  sLeads: number;
  sCpl: number;
  sL2r: number;
  sR2v: number;
}

export interface PlanModel {
  budget: number;
  baseline2025: number;
  perDayCapacity: number;
  day1Share: number;
  daysPerVisitor: number;
  showupSpend: number;
  showupSpendStretch: number;
  walkins: number;
  walkinsStretch: number;
  channels: PlanChannel[];
}

export interface ExperimentDef {
  id: string;
  name: string;
  camps: string[];
  metric:
    | 'leads_per_college'
    | 'referral_leads_per_registrant'
    | 'confirmed_to_visit'
    | 'cpv_vs_blended'
    | 'regs_per_ambassador';
  label: string;
  higher: boolean;
  scale: number;
  stop: number;
  unit: 'leads' | 'ratio' | 'pct' | 'x' | 'regs';
  proxy?: boolean;
}

export interface AIConfig {
  provider: AIProvider;
  key: string;
  model: string;
  baseUrl: string;
}

export interface LogEntry {
  at: string;
  msg: string;
}

export interface AppState {
  campaigns: Record<string, Partial<Pick<CampaignConfig, 'owner' | 'budget' | 'status' | 'notes'>>>;
  newCampaigns: CampaignConfig[];
  dailyOverrides: Record<string, DailyOverride>;
  dailyDeleted: string[];
  manual: ManualEntry[];
  targets: TargetVersion[] | null;
  settings: Settings;
  tasks: TaskItem[];
  log: LogEntry[];
  asOf: string;
  ai: AIConfig;
  seq: number;
  plan: PlanModel;
  exps: ExperimentDef[] | null;
}

export interface Bottleneck {
  stage: string;
  campaign_value: number | null;
  portfolio_value: number | null;
  relative_gap: number | null;
}

export interface CampaignMetrics {
  id: string;
  name: string;
  channel: string;
  owner: string;
  status: CampaignStatus;
  budget: number;
  isNew: boolean;
  spend: number;
  impr: number;
  clicks: number;
  reach_sum: number;
  sessions: number;
  form_starts: number;
  leads: number;
  regs: number;
  confirmed: number;
  cancelled: number;
  waitlisted: number;
  interested: number;
  optouts: number;
  visitors: number;
  manual_entries: number;
  ctr: number | null;
  session_to_start: number | null;
  lead_to_reg: number | null;
  cancel_rate: number | null;
  optout_rate: number | null;
  reg_to_visit: number | null;
  confirmed_to_visit: number | null;
  cpl: number | null;
  cost_per_reg: number | null;
  cost_per_visitor: number | null;
  projected_visitors: number;
  projected_cost_per_visitor: number | null;
  budget_used: number | null;
  recommendation: Recommendation;
  reasons: string[];
  bottleneck: Bottleneck | null;
}

export interface SnapshotTotals {
  spend: number;
  impr: number;
  clicks: number;
  sessions: number;
  form_starts: number;
  leads: number;
  regs: number;
  confirmed: number;
  cancelled: number;
  waitlisted: number;
  interested: number;
  optouts: number;
  visitors: number;
  budget: number;
  projected_visitors: number;
  walkin_visitors: number;
  verified_external_visitors: number;
  visitor_days: number;
  avg_days_per_visitor: number | null;
  projected_total_visitors: number;
  blended_cpv: number | null;
  lead_to_reg: number | null;
  reg_to_visit: number | null;
  confirmed_to_visit: number | null;
  cpl: number | null;
  cost_per_reg: number | null;
  ctr: number | null;
}

export interface PacingSummary {
  target_version: string;
  target_effective: string;
  elapsed_fraction_of_registration_window: number | null;
  days_left_to_registration_close: number;
  leads: {
    actual: number;
    goal: number;
    pct_of_goal: number | null;
    expected_by_now_linear: number;
  };
  registrations: {
    actual: number;
    goal: number;
    pct_of_goal: number | null;
    expected_by_now_linear: number;
    projected_at_close_14d_run_rate: number;
  };
  visitors: {
    actual: number;
    goal: number;
    pct_of_goal: number | null;
    projected: number;
    projected_pct_of_goal: number | null;
  };
  budget: {
    spent: number;
    approved: number;
    pct_used: number | null;
    projected_spend_14d_run_rate: number;
    remaining: number;
  };
}

export interface Snapshot {
  as_of: string;
  phase: Phase;
  campaigns: CampaignMetrics[];
  totals: SnapshotTotals;
  pacing: PacingSummary;
  settings: Settings;
}

export interface WeeklyPoint {
  week_start: string;
  spend: number;
  impressions: number;
  clicks: number;
  sessions: number;
  leads: number;
  registrations: number;
  cancellations: number;
  visitors: number;
}

export interface ReallocationMoveInput {
  from: string;
  to: string;
  amount: number;
}

export interface ReallocationMoveResult {
  from?: string;
  to?: string;
  amount_inr?: number;
  from_cost_per_visitor?: number;
  to_cost_per_visitor?: number;
  visitors_lost_est?: number;
  visitors_gained_est?: number;
  net?: number;
  error?: string;
}

export interface ReallocationResult {
  moves: ReallocationMoveResult[];
  net_visitor_change_est: number;
  assumption: string;
  basis: string;
}

export interface AlertItem {
  campaign: string;
  metric: string;
  last_7d: number | null;
  prior_3wk_weekly_avg: number | null;
  change: number | null;
  direction: 'up' | 'down';
  severity: 'high' | 'medium' | 'info';
}

export interface AlertsResult {
  as_of: string;
  window: string;
  alerts: AlertItem[];
  note: string;
}

export interface ExperimentEval extends ExperimentDef {
  value: number | null;
  verdict: 'SCALE' | 'CHANGE' | 'STOP' | 'NO DATA';
  calculation: string;
  guardrail: string | null;
}

export interface ExperimentsResult {
  as_of: string;
  phase: Phase;
  experiments: ExperimentEval[];
  note: string;
}

export interface PlanChannelResult extends PlanChannel {
  base: { regs: number; vis: number; spend: number; cpv: number | null };
  stretch: { regs: number; vis: number; spend: number; cpv: number | null };
  actual2025: {
    leads?: number;
    cpl: number | null;
    lead_to_reg: number | null;
    reg_to_visit: number | null;
    visitors?: number;
  };
  incremental_vs_2025: { base: number; stretch: number };
  evidence_flags: string[];
}

export interface PlanTotalsBucket {
  leads: number;
  regs: number;
  vis: number;
  spend: number;
  cpv: number | null;
  growth_vs_2025: number | null;
  peak_day: number;
  within_budget: boolean;
  budget_gap: number;
  within_capacity: boolean;
}

export interface PlanResult {
  channels: PlanChannelResult[];
  totals: { base: PlanTotalsBucket; stretch: PlanTotalsBucket };
  two_day_unique_ceiling: number;
  settings: {
    budget: number;
    perDayCapacity: number;
    day1Share: number;
    daysPerVisitor: number;
    walkins: number;
    walkinsStretch: number;
  };
  warnings: string[];
  method: string;
}

export interface PendingProposal {
  id: string;
  type: 'create_task' | 'update_task_status' | 'update_campaign';
  title?: string;
  campaign?: string;
  campaign_name?: string;
  owner?: string;
  due?: string;
  priority?: TaskPriority;
  task_id?: string;
  status?: string;
  budget?: number;
  rationale: string;
  resolution?: 'confirmed' | 'rejected';
  resolutionMessage?: string;
}

export interface ToolTraceItem {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  traces?: ToolTraceItem[];
  proposalIds?: string[];
  isError?: boolean;
}
