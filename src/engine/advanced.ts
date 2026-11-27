import {
  allCampaigns,
  BASE_CAMPS,
  campName,
  CHK,
  dailyRows,
  EVENT_D1,
  HIST,
  HIST_END,
  INTER,
  INTERP,
  PEOPLE,
  PERSON,
  PTYPE_NAMES,
  RAW,
  REGS,
  regStatusAt,
  resolveCamp,
  SEED_EXPS,
} from './dataset';
import { addDays, div, fmt, inr, pct, r2, r4, validDate, weekKey } from './format';
import { snapshot } from './snapshot';
import type {
  AlertItem,
  AlertsResult,
  AppState,
  ExperimentEval,
  ExperimentsResult,
  PlanChannelResult,
  PlanModel,
  PlanResult,
  PlanTotalsBucket,
} from './types';

export interface QueryFilters {
  campaign?: string;
  date_from?: string;
  date_to?: string;
  status?: string | string[];
  event_type?: string | string[];
  result?: string | string[];
  verification?: string | string[];
  source?: string | string[];
  person_type?: string | string[];
  touch?: string | string[];
  hour?: string | string[];
  has_registration?: boolean;
  has_verified_visit?: boolean;
}

export interface QueryRecordsArgs {
  dataset: 'people' | 'registrations' | 'checkins' | 'interactions' | 'daily';
  metric?: 'count' | 'distinct_people' | 'sum';
  field?: string;
  group_by?: string[];
  filters?: QueryFilters;
  as_of?: string;
}

