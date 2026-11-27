import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { AnalystApiError, runAnalystTurn, type ClaudeSampleWindow } from '../../ai/providers';
import { useGrowthStore } from '../../state/useGrowthStore';
import { btnPrimary, btnSecondary } from '../ui/Primitives';
import type { ChatMessage, PendingProposal, ToolTraceItem } from '../../engine/types';

const STARTER_PROMPTS = [
  'Are we on track for the visitor goal?',
  'Which campaign should we cut, and why?',
  'How many people downloaded the brochure but never registered?',
  'Manual vs scanner check-ins on day 2?',
  'Which bets should we scale right now?',
  'If college partnerships only hit 70% show-up, does the 2026 base still hold?',
  'Move ₹20k from Paid Social to College Partnerships — impact?',
  'Which colleges sent the most attendees?',
];

const CHAT_LS_KEY = 'campusfest_growth_chat_v1';

const TOOL_LABELS: Record<string, string> = {
  get_snapshot: 'Checked live snapshot',
  get_campaign_detail: 'Inspected campaign',
  get_weekly_trend: 'Checked weekly trend',
  compare_snapshots: 'Compared dates',
  query_records: 'Queried raw records',
  person_funnel: 'Checked person funnel',
  get_alerts: 'Checked alerts',
  get_experiments: 'Checked growth bets',
  get_plan_model: 'Simulated 2026 plan',
  simulate_reallocation: 'Simulated budget shift',
  list_tasks: 'Checked tasks',
  get_data_coverage: 'Checked data coverage',
  propose_action: 'Prepared action proposal',
};

