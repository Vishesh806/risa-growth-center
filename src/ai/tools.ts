import { allCampaigns, resolveCamp } from '../engine/dataset';
import { validDate } from '../engine/format';
import { simulateReallocation, snapshot, weekly } from '../engine/snapshot';
import { alerts, experiments, personFunnel, planCalc, queryRecords, type QueryRecordsArgs } from '../engine/advanced';
import type { AppState, PendingProposal, TaskPriority } from '../engine/types';

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOLS: ToolSchema[] = [
  {
    name: 'query_records',
    description:
      'Flexible analytics over raw records for questions other tools do not cover. dataset: people (identified people, with person_type, touch, first-touch campaign, current registration status or not_registered) | registrations (status = latest as of date) | checkins (result, verification, source scanner/manual, hour, person_type; includes repeat admissions) | interactions (event_type: page_visit, brochure_download, registration_start, event_question_submitted, nurture_email_sent/opened/clicked, opted_out) | daily (anonymous campaign aggregates: impressions, clicks, reach, sessions, form_starts, spend). metric: count | distinct_people | sum (needs numeric field). group_by up to 2 of: campaign, date, week, status, event_type, result, verification, source, person_type, touch, hour. filters: campaign, date_from, date_to, status, event_type, result, verification, source, person_type, touch, hour, has_registration (bool), has_verified_visit (bool).',
    parameters: {
      type: 'object',
      properties: {
        dataset: { type: 'string', enum: ['people', 'registrations', 'checkins', 'interactions', 'daily'] },
        metric: { type: 'string', enum: ['count', 'distinct_people', 'sum'] },
        field: { type: 'string' },
        group_by: { type: 'array', items: { type: 'string' } },
        filters: {
          type: 'object',
          properties: {
            campaign: { type: 'string' },
            date_from: { type: 'string' },
            date_to: { type: 'string' },
            status: { type: 'string' },
            event_type: { type: 'string' },
            result: { type: 'string' },
            verification: { type: 'string' },
            source: { type: 'string' },
            person_type: { type: 'string' },
            touch: { type: 'string' },
            hour: { type: 'string' },
            has_registration: { type: 'boolean' },
            has_verified_visit: { type: 'boolean' },
          },
        },
        as_of: { type: 'string' },
      },
      required: ['dataset'],
    },
  },
  {
    name: 'person_funnel',
    description:
      'Identified-person funnel for one campaign or all: page visit, brochure, form start, registered, confirmed, verified visit; leakage (started form but not registered, brochure but not registered, confirmed but no-show); email open/click rates; correlation signals.',
    parameters: {
      type: 'object',
      properties: { campaign: { type: 'string' }, as_of: { type: 'string' } },
    },
  },
  {
    name: 'get_alerts',
    description:
      'Anomalies: last 7 days vs previous 3-week weekly average per campaign (registrations, cost per registration, cancellations, opt-outs, spend).',
    parameters: { type: 'object', properties: { as_of: { type: 'string' } } },
  },
  {
    name: 'get_experiments',
    description:
      'The 5 growth bets with decision metric, current value, scale/stop thresholds and verdict (SCALE/CHANGE/STOP/NO DATA), with calculation and assumptions.',
    parameters: { type: 'object', properties: { as_of: { type: 'string' } } },
  },
  {
    name: 'get_plan_model',
    description:
      'The 2026 Bengaluru target model (base/stretch funnel per channel, budget, capacity, evidence flags vs 2025). Optional what_if overrides are NOT saved: [{channel, field: leads|cpl|l2r|r2v|sLeads|sCpl|sL2r|sR2v, value}] or top-level fields budget, perDayCapacity, walkins.',
    parameters: {
      type: 'object',
      properties: {
        what_if: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channel: { type: 'string' },
              field: { type: 'string' },
              value: { type: 'number' },
            },
            required: ['field', 'value'],
          },
        },
      },
    },
  },
  {
    name: 'get_snapshot',
    description:
      'Full current dashboard state at an as-of date: totals, targets & pacing (actual vs goal, linear plan, run-rate projections), budget, and per-campaign metrics (spend, leads, registrations, latest statuses, visitors, conversion rates, cost per lead/registration/visitor, projected visitors, opt-outs, recommendation SCALE/FIX/CUT with reasons, bottleneck). Use first for almost any question. Includes user edits.',
    parameters: {
      type: 'object',
      properties: {
        as_of: {
          type: 'string',
          description: 'YYYY-MM-DD between 2025-01-15 and 2025-04-20. Omit for the dashboard date.',
        },
      },
    },
  },
  {
    name: 'get_campaign_detail',
    description:
      'One campaign: metrics, weekly trend (spend, impressions, clicks, sessions, leads, registrations, cancellations, visitors), related tasks and campaign settings.',
    parameters: {
      type: 'object',
      properties: {
        campaign: { type: 'string', description: 'Campaign id (C01..) or name' },
        as_of: { type: 'string' },
      },
      required: ['campaign'],
    },
  },
  {
    name: 'get_weekly_trend',
    description: 'Weekly time series for the whole portfolio or one campaign.',
    parameters: {
      type: 'object',
      properties: {
        campaign: { type: 'string', description: 'optional id or name' },
        as_of: { type: 'string' },
      },
    },
  },
  {
    name: 'compare_snapshots',
    description: 'Change in key metrics per campaign between two dates (what changed / what drove it).',
    parameters: {
      type: 'object',
      properties: { date_a: { type: 'string' }, date_b: { type: 'string' } },
      required: ['date_a', 'date_b'],
    },
  },
  {
    name: 'calculate',
    description:
      'Evaluate an arithmetic expression exactly (numbers, + - * / ( ) and %). Use for every derived number you state that is not directly in tool output.',
    parameters: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression'],
    },
  },
  {
    name: 'simulate_reallocation',
    description:
      'Estimate visitor impact of moving budget between campaigns (diminishing-returns model).',
    parameters: {
      type: 'object',
      properties: {
        moves: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              amount: { type: 'number' },
            },
            required: ['from', 'to', 'amount'],
          },
        },
        as_of: { type: 'string' },
      },
      required: ['moves'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Tasks/action items with owner, campaign, due date, status, overdue flag.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'todo|doing|done (optional)' },
        campaign: { type: 'string' },
      },
    },
  },
  {
    name: 'get_data_coverage',
    description:
      'What the dataset does and does NOT contain, definitions and caveats. Call when unsure whether data can answer.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'propose_action',
    description:
      'Propose a change for the user to confirm (nothing changes until they click Confirm). Types: create_task {title, campaign?, owner?, due?, priority?}; update_task_status {task_id, status}; update_campaign {campaign, status?: active|paused|stopped, budget?, owner?}.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['create_task', 'update_task_status', 'update_campaign'] },
        title: { type: 'string' },
        campaign: { type: 'string' },
        owner: { type: 'string' },
        due: { type: 'string' },
        priority: { type: 'string' },
        task_id: { type: 'string' },
        status: { type: 'string' },
        budget: { type: 'number' },
        rationale: { type: 'string', description: 'one-line data-backed reason' },
      },
      required: ['type', 'rationale'],
    },
  },
];