export function queryRecords(state: AppState, a: QueryRecordsArgs) {
  const asOf = a.as_of ? validDate(a.as_of) : state.asOf;
  if (!asOf) return { error: 'as_of must be YYYY-MM-DD within 2025-01-15..2025-04-20' };
  const E = asOf + 'T23:59';
  const f = a.filters || {};
  const ds = a.dataset;
  let camp = null;
  if (f.campaign) {
    camp = resolveCamp(state, f.campaign);
    if (!camp) {
      return {
        error: `Unknown campaign "${f.campaign}". Options: ${allCampaigns(state)
          .map((c) => c.name)
          .join(', ')}`,
      };
    }
  }

  const regPeople = new Set(REGS.filter((r) => r.at <= E).map((r) => r.pid));
  const visitPeople = new Set(
    CHK.filter((k) => k.at <= E && k.result === 'admitted' && k.ver === 'verified').map(
      (k) => k.pid
    )
  );
  const statusOf: Record<string, string> = {};
  REGS.forEach((r) => {
    if (r.at <= E) statusOf[r.pid] = regStatusAt(r.id, E) || 'interested';
  });

  type Row = Record<string, string | number | undefined>;
  let rows: Row[];

  if (ds === 'people') {
    rows = PEOPLE.filter((p) => p.first <= E).map((p) => ({
      pid: p.id,
      campaign: campName(p.camp),
      date: p.first.slice(0, 10),
      person_type: PTYPE_NAMES[p.type],
      touch: p.touch,
      status: statusOf[p.id] || 'not_registered',
    }));
  } else if (ds === 'registrations') {
    rows = RAW.regs
      .filter((r) => r[3] <= E)
      .map((r) => ({
        pid: r[1],
        campaign: campName(r[2]),
        date: r[3].slice(0, 10),
        person_type: PTYPE_NAMES[(PERSON[r[1]] || {}).type || 0],
        status: regStatusAt(r[0], E) || 'interested',
      }));
  } else if (ds === 'checkins') {
    rows = CHK.filter((k) => k.at <= E).map((k) => ({
      pid: k.pid,
      campaign: campName(k.camp),
      date: k.at.slice(0, 10),
      hour: k.at.slice(11, 13),
      result: k.result,
      verification: k.ver,
      source: k.src,
      person_type: PTYPE_NAMES[(PERSON[k.pid] || { type: 0 }).type],
    }));
  } else if (ds === 'interactions') {
    rows = INTERP.filter((i) => i.at <= E).map((i) => ({
      pid: i.pid,
      campaign: campName(i.camp),
      date: i.at.slice(0, 10),
      event_type: i.type,
      person_type: 'external',
      status: statusOf[i.pid] || 'not_registered',
    }));
  } else if (ds === 'daily') {
    rows = dailyRows(state)
      .filter((d) => d.date <= asOf)
      .map((d) => ({
        campaign: BASE_CAMPS[d.camp].name,
        date: d.date,
        impressions: +d.impr,
        clicks: +d.clicks,
        reach: +d.reach,
        sessions: +d.sess,
        form_starts: +d.starts,
        spend: +d.spend,
      }));
  } else {
    return { error: 'dataset must be one of people, registrations, checkins, interactions, daily' };
  }

  const eq = (r: Row, k: keyof QueryFilters) => {
    const val = f[k];
    if (val == null || val === '') return true;
    const arr = Array.isArray(val) ? val : [val];
    return arr.map(String).includes(String(r[k]));
  };

  rows = rows.filter((r) => {
    if (camp && r.campaign !== camp.name) return false;
    if (f.date_from && String(r.date) < f.date_from) return false;
    if (f.date_to && String(r.date) > f.date_to) return false;
    for (const k of [
      'status',
      'event_type',
      'result',
      'verification',
      'source',
      'person_type',
      'touch',
      'hour',
    ] as const) {
      if (!eq(r, k)) return false;
    }
    if (f.has_registration != null && r.pid && regPeople.has(String(r.pid)) !== !!f.has_registration)
      return false;
    if (
      f.has_verified_visit != null &&
      r.pid &&
      visitPeople.has(String(r.pid)) !== !!f.has_verified_visit
    )
      return false;
    return true;
  });

  const metric = a.metric || 'count';
  const field = a.field;
  if (metric === 'distinct_people' && ds === 'daily') {
    return { error: 'daily rows are anonymous aggregates; distinct_people not possible' };
  }
  if (metric === 'sum' && rows.length && !(field && typeof rows[0][field] === 'number')) {
    return {
      error: `sum needs a numeric field of ${ds}: ${Object.keys(rows[0])
        .filter((k) => typeof rows[0][k] === 'number')
        .join(', ')}`,
    };
  }

  const gb = ([] as string[]).concat(a.group_by || []).slice(0, 2);
  const keyOf = (r: Row) =>
    gb.map((g) => (g === 'week' ? weekKey(String(r.date)) : String(r[g] ?? '—'))).join(' | ') ||
    'all';

  const G = new Map<string, { n: number; s: number; p: Set<string> }>();
  for (const r of rows) {
    const k = keyOf(r);
    let g = G.get(k);
    if (!g) {
      g = { n: 0, s: 0, p: new Set() };
      G.set(k, g);
    }
    g.n++;
    if (metric === 'sum' && field) g.s += Number(r[field]) || 0;
    if (r.pid) g.p.add(String(r.pid));
  }

  const val = (g: { n: number; s: number; p: Set<string> }) =>
    metric === 'sum' ? g.s : metric === 'distinct_people' ? g.p.size : g.n;
  const out = [...G.entries()].map(([k, g]) => ({ group: k, value: val(g) }));
  out.sort((x, y) =>
    gb.includes('date') || gb.includes('week')
      ? x.group < y.group
        ? -1
        : 1
      : y.value - x.value
  );

  const allP = new Set(rows.filter((r) => r.pid).map((r) => String(r.pid)));
  return {
    dataset: ds,
    as_of: asOf,
    metric,
    field: field || null,
    group_by: gb,
    filters: f,
    total:
      metric === 'sum' && field
        ? rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
        : metric === 'distinct_people'
          ? allP.size
          : rows.length,
    groups: out.slice(0, 80),
    truncated: out.length > 80,
    caveats: [
      ds === 'checkins'
        ? 'Check-ins include all person types and repeat admissions; a verified visitor = distinct external person with result=admitted AND verification=verified.'
        : null,
      ds === 'daily'
        ? 'Daily rows are anonymous event counts; reach is not summable to unique people.'
        : null,
      'Manual entries from the Data tab are aggregates and are not included in record-level queries.',
    ].filter(Boolean),
  };
}

