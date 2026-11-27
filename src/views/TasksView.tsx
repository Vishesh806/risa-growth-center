import React, { useState } from 'react';
import { ArrowRight, Bot, Check, MoreHorizontal, Plus, RotateCcw } from 'lucide-react';
import { allCampaigns, campById, OWNERS } from '../engine/dataset';
import { addDays, fmtDate } from '../engine/format';
import { useGrowthStore } from '../state/useGrowthStore';
import {
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  ModalSheet,
} from '../components/ui/Primitives';
import type { TaskPriority, TaskStatus } from '../engine/types';

export const TasksView: React.FC = () => {
  const { state, snap, setTaskStatus, deleteTask, saveTask } = useGrowthStore();
  const [editingTaskId, setEditingTaskId] = useState<string | null | undefined>(undefined);
  const [mobileCol, setMobileCol] = useState<TaskStatus>('todo');
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);

  const groups: { key: TaskStatus; label: string }[] = [
    { key: 'todo', label: 'To do' },
    { key: 'doing', label: 'In progress' },
    { key: 'done', label: 'Done' },
  ];

  const campNameOf = (id: string) => (id ? campById(state, id)?.name || '' : '');

  const renderColumn = (g: { key: TaskStatus; label: string }) => {
    const items = state.tasks.filter((t) => t.status === g.key);
    return (
      <div key={g.key} className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2">
          <h4 className="text-[11px] font-semibold tracking-[0.05em] text-[#57534E] uppercase">
            {g.label}
          </h4>
          <span className="rounded-[6px] bg-[#F1EFEA] px-2 py-0.5 text-[11px] font-medium text-[#57534E] tabular-nums">
            {items.length}
          </span>
        </div>

        <div className="divide-y divide-[#E5E2DC] rounded-[8px] border border-[#E5E2DC] bg-[#F8F7F4]/60 px-3.5">
          {items.map((t) => {
            const overdue = Boolean(t.due && t.due < snap.as_of && t.status !== 'done');
            const campName = campNameOf(t.camp);
            const metaParts = [
              campName || null,
              t.owner,
              `${overdue ? 'Overdue ' : 'Due '}${t.due ? fmtDate(t.due).replace(/,\s*\d{4}$/, '') : '—'}`,
            ].filter(Boolean);

            return (
              <div key={t.id} className="py-3">
                <div className="text-sm font-semibold text-[#141413] leading-snug">{t.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#57534E]">
                  <span className={overdue ? 'text-[#B91C1C] font-medium' : ''}>
                    {metaParts.join(' · ')}
                  </span>
                  {t.source === 'ai' && (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F0FDFA] px-1.5 py-0.5 text-[11px] font-medium text-[#0F766E]">
                      <Bot className="h-3 w-3" /> AI
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  {g.key === 'todo' && (
                    <button
                      type="button"
                      onClick={() => setTaskStatus(t.id, 'doing')}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[#0F766E]/30 bg-[#F0FDFA] px-2.5 py-1 text-xs font-medium text-[#0F766E] hover:bg-[#CCFBF1]/60 cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {g.key === 'doing' && (
                    <button
                      type="button"
                      onClick={() => setTaskStatus(t.id, 'done')}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#15803D] hover:bg-[#DCFCE7] cursor-pointer"
                    >
                      <span>Complete</span>
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  {g.key === 'done' && (
                    <button
                      type="button"
                      onClick={() => setTaskStatus(t.id, 'todo')}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reopen</span>
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuTaskId((prev) => (prev === t.id ? null : t.id))}
                      aria-label="Task actions"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D1CDC4] bg-white text-[#57534E] hover:bg-[#F1EFEA] hover:text-[#141413] cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuTaskId === t.id && (
                      <div className="absolute right-0 bottom-8 z-20 w-32 rounded-[8px] border border-[#E5E2DC] bg-white py-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuTaskId(null);
                            setEditingTaskId(t.id);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-[#141413] hover:bg-[#F1EFEA] cursor-pointer"
                        >
                          Edit
                        </button>
                        {g.key === 'todo' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuTaskId(null);
                              setTaskStatus(t.id, 'done');
                            }}
                            className="block w-full px-3 py-1.5 text-left text-xs text-[#141413] hover:bg-[#F1EFEA] cursor-pointer"
                          >
                            Mark done
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuTaskId(null);
                            deleteTask(t.id);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!items.length && (
            <p className="py-6 text-center text-xs text-[#8A847C]">No tasks</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      title="Tasks & action items"
      action={
        <button type="button" onClick={() => setEditingTaskId(null)} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" /> New task
        </button>
      }
    >
      {/* Mobile status switcher */}
      <div className="mb-3 flex gap-1.5 md:hidden">
        {groups.map((g) => {
          const count = state.tasks.filter((t) => t.status === g.key).length;
          const active = mobileCol === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setMobileCol(g.key)}
              className={`min-h-9 flex-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                active
                  ? 'bg-[#0F766E] text-white'
                  : 'border border-[#D1CDC4] bg-white text-[#57534E]'
              }`}
            >
              {g.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="md:hidden">{renderColumn(groups.find((g) => g.key === mobileCol)!)}</div>

      <div className="hidden gap-4 md:grid md:grid-cols-3">{groups.map(renderColumn)}</div>

      {editingTaskId !== undefined && (
        <TaskFormModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(undefined)}
          onSave={(data) => {
            saveTask(editingTaskId, data);
            setEditingTaskId(undefined);
          }}
        />
      )}
    </Card>
  );
};

const TaskFormModal: React.FC<{
  taskId: string | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    camp: string;
    owner: string;
    due: string;
    priority: TaskPriority;
    status: TaskStatus;
  }) => void;
}> = ({ taskId, onClose, onSave }) => {
  const { state } = useGrowthStore();
  const existing = taskId ? state.tasks.find((t) => t.id === taskId) : null;
  const [title, setTitle] = useState(existing?.title || '');
  const [camp, setCamp] = useState(existing?.camp || '');
  const [owner, setOwner] = useState(existing?.owner || OWNERS[4]);
  const [due, setDue] = useState(existing?.due || addDays(state.asOf, 7));
  const [priority, setPriority] = useState<TaskPriority>(existing?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(existing?.status || 'todo');

  const camps = allCampaigns(state);
  const owners = [...new Set([...OWNERS, owner].filter(Boolean))];

  return (
    <ModalSheet open onClose={onClose} title={taskId ? 'Edit task' : 'New task'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({ title: title.trim(), camp, owner, due, priority, status });
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} min-h-10 w-full`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Campaign</label>
            <select
              value={camp}
              onChange={(e) => setCamp(e.target.value)}
              className={`${inputClass} min-h-10 w-full`}
            >
              <option value="">— none —</option>
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Owner</label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className={`${inputClass} min-h-10 w-full`}
            >
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Due</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={`${inputClass} min-h-10 w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={`${inputClass} min-h-10 w-full`}
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className={`${inputClass} min-h-10 w-full`}
            >
              <option value="todo">todo</option>
              <option value="doing">doing</option>
              <option value="done">done</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </form>
    </ModalSheet>
  );
};