export function executeTool(
  name: string,
  args: Record<string, unknown> | undefined,
  state: AppState,
  onProposal: (proposal: PendingProposal) => void
): unknown {
  const a = args || {};
  const asOfArg = typeof a.as_of === 'string' ? a.as_of : undefined;
  const asOf = asOfArg ? validDate(asOfArg) : state.asOf;
  if (asOfArg && !asOf) {
    return { error: `as_of must be YYYY-MM-DD within 2025-01-15..2025-04-20 (data coverage). Got "${asOfArg}".` };
  }
  const safeAsOf = asOf || state.asOf;

  switch (name) {
    case 'query_records':
      return queryRecords(state, a as unknown as QueryRecordsArgs);
    case 'person_funnel':
      return personFunnel(state, typeof a.campaign === 'string' ? a.campaign : undefined, safeAsOf);
    case 'get_alerts':
      return alerts(state, safeAsOf);
    case 'get_experiments':
      return experiments(state, safeAsOf);
    case 'get_plan_model': {
      const p = JSON.parse(JSON.stringify(state.plan));
      const applied: unknown[] = [];
      const whatIf = Array.isArray(a.what_if) ? a.what_if : [];
      for (const w of whatIf as { channel?: string; field: string; value: number }[]) {
        if (!w.channel) {
          if (w.field in p) {
            p[w.field] = +w.value;
            applied.push(w);
          }
          continue;
        }
        const s = String(w.channel).toLowerCase();
        const ch = p.channels.find(
          (c: { name: string; ref: string }) =>
            c.name.toLowerCase().includes(s) ||
            c.ref.toLowerCase() === s ||
            (allCampaigns(state).find((x) => x.id === c.ref)?.name || '').toLowerCase().includes(s)
        );
        if (!ch || !(w.field in ch)) {
          return {
            error: `Unknown channel/field in ${JSON.stringify(w)}. Channels: ${p.channels.map((c: { name: string }) => c.name).join(', ')}`,
          };
        }
        ch[w.field] = +w.value;
        applied.push(w);
      }
      return { ...planCalc(state, p), what_if_applied: applied, saved: false };
    }
    case 'get_snapshot': {
      const s = snapshot(state, safeAsOf);
      return {
        ...s,
        notes:
          'reach_sum is a sum of daily platform reach and is NOT unique people. Visitors are distinct verified external admissions. Leads = identified external people by first-touch campaign.',
      };
    }
    case 'get_campaign_detail': {
      const c = resolveCamp(state, typeof a.campaign === 'string' ? a.campaign : '');
      if (!c) {
        return {
          error: `No campaign matches "${String(a.campaign)}". Available: ${allCampaigns(state)
            .map((x) => x.id + ' ' + x.name)
            .join(', ')}`,
        };
      }
      const s = snapshot(state, safeAsOf);
      return {
        as_of: safeAsOf,
        phase: s.phase,
        campaign_settings: {
          id: c.id,
          name: c.name,
          channel: c.channel,
          owner: c.owner,
          status: c.status,
          planned_budget: c.budget,
          audience: c.audience,
          objective: c.objective,
          notes: c.notes,
        },
        metrics: s.campaigns.find((x) => x.id === c.id),
        portfolio_totals: s.totals,
        weekly: c.isNew ? [] : weekly(state, c.id, safeAsOf),
        tasks: state.tasks.filter((t) => t.camp === c.id),
      };
    }
    case 'get_weekly_trend': {
      const campQuery = typeof a.campaign === 'string' ? a.campaign : undefined;
      const c = campQuery ? resolveCamp(state, campQuery) : null;
      if (campQuery && !c) return { error: 'Unknown campaign ' + campQuery };
      return { as_of: safeAsOf, campaign: c ? c.name : 'all', weeks: weekly(state, c ? c.id : null, safeAsOf) };
    }
    case 'compare_snapshots': {
      const A = validDate(typeof a.date_a === 'string' ? a.date_a : '');
      const B = validDate(typeof a.date_b === 'string' ? a.date_b : '');
      if (!A || !B) return { error: 'Dates must be YYYY-MM-DD within 2025-01-15..2025-04-20' };
      const sa = snapshot(state, A);
      const sb = snapshot(state, B);
      const fields = ['spend', 'leads', 'regs', 'confirmed', 'cancelled', 'optouts', 'visitors'] as const;
      return {
        date_a: A,
        date_b: B,
        totals: Object.fromEntries(
          fields.map((k) => [k, { a: sa.totals[k], b: sb.totals[k], change: sb.totals[k] - sa.totals[k] }])
        ),
        campaigns: sb.campaigns.map((c) => {
          const p = sa.campaigns.find((x) => x.id === c.id);
          return {
            name: c.name,
            ...Object.fromEntries(fields.map((k) => [k + '_change', (c[k] || 0) - (p?.[k] || 0)])),
            cost_per_reg_a: p?.cost_per_reg,
            cost_per_reg_b: c.cost_per_reg,
          };
        }),
      };
    }
    case 'calculate': {
      const ex = String(a.expression || '');
      if (!/^[\d\s+\-*/().,%eE]+$/.test(ex)) {
        return { error: 'Only numbers and + - * / ( ) % allowed' };
      }
      try {
        const sanitized = ex.replace(/,/g, '').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
        const v = Function('"use strict";return (' + sanitized + ')')() as number;
        return { expression: ex, result: Math.round(v * 1e6) / 1e6 };
      } catch {
        return { error: 'Invalid expression' };
      }
    }
    case 'simulate_reallocation':
      return simulateReallocation(
        state,
        (Array.isArray(a.moves) ? a.moves : []) as { from: string; to: string; amount: number }[],
        safeAsOf
      );
    case 'list_tasks': {
      let t = state.tasks;
      if (typeof a.status === 'string' && a.status) t = t.filter((x) => x.status === a.status);
      if (typeof a.campaign === 'string' && a.campaign) {
        const c = resolveCamp(state, a.campaign);
        t = t.filter((x) => c && x.camp === c.id);
      }
      const camps = allCampaigns(state);
      return {
        as_of: state.asOf,
        tasks: t.map((x) => ({
          ...x,
          campaign_name: camps.find((c) => c.id === x.camp)?.name || null,
          overdue: !!(x.due && x.due < state.asOf && x.status !== 'done'),
        })),
      };
    }
    case 'get_data_coverage':
      return {
        covered_period: '2025-01-15 to 2025-04-20 (event 12–13 Apr 2025, synthetic CampusFest 2025)',
        available: [
          'daily campaign ledger: impressions, clicks, platform reach (per day), landing sessions, form starts, net spend INR',
          'identified people with type (external/internal/staff/test), first-seen time, first-touch campaign',
          'identified interactions: page visits, brochure downloads, registration starts, questions, nurture emails sent/opened/clicked, opt-outs',
          'registrations and full status history (interested/confirmed/cancelled/waitlisted)',
          'check-ins: admitted/denied/pending, verified/unverified, scanner/manual',
          'targets (launch plan, revised plan from 2025-03-15) and approved budget',
          'user-entered tasks, campaign settings, manual entries',
        ],
        not_available: [
          'demographics (age, gender, college, year, city/area of people)',
          'college or club names behind College Partnerships',
          'ticket price, revenue, or on-site spend',
          'venue capacity',
          'creative-level or ad-set-level data',
          'deduplicated reach across days/campaigns',
          'causal incrementality / holdout tests',
          'satisfaction/NPS, dwell time, session-level attendance',
          'sponsor data (separate track)',
          'any data after 2025-04-20 or for other years',
        ],
        definitions: {
          lead: 'distinct identified external person, attributed to fixed first-touch campaign',
          registration: 'distinct external person with a registration (1 per person here)',
          visitor: 'distinct external person with an admitted + verified check-in; walk-ins have no campaign',
          spend: 'net posted ledger (debits − credits); can be negative on credit days',
        },
        assumptions_in_app: {
          pre_event_show_rate: state.settings.showRate,
          walkin_assumption: state.settings.walkins,
          campaign_budgets: 'planning allocation, not in source',
          diminishing_returns_factor: state.settings.diminishing,
        },
      };
    case 'propose_action': {
      const id = 'P' + Date.now().toString(36) + Math.floor(Math.random() * 99);
      const p: PendingProposal = {
        id,
        type: a.type as PendingProposal['type'],
        title: typeof a.title === 'string' ? a.title : undefined,
        campaign: typeof a.campaign === 'string' ? a.campaign : undefined,
        owner: typeof a.owner === 'string' ? a.owner : undefined,
        due: typeof a.due === 'string' ? a.due : undefined,
        priority: (typeof a.priority === 'string' ? a.priority : undefined) as TaskPriority | undefined,
        task_id: typeof a.task_id === 'string' ? a.task_id : undefined,
        status: typeof a.status === 'string' ? a.status : undefined,
        budget: typeof a.budget === 'number' ? a.budget : undefined,
        rationale: typeof a.rationale === 'string' ? a.rationale : '',
      };
      if (p.campaign) {
        const c = resolveCamp(state, p.campaign);
        if (!c) return { error: 'Unknown campaign ' + p.campaign };
        p.campaign = c.id;
        p.campaign_name = c.name;
      }
      if (p.type === 'update_task_status' && !state.tasks.find((t) => t.id === p.task_id)) {
        return { error: 'Unknown task_id ' + p.task_id };
      }
      if (p.type === 'create_task' && !p.title) {
        return { error: 'title required' };
      }
      onProposal(p);
      return {
        proposal_id: id,
        status: 'awaiting_user_confirmation',
        note: 'Shown to the user with Confirm/Reject buttons. Do not claim it is done.',
      };
    }
    default:
      return { error: 'Unknown tool ' + name };
  }
}
