import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt, fmtDate } from '../../engine/format';
import type { WeeklyPoint } from '../../engine/types';

export const WeeklyTrendChart: React.FC<{
  data: WeeklyPoint[];
  series: { key: keyof WeeklyPoint; label: string; color: string }[];
  height?: number;
}> = ({ data, series, height = 220 }) => {
  if (!data.length) {
    return <p className="py-6 text-center text-xs text-[#8A847C]">No data available.</p>;
  }

  const formatted = data.map((d) => ({
    ...d,
    shortWeek: fmtDate(d.week_start).replace(/,\s*\d{4}$/, ''),
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DC" />
          <XAxis
            dataKey="shortWeek"
            tick={{ fontSize: 11, fill: '#8A847C' }}
            axisLine={{ stroke: '#E5E2DC' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8A847C' }}
            tickFormatter={(v) => fmt(Number(v))}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E2DC',
              fontSize: '12px',
              color: '#141413',
              boxShadow: 'none',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#57534E' }} />
          {series.map((s) => (
            <Line
              key={String(s.key)}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface HBarRow {
  name: string;
  value: number | null;
  color?: string;
}

export const HorizontalBarList: React.FC<{
  rows: HBarRow[];
  formatValue: (v: number | null) => string;
  defaultColor?: string;
}> = ({ rows, formatValue, defaultColor = '#0F766E' }) => {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));

  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pctWidth = Math.min(100, Math.max(0, ((r.value || 0) / max) * 100));
        return (
          <div
            key={r.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[170px_1fr_76px] items-center gap-x-3 gap-y-1"
          >
            <div className="truncate text-xs text-[#57534E]">{r.name}</div>
            <div className="order-3 col-span-2 sm:order-none sm:col-span-1 h-2 w-full overflow-hidden rounded-[2px] bg-[#F1EFEA]">
              <div
                className="h-full rounded-[2px]"
                style={{ width: `${pctWidth.toFixed(1)}%`, backgroundColor: r.color || defaultColor }}
              />
            </div>
            <div className="text-right text-xs font-medium text-[#141413] tabular-nums">
              {formatValue(r.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