export function personFunnel(state: AppState, campQ?: string, asOfOverride?: string) {
  const asOf = asOfOverride || state.asOf;
  const E = asOf + 'T23:59';
  let cidx: number | null = null;
  if (campQ) {
    const c = resolveCamp(state, campQ);
    if (!c) return { error: 'Unknown campaign ' + campQ };
    cidx = BASE_CAMPS.findIndex((x) => x.id === c.id);
    if (cidx < 0) return { error: 'No record-level data for new campaigns' };
  }

  const ppl = PEOPLE.filter(
    (p) => p.type === 0 && p.camp >= 0 && p.first <= E && (cidx == null || p.camp === cidx)
  );
  const ids = new Set(ppl.map((p) => p.id));
  const did = (t: string) =>
    new Set(INTERP.filter((i) => i.at <= E && i.type === t && ids.has(i.pid)).map((i) => i.pid));

  const reg = new Set(REGS.filter((r) => r.at <= E && ids.has(r.pid)).map((r) => r.pid));
  const conf = new Set(
    REGS.filter((r) => r.at <= E && ids.has(r.pid) && regStatusAt(r.id, E) === 'confirmed').map(
      (r) => r.pid
    )
  );
  const vis = new Set(
    CHK.filter(
      (k) => k.at <= E && k.result === 'admitted' && k.ver === 'verified' && ids.has(k.pid)
    ).map((k) => k.pid)
  );

  const bro = did('brochure_download');
  const st = did('registration_start');
  const q = did('event_question_submitted');
  const op = did('nurture_email_opened');
  const cl = did('nurture_email_clicked');
  const sent = did('nurture_email_sent');
  const oo = did('opted_out');
  const minus = (A: Set<string>, B: Set<string>) => [...A].filter((x) => !B.has(x)).length;

  return {
    as_of: asOf,
    campaign: cidx == null ? 'all campaigns' : BASE_CAMPS[cidx].name,
    identified_people: ids.size,
    page_visit: did('page_visit').size,
    brochure_download: bro.size,
    question_submitted: q.size,
    registration_start: st.size,
    registered: reg.size,
    confirmed: conf.size,
    verified_visit: vis.size,
    leakage: {
      started_form_not_registered: minus(st, reg),
      brochure_not_registered: minus(bro, reg),
      registered_not_visited: asOf >= EVENT_D1 ? minus(reg, vis) : null,
      confirmed_not_visited: asOf >= EVENT_D1 ? minus(conf, vis) : null,
    },
    email: {
      sent: sent.size,
      opened: op.size,
      clicked: cl.size,
      open_rate: r4(div(op.size, sent.size)),
      click_to_open: r4(div(cl.size, op.size)),
      opted_out: oo.size,
    },
    lift_signals: {
      visit_rate_if_brochure:
        asOf >= EVENT_D1 ? r4(div([...bro].filter((x) => vis.has(x)).length, bro.size)) : null,
      visit_rate_if_no_brochure:
        asOf >= EVENT_D1
          ? r4(div([...ids].filter((x) => !bro.has(x) && vis.has(x)).length, ids.size - bro.size))
          : null,
      note: 'Correlation only (self-selection), not causal.',
    },
  };
}

