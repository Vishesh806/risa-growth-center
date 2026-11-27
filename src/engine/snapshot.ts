import {
  allCampaigns,
  BASE_CAMPS,
  CHK,
  dailyRows,
  EVENT_D1,
  EVENT_D2,
  EXT,
  HIST,
  INTER,
  PEOPLE,
  REGS,
  regStatusAt,
  resolveCamp,
  targetAt,
} from './dataset';
import { addDays, daysBetween, div, inr, pct, r2, r4, weekKey } from './format';
import type {
  AppState,
  Bottleneck,
  CampaignMetrics,
  Phase,
  ReallocationMoveInput,
  ReallocationMoveResult,
  ReallocationResult,
  Recommendation,
  Snapshot,
  SnapshotTotals,
  WeeklyPoint,
} from './types';

export function snapshot(state: AppState, asOfOverride?: string): Snapshot {
  const asOf = asOfOverride || state.asOf;
  const E = asOf + 'T23:59';
  const set = state.settings;
  const camps = allCampaigns(state);
  const byId: Record<string, CampaignMetrics> = {};

  camps.forEach((c) => {
    byId[c.id] = {
      id: c.id,
      name: c.name,
      channel: c.channel,
      owner: c.owner,
      status: c.status,
      budget: +c.budget || 0,
      isNew: c.isNew,
      spend: 0,
      impr: 0,
      clicks: 0,
      reach_sum: 0,
      sessions: 0,
      form_starts: 0,
      leads: 0,
      regs: 0,
      confirmed: 0,
      cancelled: 0,
      waitlisted: 0,
      interested: 0,
      optouts: 0,
      visitors: 0,
      manual_entries: 0,
      ctr: null,
      session_to_start: null,
      lead_to_reg: null,
      cancel_rate: null,
      optout_rate: null,
      reg_to_visit: null,
      confirmed_to_visit: null,
      cpl: null,
      cost_per_reg: null,
      cost_per_visitor: null,
      projected_visitors: 0,
      projected_cost_per_visitor: null,
      budget_used: null,
      recommendation: 'FIX',
      reasons: [],
      bottleneck: null,
    };
  });

  const idOfIdx = (i: number) => (BASE_CAMPS[i] ? BASE_CAMPS[i].id : null);

  for (const d of dailyRows(state)) {
    if (d.date > asOf) continue;
    const c = byId[d.campId];
    if (!c) continue;
    c.spend += +d.spend || 0;
    c.impr += +d.impr || 0;
    c.clicks += +d.clicks || 0;
    c.reach_sum += +d.reach || 0;
    c.sessions += +d.sess || 0;
    c.form_starts += +d.starts || 0;
  }

  for (const p of PEOPLE) {
    if (p.type !== 0 || p.camp < 0 || p.first > E) continue;
    const cid = idOfIdx(p.camp);
    if (cid && byId[cid]) byId[cid].leads++;
  }

  for (const r of REGS) {
    if (r.at > E) continue;
    const cid = idOfIdx(r.camp);
    if (!cid || !byId[cid]) continue;
    const c = byId[cid];
    c.regs++;
    const s = (regStatusAt(r.id, E) || 'interested') as
      | 'confirmed'
      | 'cancelled'
      | 'waitlisted'
      | 'interested';
    c[s]++;
  }

  for (const i of INTER) {
    if (i.type === 'opted_out' && i.date <= asOf) {
      const cid = idOfIdx(i.camp);
      if (cid && byId[cid]) byId[cid].optouts += i.n;
    }
  }

  const visitorCamp = new Map<string, number>();
  for (const k of CHK) {
    if (k.at > E || k.result !== 'admitted' || k.ver !== 'verified' || !EXT.has(k.pid)) continue;
    if (!visitorCamp.has(k.pid)) visitorCamp.set(k.pid, k.camp);
  }

  let walkins = 0;
  visitorCamp.forEach((ci) => {
    if (ci < 0) walkins++;
    else {
      const cid = idOfIdx(ci);
      if (cid && byId[cid]) byId[cid].visitors++;
    }
  });

  const personDays = new Set<string>();
  CHK.forEach((k) => {
    if (k.at <= E && k.result === 'admitted' && k.ver === 'verified' && EXT.has(k.pid)) {
      personDays.add(k.pid + '|' + k.at.slice(0, 10));
    }
  });

  for (const m of state.manual) {
    if (m.date > asOf) continue;
    const c = byId[m.camp];
    if (!c) continue;
    c.manual_entries++;
    c.spend += +m.spend || 0;
    c.impr += +m.impr || 0;
    c.clicks += +m.clicks || 0;
    c.sessions += +(m.sessions || 0);
    c.form_starts += +(m.form_starts || 0);
    c.leads += +m.leads || 0;
    c.regs += +m.regs || 0;
    c.confirmed += +m.confirmed || 0;
    c.cancelled += +m.cancelled || 0;
    c.visitors += +m.visitors || 0;
  }

  const phase: Phase =
    asOf < EVENT_D1 ? 'pre-event' : asOf <= EVENT_D2 ? 'event days' : 'post-event';
  const list = camps.map((c) => byId[c.id]);

  for (const c of list) {
    c.ctr = r4(div(c.clicks, c.impr));
    c.session_to_start = r4(div(c.form_starts, c.sessions));
    c.lead_to_reg = r4(div(c.regs, c.leads));
    c.cancel_rate = r4(div(c.cancelled, c.regs));
    c.optout_rate = r4(div(c.optouts, c.leads));
    c.reg_to_visit = phase === 'pre-event' ? null : r4(div(c.visitors, c.regs));
    c.confirmed_to_visit = phase === 'pre-event' ? null : r4(div(c.visitors, c.confirmed));
    c.cpl = r2(div(c.spend, c.leads));
    c.cost_per_reg = r2(div(c.spend, c.regs));
    c.cost_per_visitor = r2(div(c.spend, c.visitors));
    c.projected_visitors =
      phase === 'post-event'
        ? c.visitors
        : Math.round(Math.max(c.visitors, c.confirmed * set.showRate));
    c.projected_cost_per_visitor = r2(div(c.spend, c.projected_visitors));
    c.budget_used = r4(div(c.spend, c.budget));
  }

  const sumField = (
    f:
      | 'spend'
      | 'impr'
      | 'clicks'
      | 'sessions'
      | 'form_starts'
      | 'leads'
      | 'regs'
      | 'confirmed'
      | 'cancelled'
      | 'waitlisted'
      | 'interested'
      | 'optouts'
      | 'visitors'
      | 'budget'
      | 'projected_visitors'
  ) => list.reduce((a, c) => a + (+c[f] || 0), 0);

  const manualVisitors = state.manual
    .filter((m) => m.date <= asOf)
    .reduce((a, m) => a + (+m.visitors || 0), 0);

  const totals: SnapshotTotals = {
    spend: sumField('spend'),
    impr: sumField('impr'),
    clicks: sumField('clicks'),
    sessions: sumField('sessions'),
    form_starts: sumField('form_starts'),
    leads: sumField('leads'),
    regs: sumField('regs'),
    confirmed: sumField('confirmed'),
    cancelled: sumField('cancelled'),
    waitlisted: sumField('waitlisted'),
    interested: sumField('interested'),
    optouts: sumField('optouts'),
    visitors: sumField('visitors'),
    budget: sumField('budget'),
    projected_visitors: sumField('projected_visitors'),
    walkin_visitors: walkins,
    verified_external_visitors: visitorCamp.size + manualVisitors,
    visitor_days: personDays.size,
    avg_days_per_visitor: r2(div(personDays.size, visitorCamp.size)),
    projected_total_visitors: 0,
    blended_cpv: null,
    lead_to_reg: null,
    reg_to_visit: null,
    confirmed_to_visit: null,
    cpl: null,
    cost_per_reg: null,
    ctr: null,
  };

  totals.projected_total_visitors =
    phase === 'post-event'
      ? totals.verified_external_visitors
      : Math.round(
          totals.projected_visitors +
            (phase === 'pre-event' ? set.walkins : Math.max(walkins, set.walkins))
        );
  totals.blended_cpv = r2(
    div(totals.spend, phase === 'post-event' ? totals.visitors : totals.projected_visitors)
  );
  totals.lead_to_reg = r4(div(totals.regs, totals.leads));
  totals.reg_to_visit = phase === 'pre-event' ? null : r4(div(totals.visitors, totals.regs));
  totals.confirmed_to_visit =
    phase === 'pre-event' ? null : r4(div(totals.visitors, totals.confirmed));
  totals.cpl = r2(div(totals.spend, totals.leads));
  totals.cost_per_reg = r2(div(totals.spend, totals.regs));
  totals.ctr = r4(div(totals.clicks, totals.impr));

  const tgt = targetAt(state, asOf);
  const start = '2025-01-15';
  const regEnd = '2025-04-11';
  const frac = Math.min(1, Math.max(0, daysBetween(start, asOf) / daysBetween(start, regEnd)));

  const last14 = (f: 'regs' | 'spend') => {
    const from = addDays(asOf, -13);
    let n = 0;
    if (f === 'regs') {
      REGS.forEach((r) => {
        const d = r.at.slice(0, 10);
        if (d >= from && d <= asOf) n++;
      });
    } else {
      dailyRows(state).forEach((d) => {
        if (d.date >= from && d.date <= asOf) n += +d.spend || 0;
      });
    }
    return n / 14;
  };

  const daysLeft = Math.max(0, daysBetween(asOf, regEnd));
  const projRegs = Math.round(totals.regs + last14('regs') * daysLeft);
  const projSpend = Math.round(
    totals.spend + last14('spend') * Math.max(0, daysBetween(asOf, EVENT_D2))
  );

  const pacing = {
    target_version: tgt.version,
    target_effective: tgt.effective,
    elapsed_fraction_of_registration_window: r4(frac),
    days_left_to_registration_close: daysLeft,
    leads: {
      actual: totals.leads,
      goal: tgt.leads,
      pct_of_goal: r4(totals.leads / tgt.leads),
      expected_by_now_linear: Math.round(tgt.leads * frac),
    },
    registrations: {
      actual: totals.regs,
      goal: tgt.regs,
      pct_of_goal: r4(totals.regs / tgt.regs),
      expected_by_now_linear: Math.round(tgt.regs * frac),
      projected_at_close_14d_run_rate: projRegs,
    },
    visitors: {
      actual: totals.verified_external_visitors,
      goal: tgt.visitors,
      pct_of_goal: r4(totals.verified_external_visitors / tgt.visitors),
      projected: totals.projected_total_visitors,
      projected_pct_of_goal: r4(totals.projected_total_visitors / tgt.visitors),
    },
    budget: {
      spent: totals.spend,
      approved: tgt.budget,
      pct_used: r4(totals.spend / tgt.budget),
      projected_spend_14d_run_rate: projSpend,
      remaining: tgt.budget - totals.spend,
    },
  };

  const B = totals.blended_cpv;
  const avg = {
    ctr: totals.ctr,
    lead_to_reg: totals.lead_to_reg,
    reg_to_visit: totals.reg_to_visit,
    cancel_rate: div(totals.cancelled, totals.regs),
    optout_rate: div(totals.optouts, totals.leads),
  };

  for (const c of list) {
    const cpv = phase === 'post-event' ? c.cost_per_visitor : c.projected_cost_per_visitor;
    const rv = phase === 'pre-event' ? (c.confirmed ? set.showRate : null) : c.reg_to_visit;
    const reasons: string[] = [];
    let rec: Recommendation;

    if (c.status === 'stopped') rec = 'STOPPED';
    else if (c.status === 'paused') rec = 'PAUSED';
    else if (!c.regs && !c.leads) {
      rec = 'FIX';
      reasons.push('No outcome data yet');
    } else if (cpv != null && B && cpv >= set.cutCPV * B) {
      rec = 'CUT';
      reasons.push(`Cost/visitor ${inr(cpv)} ≥ ${set.cutCPV}× blended ${inr(B)}`);
    } else if (c.optout_rate != null && c.optout_rate >= set.optoutCut) {
      rec = 'CUT';
      reasons.push(`Opt-out rate ${pct(c.optout_rate)} ≥ ${pct(set.optoutCut)}`);
    } else if (
      cpv != null &&
      B &&
      cpv <= set.scaleCPV * B &&
      (rv == null || rv >= set.minRegToVisit)
    ) {
      rec = 'SCALE';
      reasons.push(`Cost/visitor ${inr(cpv)} ≤ ${set.scaleCPV}× blended ${inr(B)}`);
    } else {
      rec = 'FIX';
      reasons.push(`Cost/visitor ${inr(cpv)} vs blended ${inr(B)}`);
    }

    const stages: [string, number | null, number | null, number][] = [
      ['CTR (click/impression)', c.ctr, avg.ctr, 1],
      ['lead→registration', c.lead_to_reg, avg.lead_to_reg, 1],
      ['registration→visit (show-up)', c.reg_to_visit, avg.reg_to_visit, 1],
      ['cancellation rate', c.cancel_rate, avg.cancel_rate, -1],
      ['opt-out rate', c.optout_rate, avg.optout_rate, -1],
    ];

    let worst: { stage: string; value: number; portfolio: number; gap: number } | null = null;
    for (const [n, v, a, dir] of stages) {
      if (v == null || !a) continue;
      const gap = dir > 0 ? (v - a) / a : (a - v) / a;
      if (worst == null || gap < worst.gap) worst = { stage: n, value: v, portfolio: a, gap };
    }

    c.recommendation = rec;
    c.reasons = reasons;
    c.bottleneck =
      worst && worst.gap < -0.05
        ? ({
            stage: worst.stage,
            campaign_value: r4(worst.value),
            portfolio_value: r4(worst.portfolio),
            relative_gap: r4(worst.gap),
          } as Bottleneck)
        : null;
  }

  return { as_of: asOf, phase, campaigns: list, totals, pacing, settings: { ...set } };
}

