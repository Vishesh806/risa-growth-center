import { describe, expect, it } from 'vitest';
import { freshState } from '../dataset';
import { snapshot, simulateReallocation, weekly } from '../snapshot';
import { personFunnel, planCalc, queryRecords, experiments, alerts } from '../advanced';

describe('CampusFest Growth Center analytics parity', () => {
  it('matches 2025 baseline totals as of 2025-04-20', () => {
    const state = freshState();
    const s = snapshot(state, '2025-04-20');

    expect(s.phase).toBe('post-event');
    expect(s.totals.verified_external_visitors).toBe(2050);
    expect(s.totals.visitors).toBe(1925);
    expect(s.totals.walkin_visitors).toBe(125);
    expect(s.totals.spend).toBe(274000);
    expect(s.totals.leads).toBe(3500);
    expect(s.totals.regs).toBe(2800);
    expect(s.totals.confirmed).toBe(2500);
    expect(s.totals.cancelled).toBe(183);
    expect(s.totals.waitlisted).toBe(88);
    expect(s.totals.interested).toBe(29);

    const paidSocial = s.campaigns.find((c) => c.id === 'C02');
    expect(paidSocial?.spend).toBe(93000);
    expect(paidSocial?.visitors).toBe(340);
    expect(paidSocial?.cost_per_visitor).toBe(273.53);
    expect(paidSocial?.recommendation).toBe('CUT');
  });

  it('prevents future leakage in pre-event snapshots (2025-03-15)', () => {
    const state = freshState();
    const s = snapshot(state, '2025-03-15');

    expect(s.phase).toBe('pre-event');
    expect(s.totals.verified_external_visitors).toBe(0);
    expect(s.totals.projected_total_visitors).toBe(1084);
    expect(s.pacing.target_version).toBe('Attendee revised plan');
  });

  it('matches queryRecords & personFunnel spot checks', () => {
    const state = freshState();
    const funnel = personFunnel(state, undefined, '2025-04-20');
    expect('error' in funnel).toBe(false);
    if (!('error' in funnel)) {
      expect(funnel.leakage.brochure_not_registered).toBe(319);
    }

    const day2 = queryRecords(state, {
      dataset: 'checkins',
      metric: 'count',
      group_by: ['source'],
      filters: { date_from: '2025-04-13', date_to: '2025-04-13', result: 'admitted', verification: 'verified' },
    });
    expect('error' in day2).toBe(false);
    if (!('error' in day2)) {
      const scanner = day2.groups.find((g) => g.group === 'scanner');
      const manual = day2.groups.find((g) => g.group === 'manual');
      expect(scanner?.value).toBe(1235);
      expect(manual?.value).toBe(110);
    }
  });

  it('matches 2026 Bengaluru plan model calculations', () => {
    const state = freshState();
    const p = planCalc(state);

    expect(p.totals.base.vis).toBe(2597);
    expect(p.totals.base.spend).toBe(295850);
    expect(p.totals.stretch.vis).toBe(3708);
    expect(p.totals.stretch.spend).toBe(377650);
    expect(p.warnings.length).toBe(0);
  });

  it('computes weekly series, reallocation simulation, experiments, and alerts', () => {
    const state = freshState();
    const w = weekly(state, 'C02', '2025-04-20');
    const totalSpend = w.reduce((acc, x) => acc + x.spend, 0);
    expect(totalSpend).toBe(93000);

    const sim = simulateReallocation(state, [{ from: 'Paid Social', to: 'College Partnerships', amount: 20000 }]);
    expect(sim.net_visitor_change_est).toBe(140);

    const ex = experiments(state, '2025-04-20');
    expect(ex.experiments).toHaveLength(5);

    const al = alerts(state, '2025-04-20');
    expect(al.as_of).toBe('2025-04-20');
  });
});