export function alerts(state: AppState, asOfOverride?: string): AlertsResult {
  const asOf = asOfOverride || state.asOf;
  const out: AlertItem[] = [];
  const w0 = addDays(asOf, -6);
  const p0 = addDays(asOf, -27);
  const p1 = addDays(asOf, -7);
  const inR = (d: string, a: string, b: string) => d >= a && d <= b;
  const rows = dailyRows(state);

  for (const c of allCampaigns(state).filter((x) => !x.isNew)) {
    const ci = BASE_CAMPS.findIndex((x) => x.id === c.id);
    const sp = (a: string, b: string) =>
      rows.filter((d) => d.campId === c.id && inR(d.date, a, b)).reduce((s, d) => s + (+d.spend || 0), 0);
    const rg = (a: string, b: string) =>
      REGS.filter((r) => r.camp === ci && inR(r.at.slice(0, 10), a, b)).length;
    const cx = (a: string, b: string) =>
      REGS.filter((r) => r.camp === ci).reduce(
        (s, r) => s + (HIST[r.id] || []).filter((h) => h.s === 'cancelled' && inR(h.at.slice(0, 10), a, b)).length,
        0
      );
    const oo = (a: string, b: string) =>
      INTER.filter((i) => i.camp === ci && i.type === 'opted_out' && inR(i.date, a, b)).reduce(
        (s, i) => s + i.n,
        0
      );

    const cur = { spend: sp(w0, asOf), regs: rg(w0, asOf), cancels: cx(w0, asOf), optouts: oo(w0, asOf) };
    const base = {
      spend: sp(p0, p1) / 3,
      regs: rg(p0, p1) / 3,
      cancels: cx(p0, p1) / 3,
      optouts: oo(p0, p1) / 3,
    };
    const cprC = div(cur.spend, cur.regs);
    const cprB = div(base.spend, base.regs);

    const push = (
      metric: string,
      now: number,
      was: number,
      dir: 'up' | 'down',
      sev: 'high' | 'medium' | 'info'
    ) =>
      out.push({
        campaign: c.name,
        metric,
        last_7d: r2(now),
        prior_3wk_weekly_avg: r2(was),
        change: r4(was ? (now - was) / was : null),
        direction: dir,
        severity: sev,
      });

    if (base.regs >= 5 && cur.regs < base.regs * 0.7)
      push('registrations', cur.regs, base.regs, 'down', 'high');
    if (base.regs >= 5 && cur.regs > base.regs * 1.3)
      push('registrations', cur.regs, base.regs, 'up', 'info');
    if (cprB && cprC && cprC > cprB * 1.3)
      push('cost_per_registration', cprC, cprB, 'up', 'high');
    if (cur.cancels >= 3 && cur.cancels > base.cancels * 1.5)
      push('cancellations', cur.cancels, base.cancels, 'up', 'medium');
    if (cur.optouts >= 3 && cur.optouts > base.optouts * 1.5)
      push('opt_outs', cur.optouts, base.optouts, 'up', 'medium');
    if (base.spend > 0 && cur.spend > base.spend * 1.5)
      push('spend', cur.spend, base.spend, 'up', 'info');
  }

  const sevR = { high: 0, medium: 1, info: 2 };
  out.sort((a, b) => sevR[a.severity] - sevR[b.severity]);
  return {
    as_of: asOf,
    window: `${w0}..${asOf} vs weekly average of ${p0}..${p1}`,
    alerts: out,
    note: 'Thresholds: ±30% registrations / cost per registration, +50% cancellations/opt-outs/spend. Week-over-week noise is possible; check volume.',
  };
}