export function weekly(
  state: AppState,
  campId?: string | null,
  asOfOverride?: string
): WeeklyPoint[] {
  const asOf = asOfOverride || state.asOf;
  const E = asOf + 'T23:59';
  const W: Record<string, WeeklyPoint> = {};
  const g = (k: string) =>
    (W[k] = W[k] || {
      week_start: k,
      spend: 0,
      impressions: 0,
      clicks: 0,
      sessions: 0,
      leads: 0,
      registrations: 0,
      cancellations: 0,
      visitors: 0,
    });
  const cidx = campId ? BASE_CAMPS.findIndex((c) => c.id === campId) : null;

  dailyRows(state).forEach((d) => {
    if (d.date > asOf || (campId && d.campId !== campId)) return;
    const w = g(weekKey(d.date));
    w.spend += +d.spend || 0;
    w.impressions += +d.impr || 0;
    w.clicks += +d.clicks || 0;
    w.sessions += +d.sess || 0;
  });

  PEOPLE.forEach((p) => {
    if (p.type !== 0 || p.camp < 0 || p.first > E || (campId && p.camp !== cidx)) return;
    g(weekKey(p.first.slice(0, 10))).leads++;
  });

  REGS.forEach((r) => {
    if (r.at > E || (campId && r.camp !== cidx)) return;
    g(weekKey(r.at.slice(0, 10))).registrations++;
    (HIST[r.id] || []).forEach((h) => {
      if (h.s === 'cancelled' && h.at <= E) g(weekKey(h.at.slice(0, 10))).cancellations++;
    });
  });

  const seen = new Set<string>();
  CHK.forEach((k) => {
    if (
      k.at > E ||
      k.result !== 'admitted' ||
      k.ver !== 'verified' ||
      !EXT.has(k.pid) ||
      seen.has(k.pid)
    )
      return;
    if (campId && k.camp !== cidx) return;
    seen.add(k.pid);
    g(weekKey(k.at.slice(0, 10))).visitors++;
  });

  state.manual.forEach((m) => {
    if (m.date > asOf || (campId && m.camp !== campId)) return;
    const w = g(weekKey(m.date));
    w.spend += +m.spend || 0;
    w.leads += +m.leads || 0;
    w.registrations += +m.regs || 0;
    w.visitors += +m.visitors || 0;
  });

  return Object.values(W).sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
}

