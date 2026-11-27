import { fmt, inr, pct } from '../engine/format';
import { snapshot } from '../engine/snapshot';
import type { AppState } from '../engine/types';

export function buildSystemPrompt(state: AppState): string {
  const s = snapshot(state);
  const T = s.totals;
  const P = s.pacing;
  const post = s.phase === 'post-event';

  const campLines = s.campaigns
    .map(
      (c) =>
        `${c.id} ${c.name} [${c.status}|${c.recommendation}]: spend ${inr(c.spend)}, leads ${fmt(c.leads)}, regs ${fmt(c.regs)}, ${post ? 'vis' : 'proj'} ${fmt(post ? c.visitors : c.projected_visitors)}, CPV ${inr(post ? c.cost_per_visitor : c.projected_cost_per_visitor)}, opt-out ${pct(c.optout_rate)}`
    )
    .join('\n');

  return `You are the CampusFest Growth Center AI Analyst.
As-of: ${s.as_of} (${s.phase}, target: ${P.target_version}). Coverage: 2025-01-15..2025-04-20 (event 12–13 Apr 2025).

LIVE SNAPSHOT (already computed from current workspace state):
Totals: ${fmt(T.verified_external_visitors)} verified visitors (goal ${fmt(P.visitors.goal)}, proj ${fmt(P.visitors.projected)}), ${fmt(T.regs)} regs (goal ${fmt(P.registrations.goal)}), ${fmt(T.leads)} leads (goal ${fmt(P.leads.goal)}), spend ${inr(T.spend)} / ${inr(P.budget.approved)} (${inr(P.budget.remaining)} left), blended CPV ${inr(T.blended_cpv)}, walk-ins ${fmt(T.walkin_visitors)}.
Campaigns:
${campLines}

Rules:
1. Answer directly from the LIVE SNAPSHOT above when it has the answer (no tool call needed).
2. Call tools only when needed: query_records / person_funnel (ad-hoc slices/leakage), get_alerts, get_experiments, get_plan_model (2026 what-if), simulate_reallocation, list_tasks, get_campaign_detail, get_data_coverage, or propose_action (to create/update tasks or campaigns; requires user confirmation).
3. Distinguish source evidence from assumptions (show-rate ${pct(s.settings.showRate)}, diminishing returns ${s.settings.diminishing}×, attribution ≠ causation).
4. If data cannot answer (e.g. demographics, college names, revenue), state what is missing and give the closest supported answer.
5. Be concise: lead with the direct answer, then short bulleted sections (use plain section titles, not bullets-inside-bullets). Use ₹ and Indian formatting. Always reply in English unless the user explicitly writes in another language. No markdown tables.`;
}
