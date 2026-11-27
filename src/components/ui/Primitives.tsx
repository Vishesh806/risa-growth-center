import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Recommendation } from '../../engine/types';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-[#0F766E] px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#115E59] disabled:opacity-40 cursor-pointer';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-[6px] border border-[#D1CDC4] bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-[#141413] hover:bg-[#F1EFEA] disabled:opacity-40 cursor-pointer';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-[6px] border border-[#FECACA] bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-40 cursor-pointer';

export const inputClass =
  'rounded-[6px] border border-[#D1CDC4] bg-white px-2.5 py-1.5 text-sm text-[#141413] focus:border-[#0F766E] focus:outline-none';

export const Card: React.FC<{
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, action, className = '', children }) => (
  <section className={`rounded-[8px] border border-[#E5E2DC] bg-white p-4 sm:p-5 ${className}`}>
    {(title || action) && (
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        {title && <h3 className="text-sm font-semibold text-[#141413]">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  fraction?: number | null;
}> = ({ label, value, sub, badge, fraction }) => {
  const pctWidth = fraction != null ? Math.min(100, Math.max(0, fraction * 100)) : null;

  return (
    <div className="rounded-[8px] border border-[#E5E2DC] bg-white p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-[#57534E]">{label}</div>
        {badge && (
          <span className="shrink-0 rounded-[6px] bg-[#F1EFEA] px-2 py-0.5 text-[11px] font-medium text-[#57534E] tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-[#141413] tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs leading-relaxed text-[#57534E] tabular-nums">{sub}</div>}
      {pctWidth != null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-[2px] bg-[#E5E2DC]">
          <div className="h-full rounded-[2px] bg-[#0F766E]" style={{ width: `${pctWidth}%` }} />
        </div>
      )}
    </div>
  );
};

export const Tag: React.FC<{
  tone: Recommendation | 'NO DATA' | 'CHANGE' | 'STOP' | string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ tone, title, className = '', children }) => {
  const styles: Record<string, string> = {
    SCALE: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    FIX: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    CHANGE: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    CUT: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    STOP: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    STOPPED: 'bg-[#F1EFEA] text-[#57534E] border-[#E5E2DC]',
    PAUSED: 'bg-[#F1EFEA] text-[#57534E] border-[#E5E2DC]',
    'NO DATA': 'bg-[#F1EFEA] text-[#57534E] border-[#E5E2DC]',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold ${
        styles[tone] || styles.STOPPED
      } ${className}`}
    >
      {children || tone}
    </span>
  );
};

export const Callout: React.FC<{
  variant?: 'info' | 'good' | 'bad';
  children: React.ReactNode;
  className?: string;
}> = ({ variant = 'info', children, className = '' }) => {
  const styles = {
    info: 'border-[#CCFBF1] bg-[#F0FDFA] text-[#141413]',
    good: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#141413]',
    bad: 'border-[#FECACA] bg-[#FEF2F2] text-[#141413]',
  };
  return (
    <div className={`rounded-[8px] border px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const ModalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141413]/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[12px] sm:rounded-[8px] border border-[#E5E2DC] bg-white p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-[#E5E2DC] pb-2.5">
          <h3 className="text-base font-semibold text-[#141413]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#57534E] hover:bg-[#F1EFEA] hover:text-[#141413] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