export function planCalc(state: AppState, planOverride?: PlanModel): PlanResult {
  const plan = planOverride || state.plan;
  const act = snapshot(state, HIST_END).campaigns;
  const rows: PlanChannelResult[] = [];
  const makeBucket = (): PlanTotalsBucket => ({
    leads: 0,
    regs: 0,
    vis: 0,
    spend: 0,
    cpv: null,
    growth_vs_2025: null,
    peak_day: 0,
    within_budget: true,
    budget_gap: 0,
    within_capacity: true,
  });

  const tot = { base: makeBucket(), stretch: makeBucket() };

  for (const c of plan.channels) {
    const a = act.find((x) => x.id === c.ref);
    const ev = { cpl: a?.cpl ?? null, l2r: a?.lead_to_reg ?? null, r2v: a?.reg_to_visit ?? null };
    const bRegs = Math.round(c.leads * c.l2r);
    const bVis = Math.round(bRegs * c.r2v);
    const bSpend = Math.round(c.leads * c.cpl);
    const sRegs = Math.round(c.sLeads * c.sL2r);
    const sVis = Math.round(sRegs * c.sR2v);
    const sSpend = Math.round(c.sLeads * c.sCpl);

    const flags: string[] = [];
    if (ev.l2r != null && c.l2r > ev.l2r + 0.001)
      flags.push(`base lead→reg ${pct(c.l2r)} > 2025 ${pct(ev.l2r)}`);
    if (ev.r2v != null && c.r2v > ev.r2v + 0.001)
      flags.push(`base reg→visit ${pct(c.r2v)} > 2025 ${pct(ev.r2v)}`);
    if (ev.cpl != null && c.cpl < ev.cpl - 0.5)
      flags.push(`base CPL ₹${c.cpl} < 2025 ₹${Math.round(ev.cpl)}`);

    rows.push({
      ...c,
      base: { regs: bRegs, vis: bVis, spend: bSpend, cpv: r2(div(bSpend, bVis)) },
      stretch: { regs: sRegs, vis: sVis, spend: sSpend, cpv: r2(div(sSpend, sVis)) },
      actual2025: {
        leads: a?.leads,
        cpl: ev.cpl,
        lead_to_reg: ev.l2r,
        reg_to_visit: ev.r2v,
        visitors: a?.visitors,
      },
      incremental_vs_2025: {
        base: bVis - (a?.visitors || 0),
        stretch: sVis - (a?.visitors || 0),
      },
      evidence_flags: flags,
    });

    tot.base.leads += c.leads;
    tot.base.regs += bRegs;
    tot.base.vis += bVis;
    tot.base.spend += bSpend;
    tot.stretch.leads += c.sLeads;
    tot.stretch.regs += sRegs;
    tot.stretch.vis += sVis;
    tot.stretch.spend += sSpend;
  }

  tot.base.vis += +plan.walkins;
  tot.stretch.vis += +plan.walkinsStretch;
  tot.base.spend += +plan.showupSpend;
  tot.stretch.spend += +plan.showupSpendStretch;

  (['base', 'stretch'] as const).forEach((k) => {
    const t = tot[k];
    t.cpv = r2(t.spend / t.vis);
    t.growth_vs_2025 = r4(t.vis / plan.baseline2025 - 1);
    t.peak_day = Math.round(t.vis * plan.day1Share);
    t.within_budget = t.spend <= plan.budget;
    t.budget_gap = plan.budget - t.spend;
    t.within_capacity = t.peak_day <= plan.perDayCapacity;
  });

  const ceiling = Math.round((2 * plan.perDayCapacity) / plan.daysPerVisitor);
  const warnings: string[] = [];
  if (!tot.base.within_budget)
    warnings.push(`Base spend ${inr(tot.base.spend)} exceeds budget ${inr(plan.budget)}`);
  if (!tot.base.within_capacity) warnings.push('Base peak day exceeds venue capacity');
  if (!tot.stretch.within_capacity)
    warnings.push(
      `Stretch peak day ${fmt(tot.stretch.peak_day)} exceeds capacity ${fmt(plan.perDayCapacity)}`
    );
  if (tot.stretch.vis > ceiling)
    warnings.push(`Stretch ${fmt(tot.stretch.vis)} above 2-day unique ceiling ≈ ${fmt(ceiling)}`);
  const nf = rows.reduce((n, r) => n + r.evidence_flags.length, 0);
  if (nf) warnings.push(`${nf} base assumption(s) are more optimistic than 2025 evidence`);

  return {
    channels: rows,
    totals: tot,
    two_day_unique_ceiling: ceiling,
    settings: {
      budget: plan.budget,
      perDayCapacity: plan.perDayCapacity,
      day1Share: plan.day1Share,
      daysPerVisitor: plan.daysPerVisitor,
      walkins: plan.walkins,
      walkinsStretch: plan.walkinsStretch,
    },
    warnings,
    method:
      'visitors = round(round(leads × lead→reg) × reg→visit); spend = leads × CPL; + walk-ins and show-up engine spend. 2025 actuals from source data are the evidence benchmark.',
  };
}

