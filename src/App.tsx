import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Settings2 } from 'lucide-react';
import { GrowthProvider, useGrowthStore } from './state/useGrowthStore';
import { btnSecondary, Tag } from './components/ui/Primitives';
import { ChatPanel } from './components/chat/ChatPanel';
import { AISettingsModal } from './components/chat/AISettingsModal';
import { OverviewView } from './views/OverviewView';
import { CampaignsView } from './views/CampaignsView';
import { DiagnoseView } from './views/DiagnoseView';
import { DecideView } from './views/DecideView';
import { ExperimentsView } from './views/ExperimentsView';
import { Plan2026View } from './views/Plan2026View';
import { TasksView } from './views/TasksView';
import { DataSettingsView } from './views/DataSettingsView';

const TABS = [
  ['overview', 'Overview'],
  ['campaigns', 'Campaigns'],
  ['diagnose', 'Diagnose'],
  ['decide', 'Decide'],
  ['experiments', 'Experiments'],
  ['plan', '2026 Plan'],
  ['tasks', 'Tasks'],
  ['data', 'Data & Settings'],
] as const;

type TabKey = (typeof TABS)[number][0];

const GrowthShell: React.FC = () => {
  const { state, snap, setAsOf } = useGrowthStore();
  const [tab, setTab] = useState<TabKey>('overview');
  const [chatOpen, setChatOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [tab]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7F4] text-[#141413]">
      {/* Unified Light Header + Navigation */}
      <header className="sticky top-0 z-20 border-b border-[#E5E2DC] bg-white">
        <div className="mx-auto max-w-[1600px] px-3.5 sm:px-6 pt-2.5 sm:pt-3">
          {/* Row 1: Title + Settings (mobile) | Full single-row header (sm+) */}
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[15px] sm:text-base font-semibold tracking-tight text-[#141413]">
                CampusFest Growth Center
              </h1>
              <Tag tone="STOPPED" className="hidden sm:inline-flex whitespace-nowrap shrink-0">
                {snap.phase} · {snap.pacing.target_version}
              </Tag>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <label className="hidden sm:flex items-center gap-1.5 rounded-[6px] border border-[#E5E2DC] bg-[#F1EFEA] px-2.5 py-1 text-xs text-[#57534E] whitespace-nowrap">
                <span className="whitespace-nowrap">Data as of</span>
                <input
                  type="date"
                  min="2025-01-15"
                  max="2025-04-20"
                  value={state.asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#141413] tabular-nums focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => setAiSettingsOpen(true)}
                title="AI settings"
                aria-label="AI settings"
                className={`${btnSecondary} h-[34px] w-[34px] sm:w-auto sm:px-2.5 p-0 text-xs whitespace-nowrap`}
              >
                <Settings2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-[#57534E]" />
                <span className="hidden sm:inline">AI settings</span>
              </button>
            </div>
          </div>

          {/* Row 2 (mobile < 640px only): Single compact metadata bar */}
          <div className="flex items-center justify-between gap-2 pb-2 sm:hidden">
            <Tag tone="STOPPED" className="whitespace-nowrap text-xs">
              {snap.phase} · {snap.pacing.target_version}
            </Tag>
            <input
              type="date"
              aria-label="Data as of"
              min="2025-01-15"
              max="2025-04-20"
              value={state.asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-[6px] border border-[#E5E2DC] bg-[#F1EFEA] px-2 py-1 text-xs font-medium text-[#141413] tabular-nums whitespace-nowrap focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          {/* Row 3: Tab Navigation with pointer-events-none right-edge gradient fade */}
          <div className="relative -mx-3.5 sm:mx-0">
            <nav
              aria-label="Dashboard sections"
              className="no-scrollbar flex gap-1 overflow-x-auto px-3.5 sm:px-0"
            >
              {TABS.map(([k, label]) => {
                const active = tab === k;
                return (
                  <button
                    key={k}
                    ref={(el) => {
                      tabRefs.current[k] = el;
                    }}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`shrink-0 border-b-2 px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0F766E] font-semibold text-[#0F766E]'
                        : 'border-transparent font-medium text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <div className="w-6 shrink-0 lg:hidden" aria-hidden="true" />
            </nav>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent lg:hidden"
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      {/* Main Workspace + Docked Desktop Chat Drawer */}
      <div className="flex w-full flex-1 items-start">
        <main className="min-w-0 flex-1 p-3.5 sm:p-5 lg:p-6 pb-24">
          <div className="mx-auto max-w-[1520px]">
            {tab === 'overview' && <OverviewView />}
            {tab === 'campaigns' && <CampaignsView />}
            {tab === 'diagnose' && <DiagnoseView />}
            {tab === 'decide' && <DecideView />}
            {tab === 'experiments' && <ExperimentsView />}
            {tab === 'plan' && <Plan2026View />}
            {tab === 'tasks' && <TasksView />}
            {tab === 'data' && <DataSettingsView />}
          </div>
        </main>

        <ChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onOpenSettings={() => setAiSettingsOpen(true)}
        />
      </div>

      {/* Refined Floating AI Analyst Trigger */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open AI Analyst"
          className="fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-full border border-[#115E59]/20 bg-[#0F766E] sm:px-4 sm:py-2.5 text-sm font-medium text-white shadow-md hover:bg-[#115E59] cursor-pointer"
        >
          <MessageSquare className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">AI Analyst</span>
        </button>
      )}

      <AISettingsModal open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => (
  <GrowthProvider>
    <GrowthShell />
  </GrowthProvider>
);

export default App;