export function simulateReallocation(
  state: AppState,
  moves: ReallocationMoveInput[],
  asOfOverride?: string
): ReallocationResult {
  const snap = snapshot(state, asOfOverride);
  const k = state.settings.diminishing;
  let delta = 0;
  const lines: ReallocationMoveResult[] = [];

  for (const mv of moves) {
    const A = resolveCamp(state, mv.from);
    const B = resolveCamp(state, mv.to);
    const amt = +mv.amount || 0;
    if (!A || !B) {
      lines.push({ error: `Unknown campaign in move ${JSON.stringify(mv)}` });
      continue;
    }
    const a = snap.campaigns.find((c) => c.id === A.id);
    const b = snap.campaigns.find((c) => c.id === B.id);
    if (!a || !b) continue;
    const cpvA = snap.phase === 'post-event' ? a.cost_per_visitor : a.projected_cost_per_visitor;
    const cpvB = snap.phase === 'post-event' ? b.cost_per_visitor : b.projected_cost_per_visitor;
    if (!cpvA || !cpvB) {
      lines.push({ error: `No cost/visitor for ${!cpvA ? A.name : B.name}; cannot simulate` });
      continue;
    }
    const lost = amt / (cpvA * k);
    const gained = amt / (cpvB * k);
    delta += gained - lost;
    lines.push({
      from: A.name,
      to: B.name,
      amount_inr: amt,
      from_cost_per_visitor: cpvA,
      to_cost_per_visitor: cpvB,
      visitors_lost_est: Math.round(lost),
      visitors_gained_est: Math.round(gained),
      net: Math.round(gained - lost),
    });
  }

  return {
    moves: lines,
    net_visitor_change_est: Math.round(delta),
    assumption: `Marginal cost/visitor = average cost/visitor × ${k} (diminishing returns) for both the cut and the added budget. Directional estimate, not causal proof.`,
    basis:
      snap.phase === 'post-event'
        ? 'actual cost per verified visitor'
        : 'projected cost per visitor (confirmed × show-rate assumption)',
  };
}