export function experiments(state: AppState, asOfOverride?: string): ExperimentsResult {
  const s = snapshot(state, asOfOverride);
  const set = state.settings;
  const C = (id: string) => s.campaigns.find((c) => c.id === id);
  const post = s.phase === 'post-event';

  const res: ExperimentEval[] = (state.exps || SEED_EXPS).map((e) => {
    let v: number | null = null;
    let note = '';
    let guard: string | null = null;

    if (e.metric === 'leads_per_college') {
      const c04 = C('C04');
      v = c04 ? div(c04.leads, set.partnerColleges) : null;
      note = `${fmt(c04?.leads)} leads ÷ ${set.partnerColleges} colleges (college count is an assumption — not in data)`;
      guard = `lead→reg ${pct(c04?.lead_to_reg)} (needs ≥85%)`;
    } else if (e.metric === 'referral_leads_per_registrant') {
      const c05 = C('C05');
      v = c05 ? div(c05.leads, s.totals.regs) : null;
      note = `${fmt(c05?.leads)} referral leads ÷ ${fmt(s.totals.regs)} registrants. Invite counts are not captured — proxy metric.`;
      guard = `projected cost/visitor ${inr(post ? c05?.cost_per_visitor : c05?.projected_cost_per_visitor)}`;
    } else if (e.metric === 'confirmed_to_visit') {
      if (post) {
        v = s.totals.confirmed_to_visit;
        note = `${fmt(s.totals.visitors)} attributed visitors ÷ ${fmt(s.totals.confirmed)} confirmed`;
      } else {
        note =
          'Not measurable before the event. Leading indicator needed: T-7 reconfirmation rate (not captured in source data — add a field). Current cancellation rate ' +
          pct(div(s.totals.cancelled, s.totals.regs)) +
          '.';
      }
    } else if (e.metric === 'cpv_vs_blended') {
      const c02 = C('C02');
      const c03 = C('C03');
      const sp = (c02?.spend || 0) + (c03?.spend || 0);
      const vi = post
        ? (c02?.visitors || 0) + (c03?.visitors || 0)
        : (c02?.projected_visitors || 0) + (c03?.projected_visitors || 0);
      const cpv = div(sp, vi);
      v = cpv && s.totals.blended_cpv ? div(cpv, s.totals.blended_cpv) : null;
      note = `${inr(sp)} ÷ ${fmt(vi)} ${post ? 'visitors' : 'projected visitors'} = ${inr(cpv)} vs blended ${inr(s.totals.blended_cpv)}`;
      guard = `opt-out ${pct(div((c02?.optouts || 0) + (c03?.optouts || 0), (c02?.leads || 0) + (c03?.leads || 0)))} (stop ≥ ${pct(set.optoutCut)})`;
    } else if (e.metric === 'regs_per_ambassador') {
      const c01 = C('C01');
      v = c01 ? div(c01.regs, set.ambassadors) : null;
      note = `${fmt(c01?.regs)} registrations ÷ ${set.ambassadors} ambassadors (ambassador count is an assumption)`;
    }

    let verdict: ExperimentEval['verdict'] = 'NO DATA';
    if (v != null) {
      const good = e.higher ? v >= e.scale : v <= e.scale;
      const bad = e.higher ? v < e.stop : v >= e.stop;
      verdict = good ? 'SCALE' : bad ? 'STOP' : 'CHANGE';
    }

    return { ...e, value: r4(v), verdict, calculation: note, guardrail: guard };
  });

  return {
    as_of: s.as_of,
    phase: s.phase,
    experiments: res,
    note: 'Thresholds are editable in the Experiments tab. Proxy metrics and assumed denominators are labelled.',
  };
}
