import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchAvailableGeminiModels } from '../../ai/providers';
import { btnPrimary, btnSecondary, inputClass, ModalSheet } from '../ui/Primitives';
import { useGrowthStore } from '../../state/useGrowthStore';
import type { AIProvider } from '../../engine/types';

export const AISettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { state, setAIConfig } = useGrowthStore();
  const [provider, setProvider] = useState<AIProvider>(state.ai.provider);
  const [key, setKey] = useState(state.ai.key || '');
  const [model, setModel] = useState(state.ai.model || 'gemini-2.5-flash');
  const [baseUrl, setBaseUrl] = useState(state.ai.baseUrl || '');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const loadModels = async (force = false) => {
    setLoadingModels(true);
    const list = await fetchAvailableGeminiModels(
      { provider, key: key.trim(), model, baseUrl },
      force
    );
    setAvailableModels(list);
    setLoadingModels(false);
  };

  useEffect(() => {
    if (open && provider === 'gemini') {
      loadModels(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAIConfig({
      provider,
      key: key.trim(),
      model: model.trim() || 'gemini-2.5-flash',
      baseUrl: baseUrl.trim(),
    });
    onClose();
  };

  return (
    <ModalSheet open={open} onClose={onClose} title="AI analyst connection">
      <form onSubmit={handleSave} className="space-y-3">
        <p className="text-xs leading-relaxed text-[#57534E]">
          Leave the API key blank when using a server-configured deployment, or paste your own
          Gemini or OpenAI-compatible key to store it locally in this browser.
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className={`${inputClass} min-h-10 w-full`}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI-compatible (OpenAI, Groq, OpenRouter…)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#57534E]">API key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste API key…"
            className={`${inputClass} min-h-10 w-full`}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-[#57534E]">Model</label>
            {provider === 'gemini' && (
              <button
                type="button"
                onClick={() => loadModels(true)}
                disabled={loadingModels}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F766E] hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingModels ? 'animate-spin' : ''}`} />
                <span>{loadingModels ? 'Fetching…' : 'Refresh models'}</span>
              </button>
            )}
          </div>
          <input
            type="text"
            list="gemini-models-list"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`${inputClass} min-h-10 w-full`}
          />
          {provider === 'gemini' && availableModels.length > 0 && (
            <datalist id="gemini-models-list">
              {availableModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          )}
          {provider === 'gemini' && availableModels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {availableModels
                .filter((m) => m.includes('flash'))
                .slice(0, 5)
                .map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`rounded-[6px] border px-2 py-0.5 text-[11px] cursor-pointer ${
                      model === m
                        ? 'border-[#0F766E] bg-[#F0FDFA] font-medium text-[#0F766E]'
                        : 'border-[#E5E2DC] bg-[#F8F7F4] text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
            </div>
          )}
        </div>

        {provider === 'openai' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-[#57534E]">
              Base URL (OpenAI-compatible only)
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className={`${inputClass} min-h-10 w-full`}
            />
          </div>
        )}

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