const ToolTracePills: React.FC<{ traces: ToolTraceItem[] }> = ({ traces }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = traces.filter((t) => t.name !== 'calculate');
  if (!visible.length) return null;

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 rounded-[6px] border border-[#E5E2DC] bg-[#F1EFEA] px-2 py-0.5 text-[11px] font-medium text-[#57534E] hover:text-[#141413] cursor-pointer"
      >
        <Wrench className="h-3 w-3" />
        <span>
          {visible.length === 1
            ? TOOL_LABELS[visible[0].name] || visible[0].name
            : `${visible.length} data lookups`}
        </span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 rounded-[6px] border border-[#E5E2DC] bg-[#F8F7F4] p-2 text-[11px] text-[#57534E]">
          {visible.map((t, i) => (
            <div key={i} className="break-all">
              <span className="font-medium text-[#141413]">
                {TOOL_LABELS[t.name] || t.name}
              </span>
              {Object.keys(t.args).length > 0 && (
                <span className="ml-1 font-mono text-[10px] text-[#8A847C]">
                  {JSON.stringify(t.args)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const renderInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[#141413]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-[#E5E2DC]/70 px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const FormattedAssistantText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyBase: number) => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${keyBase}`} className="my-1.5 list-disc space-y-1 pl-4">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (headingMatch) {
      flushList(idx);
      blocks.push(
        <div key={`h-${idx}`} className="pt-2 pb-0.5 text-xs sm:text-sm font-semibold text-[#141413]">
          {renderInline(headingMatch[1])}
        </div>
      );
      return;
    }

    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      const isSectionLead = /^\*\*[^*]+:\*\*$/.test(content);
      if (isSectionLead) {
        flushList(idx);
        blocks.push(
          <div key={`sec-${idx}`} className="pt-2.5 pb-0.5 text-xs font-semibold text-[#141413]">
            {content.slice(2, -2)}
          </div>
        );
        return;
      }
      listItems.push(content);
      return;
    }

    flushList(idx);
    if (!line.trim()) {
      blocks.push(<div key={`sp-${idx}`} className="h-1.5" />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList(lines.length);

  return <div className="space-y-0.5">{blocks}</div>;
};

const ProposalCard: React.FC<{
  proposal: PendingProposal;
  onConfirm: () => void;
  onReject: () => void;
}> = ({ proposal, onConfirm, onReject }) => {
  const desc =
    proposal.type === 'create_task'
      ? `Create task: “${proposal.title}”${proposal.campaign_name ? ` · ${proposal.campaign_name}` : ''}${proposal.owner ? ` · ${proposal.owner}` : ''}${proposal.due ? ` · due ${proposal.due}` : ''}`
      : proposal.type === 'update_task_status'
        ? `Set task ${proposal.task_id} → ${proposal.status}`
        : `Update ${proposal.campaign_name || proposal.campaign}: ${[
            proposal.status && `status ${proposal.status}`,
            proposal.budget != null && `budget ₹${proposal.budget}`,
            proposal.owner && `owner ${proposal.owner}`,
          ]
            .filter(Boolean)
            .join(', ')}`;

  return (
    <div className="mt-2 rounded-[8px] border border-[#CCFBF1] bg-[#F0FDFA] p-3 text-xs text-[#141413]">
      <div className="flex items-start gap-1.5 font-semibold">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
        <span>Proposed action: {desc}</span>
      </div>
      {proposal.rationale && <div className="mt-1 text-[#57534E]">Why: {proposal.rationale}</div>}
      {proposal.resolution ? (
        <div className="mt-2 flex items-center gap-1.5 font-medium">
          {proposal.resolution === 'confirmed' ? (
            <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
          ) : (
            <XCircle className="h-4 w-4 text-[#B91C1C]" />
          )}
          <span>{proposal.resolutionMessage}</span>
        </div>
      ) : (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`${btnPrimary} min-h-8 px-3 py-1 text-xs`}
          >
            <Check className="h-3.5 w-3.5" /> Confirm
          </button>
          <button
            type="button"
            onClick={onReject}
            className={`${btnSecondary} min-h-8 px-3 py-1 text-xs`}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export const ChatPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}> = ({ open, onClose, onOpenSettings }) => {
  const { state, applyProposal } = useGrowthStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_LS_KEY);
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [proposals, setProposals] = useState<Record<string, PendingProposal>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveTraces, setLiveTraces] = useState<ToolTraceItem[]>([]);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<{
    message: string;
    retryable: boolean;
    needsSettings: boolean;
  } | null>(null);
  const [claudeFn, setClaudeFn] = useState<Awaited<
    ReturnType<NonNullable<ClaudeSampleWindow['claude']>['use']>
  > | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const w = window as ClaudeSampleWindow;
    if (w.claude?.use) {
      w.claude
        .use('sample')
        .then((fn) => setClaudeFn(() => fn))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_LS_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveTraces, busy, open]);

  const handleSend = async (overrideText?: string, isRetry = false) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;

    setErrorBanner(null);
    setLastUserPrompt(text);

    const nextHist = isRetry
      ? messages
      : [
          ...messages,
          {
            id: `U${Date.now()}`,
            role: 'user' as const,
            text,
          },
        ].slice(-20);

    if (!isRetry) {
      setMessages(nextHist);
      if (!overrideText) setInput('');
    }
    setBusy(true);
    setLiveTraces([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const result = await runAnalystTurn({
        history: nextHist.slice(-6),
        state,
        claudeSampleFn: claudeFn,
        signal: ctrl.signal,
        onTrace: (t) => setLiveTraces((prev) => [...prev, t]),
      });

      if (result.proposals.length) {
        setProposals((prev) => {
          const copy = { ...prev };
          result.proposals.forEach((p) => {
            copy[p.id] = p;
          });
          return copy;
        });
      }

      setMessages((prev) => [
        ...prev.slice(-19),
        {
          id: `A${Date.now()}`,
          role: 'assistant',
          text: result.text || '(no answer)',
          traces: result.traces,
          proposalIds: result.proposals.map((p) => p.id),
        },
      ]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setErrorBanner({ message: 'Request stopped.', retryable: true, needsSettings: false });
      } else if (err instanceof AnalystApiError) {
        setErrorBanner({
          message: err.message,
          retryable: err.retryable,
          needsSettings: err.needsSettings,
        });
      } else {
        setErrorBanner({
          message: (err as Error).message || 'Unexpected error contacting AI.',
          retryable: true,
          needsSettings: false,
        });
      }
    } finally {
      setBusy(false);
      setLiveTraces([]);
      abortRef.current = null;
    }
  };

  const handleConfirm = (id: string) => {
    const p = proposals[id];
    if (!p || p.resolution) return;
    const res = applyProposal(p);
    setProposals((prev) => ({
      ...prev,
      [id]: { ...p, resolution: 'confirmed', resolutionMessage: res },
    }));
    setMessages((prev) => [
      ...prev.slice(-19),
      { id: `S${Date.now()}`, role: 'user', text: `[System: user CONFIRMED proposal. Result: ${res}]` },
    ]);
  };

  const handleReject = (id: string) => {
    const p = proposals[id];
    if (!p || p.resolution) return;
    setProposals((prev) => ({
      ...prev,
      [id]: { ...p, resolution: 'rejected', resolutionMessage: 'Rejected — nothing changed.' },
    }));
    setMessages((prev) => [
      ...prev.slice(-19),
      {
        id: `S${Date.now()}`,
        role: 'user',
        text: '[System: user REJECTED the proposed action; nothing changed.]',
      },
    ]);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-[#141413]/30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="AI Growth Analyst"
        className="fixed inset-0 z-40 flex h-dvh w-full flex-col bg-white md:inset-y-0 md:left-auto md:right-0 md:w-[400px] md:border-l md:border-[#E5E2DC] lg:sticky lg:top-[89px] lg:z-10 lg:h-[calc(100dvh-89px)] lg:shrink-0"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[#E5E2DC] px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#141413]">
              <Bot className="h-4 w-4 text-[#0F766E]" />
              <span>AI Growth Analyst</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#57534E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" aria-hidden="true" />
              <span>Connected to live workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSettings}
              title="AI connection settings"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#57534E] hover:bg-[#F1EFEA] hover:text-[#141413] cursor-pointer"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setProposals({});
              }}
              title="Clear conversation"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#57534E] hover:bg-[#F1EFEA] hover:text-[#141413] cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close analyst"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#57534E] hover:bg-[#F1EFEA] hover:text-[#141413] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages & Empty State Starter Cards */}
        <div ref={scrollRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
          {!messages.length && (
            <div className="space-y-3">
              <p className="rounded-[8px] border border-[#E5E2DC] bg-[#F8F7F4] p-3 text-xs leading-relaxed text-[#57534E]">
                Query live campaign metrics, diagnose funnel drop-offs, or simulate budget
                reallocations.
              </p>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold tracking-[0.05em] text-[#8A847C] uppercase">
                  Suggested questions
                </div>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={busy}
                    className="flex w-full items-center justify-between gap-2 rounded-[6px] border border-[#E5E2DC] bg-white px-3 py-2 text-left text-xs font-medium text-[#141413] hover:border-[#0F766E] hover:bg-[#F0FDFA] disabled:opacity-50 cursor-pointer"
                  >
                    <span className="leading-snug">{prompt}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#8A847C]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {m.role === 'assistant' && m.traces && m.traces.length > 0 && (
                <ToolTracePills traces={m.traces} />
              )}
              <div
                className={`max-w-[92%] break-words rounded-[8px] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'whitespace-pre-wrap bg-[#0F766E] text-white'
                    : m.isError
                      ? 'whitespace-pre-wrap border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                      : 'border border-[#E5E2DC] bg-[#F1EFEA] text-[#141413]'
                }`}
              >
                {m.role === 'assistant' && !m.isError ? (
                  <FormattedAssistantText text={m.text} />
                ) : (
                  m.text
                )}
              </div>
              {m.proposalIds?.map((pid) => {
                const p = proposals[pid];
                if (!p) return null;
                return (
                  <div key={pid} className="w-full max-w-[92%]">
                    <ProposalCard
                      proposal={p}
                      onConfirm={() => handleConfirm(pid)}
                      onReject={() => handleReject(pid)}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {busy && (
            <div className="flex flex-col items-start">
              {liveTraces.some((t) => t.name !== 'calculate') && (
                <ToolTracePills traces={liveTraces} />
              )}
              <div className="rounded-[8px] border border-[#E5E2DC] bg-[#F1EFEA] px-3.5 py-2 text-xs text-[#57534E]">
                {(() => {
                  const last = [...liveTraces].reverse().find((t) => t.name !== 'calculate');
                  return last ? `${TOOL_LABELS[last.name] || last.name}…` : 'Thinking…';
                })()}
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#141413]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
                <div className="flex-1 leading-relaxed text-[#57534E]">{errorBanner.message}</div>
              </div>
              {(errorBanner.retryable || errorBanner.needsSettings) && (
                <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
                  {errorBanner.retryable && lastUserPrompt && (
                    <button
                      type="button"
                      onClick={() => handleSend(lastUserPrompt, true)}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  )}
                  {errorBanner.needsSettings && (
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      <Settings2 className="h-3 w-3" /> Open AI settings
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="border-t border-[#E5E2DC] bg-white p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Ask about campaigns, funnel, budget, or tasks…"
              className="w-full resize-none rounded-[6px] border border-[#D1CDC4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#141413] placeholder:text-[#8A847C] focus:border-[#0F766E] focus:bg-white focus:outline-none"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                title="Stop"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                title="Send"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-[#8A847C]">
            Grounded in live workspace records. State changes require confirmation.
          </div>
        </div>
      </aside>
    </>
  );
};
