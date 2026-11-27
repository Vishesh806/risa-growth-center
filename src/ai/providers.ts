import type { AIConfig, AppState, ChatMessage, PendingProposal, ToolTraceItem } from '../engine/types';
import { buildSystemPrompt } from './systemPrompt';
import { executeTool, TOOLS } from './tools';

export interface ClaudeSampleWindow extends Window {
  claude?: {
    use: (cap: string) => Promise<
      (
        input: string,
        opts: { tools: unknown[]; cache: boolean; modelTier: string }
      ) => Promise<{ text?: string }>
    >;
  };
}

export type ErrorKind =
  | 'rate_limit'
  | 'auth'
  | 'permission'
  | 'not_configured'
  | 'model_unavailable'
  | 'overloaded'
  | 'safety'
  | 'network'
  | 'unknown';

export class AnalystApiError extends Error {
  kind: ErrorKind;
  retryable: boolean;
  needsSettings: boolean;

  constructor(
    kind: ErrorKind,
    message: string,
    opts?: { retryable?: boolean; needsSettings?: boolean }
  ) {
    super(message);
    this.name = 'AnalystApiError';
    this.kind = kind;
    this.retryable = opts?.retryable ?? false;
    this.needsSettings = opts?.needsSettings ?? false;
  }
}

const MODELS_CACHE_KEY = 'campusfest_gemini_models_v1';
const MODELS_TTL_MS = 60 * 60 * 1000; // 1 hour

function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log('[AI Dev]', ...args);
  }
}

let geminiAuthMode: 'auto' | 'header' | 'query' = 'auto';
let workingGeminiModel: string | null = null;
let cachedModelsMemory: { at: number; models: string[] } | null = null;
let inflightModelsFetch: Promise<string[]> | null = null;

export interface AnalystTurnResult {
  text: string;
  traces: ToolTraceItem[];
  proposals: PendingProposal[];
}

function classifyHttpError(status: number, rawBody: string, providerLabel: string): AnalystApiError {
  const lower = rawBody.toLowerCase();

  if (status === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return new AnalystApiError(
      'rate_limit',
      `${providerLabel} rate limit reached. Too many requests in a short window — wait a few seconds and retry.`,
      { retryable: true }
    );
  }
  if (status === 401 || (status === 400 && (lower.includes('api_key') || lower.includes('api key')))) {
    return new AnalystApiError(
      'auth',
      `Your ${providerLabel} API key looks invalid or expired. Update it in AI settings.`,
      { needsSettings: true }
    );
  }
  if (status === 403 || lower.includes('permission_denied')) {
    return new AnalystApiError(
      'permission',
      `${providerLabel} blocked this request (key restriction or missing permission). Check referrer/API restrictions.`,
      { needsSettings: true }
    );
  }
  if (status === 404) {
    return new AnalystApiError(
      'model_unavailable',
      `Selected ${providerLabel} model was not found. Open AI settings to pick an available model.`,
      { needsSettings: true }
    );
  }
  if (status === 501) {
    return new AnalystApiError(
      'not_configured',
      'No AI key is configured yet. Add GEMINI_API_KEY in your hosting environment or paste a key in AI settings.',
      { needsSettings: true }
    );
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes('overloaded')
  ) {
    return new AnalystApiError(
      'overloaded',
      `${providerLabel} is temporarily busy. Please retry in a few seconds.`,
      { retryable: true }
    );
  }

  let detail = '';
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } };
    detail = parsed?.error?.message || '';
  } catch {
    detail = rawBody.slice(0, 140);
  }
  return new AnalystApiError(
    'unknown',
    detail
      ? `${providerLabel} could not complete the request: ${detail}`
      : `${providerLabel} returned an unexpected error (${status}).`,
    { retryable: true }
  );
}

function buildGeminiGenerationConfig(model: string) {
  const cfg: Record<string, unknown> = { temperature: 0.2, maxOutputTokens: 700 };
  if (model.includes('2.5')) {
    cfg.thinkingConfig = { thinkingBudget: 0 };
  }
  return cfg;
}

const PREFERRED_ORDER = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

function rankGeminiModels(available: string[], configuredModel?: string): string[] {
  const rank = (m: string) => {
    const idx = PREFERRED_ORDER.findIndex((p) => m === p || m.startsWith(p));
    if (idx >= 0) return idx;
    if (m.includes('flash')) return 50;
    return 100;
  };

  const usable = available.filter(
    (m) =>
      m.startsWith('gemini-') &&
      !m.includes('embedding') &&
      !m.includes('imagen') &&
      !m.includes('image') &&
      !m.includes('veo') &&
      !m.includes('tts') &&
      !m.includes('audio') &&
      !m.includes('robotics') &&
      !m.includes('transcribe') &&
      !m.includes('computer-use') &&
      !m.includes('deep-research')
  );

  const sorted = [...usable].sort((a, b) => rank(a) - rank(b));
  const list: string[] = [];
  if (workingGeminiModel && (!usable.length || usable.includes(workingGeminiModel))) {
    list.push(workingGeminiModel);
  }
  if (configuredModel && (!usable.length || usable.includes(configuredModel))) {
    list.push(configuredModel);
  }
  list.push(...sorted);

  if (!list.length) {
    list.push('gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest');
  }
  return [...new Set(list)];
}

export async function fetchAvailableGeminiModels(
  ai: AIConfig,
  forceRefresh = false
): Promise<string[]> {
  if (!forceRefresh) {
    if (cachedModelsMemory && Date.now() - cachedModelsMemory.at < MODELS_TTL_MS) {
      return cachedModelsMemory.models;
    }
    try {
      const raw = localStorage.getItem(MODELS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; models: string[] };
        if (parsed.models?.length && Date.now() - parsed.at < MODELS_TTL_MS) {
          cachedModelsMemory = parsed;
          return parsed.models;
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  if (inflightModelsFetch && !forceRefresh) return inflightModelsFetch;

  inflightModelsFetch = (async () => {
    try {
      let res: Response;
      if (ai.key?.trim()) {
        res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',
          {
            method: 'GET',
            headers: { 'x-goog-api-key': ai.key.trim() },
          }
        );
        if (!res.ok && (res.status === 401 || res.status === 400)) {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(ai.key.trim())}`
          );
        }
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'models', provider: 'gemini' }),
        });
      }

      if (!res.ok) return [];
      const data = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      const models = (data.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name || '').replace(/^models\//, ''))
        .filter(Boolean);

      if (models.length) {
        const entry = { at: Date.now(), models };
        cachedModelsMemory = entry;
        try {
          localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(entry));
        } catch {
          // ignore
        }
      }
      return models;
    } catch {
      return [];
    } finally {
      inflightModelsFetch = null;
    }
  })();

  return inflightModelsFetch;
}

export async function runAnalystTurn(params: {
  history: Pick<ChatMessage, 'role' | 'text'>[];
  state: AppState;
  claudeSampleFn: Awaited<ReturnType<NonNullable<ClaudeSampleWindow['claude']>['use']>> | null;
  signal?: AbortSignal;
  onTrace?: (trace: ToolTraceItem) => void;
}): Promise<AnalystTurnResult> {
  const { history, state, claudeSampleFn, signal, onTrace } = params;
  const traces: ToolTraceItem[] = [];
  const proposals: PendingProposal[] = [];

  const runTool = (name: string, args: Record<string, unknown> | undefined) => {
    const trace: ToolTraceItem = { name, args: args || {} };
    traces.push(trace);
    onTrace?.(trace);
    return executeTool(name, args, state, (p) => proposals.push(p));
  };

  const activeProvider = resolveProvider(state.ai, claudeSampleFn);
  const sys = buildSystemPrompt(state);

  try {
    if (!activeProvider) {
      const text = await callGeminiProxy(history, state.ai, sys, runTool, signal);
      return { text, traces, proposals };
    }
    if (activeProvider === 'gemini') {
      const text = await callGemini(history, state.ai, sys, runTool, signal);
      return { text, traces, proposals };
    }
    if (activeProvider === 'openai') {
      const text = await callOpenAI(history, state.ai, sys, runTool, signal);
      return { text, traces, proposals };
    }
    if (claudeSampleFn) {
      const text = await callClaude(history, sys, claudeSampleFn, runTool);
      return { text, traces, proposals };
    }
  } catch (err) {
    if (err instanceof AnalystApiError) throw err;
    if ((err as Error).name === 'AbortError') throw err;
    const msg = (err as Error).message || '';
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
      throw new AnalystApiError('network', 'Network error — check your connection and try again.', {
        retryable: true,
      });
    }
    throw new AnalystApiError('unknown', msg || 'Something went wrong while contacting the AI.', {
      retryable: true,
    });
  }

  throw new AnalystApiError('not_configured', 'No AI provider available.', { needsSettings: true });
}

export function resolveProvider(
  ai: AIConfig,
  claudeSampleFn: unknown | null
): 'gemini' | 'openai' | 'claude' | null {
  if (ai.key?.trim() && (ai.provider === 'gemini' || ai.provider === 'openai')) {
    return ai.provider;
  }
  if (claudeSampleFn) return 'claude';
  return null;
}

async function parseGeminiStep(
  res: Response,
  contents: unknown[],
  runTool: (name: string, args: Record<string, unknown> | undefined) => unknown
): Promise<{ done: true; text: string } | { done: false }> {
  const j = (await res.json()) as {
    candidates?: {
      finishReason?: string;
      content?: {
        parts?: { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }[];
      };
    }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };

  if (j.usageMetadata) {
    devLog(
      `tokens prompt=${j.usageMetadata.promptTokenCount ?? '?'} output=${j.usageMetadata.candidatesTokenCount ?? '?'} total=${j.usageMetadata.totalTokenCount ?? '?'}`
    );
  }

  if (j.promptFeedback?.blockReason) {
    throw new AnalystApiError(
      'safety',
      'The request was blocked by safety filters. Try rephrasing your question.'
    );
  }

  const cand = j.candidates?.[0];
  if (!cand?.content) {
    if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'RECITATION') {
      throw new AnalystApiError(
        'safety',
        'Response was filtered by Gemini safety rules. Try rephrasing your question.'
      );
    }
    throw new AnalystApiError('unknown', 'Gemini returned an empty response. Please retry.', {
      retryable: true,
    });
  }

  contents.push(cand.content);
  const parts = cand.content.parts || [];
  const calls = parts.filter((p) => p.functionCall);
  if (!calls.length) {
    const text = parts.map((p) => p.text || '').join('').trim();
    if (!text) {
      throw new AnalystApiError('unknown', 'Model returned an empty response. Retrying with fallback.', {
        retryable: true,
      });
    }
    return { done: true, text };
  }

  const out = calls.map((c) => ({
    functionResponse: {
      name: c.functionCall!.name,
      response: { result: runTool(c.functionCall!.name, c.functionCall!.args) },
    },
  }));
  contents.push({ role: 'user', parts: out });
  return { done: false };
}

async function callGeminiProxy(
  hist: Pick<ChatMessage, 'role' | 'text'>[],
  ai: AIConfig,
  sys: string,
  runTool: (name: string, args: Record<string, unknown> | undefined) => unknown,
  signal?: AbortSignal
): Promise<string> {
  const decls = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  const contents: unknown[] = hist.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const available = await fetchAvailableGeminiModels(ai);
  const models = rankGeminiModels(available, ai.model);
  let mi = 0;

  for (let step = 0; step < 8; step++) {
    let res: Response;
    while (true) {
      const model = models[mi];
      const geminiBody = {
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        tools: [{ functionDeclarations: decls }],
        generationConfig: buildGeminiGenerationConfig(model),
      };
      const t0 = performance.now();
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', model, body: geminiBody }),
        signal,
      });
      devLog(`proxy step=${step + 1} model=${model} status=${res.status} (${Math.round(performance.now() - t0)}ms)`);
      if (
        (res.status === 404 || res.status === 400 || res.status === 503 || res.status === 429) &&
        mi < models.length - 1
      ) {
        mi++;
        continue;
      }
      if (res.ok) {
        workingGeminiModel = model;
      }
      break;
    }

    if (!res.ok) {
      throw classifyHttpError(res.status, await res.text(), 'Gemini');
    }

    try {
      const parsed = await parseGeminiStep(res, contents, runTool);
      if (parsed.done) return parsed.text;
    } catch (err) {
      if (err instanceof AnalystApiError && err.kind === 'unknown' && mi < models.length - 1) {
        mi++;
        continue;
      }
      throw err;
    }
  }

  return 'Stopped after reaching the maximum tool steps.';
}

async function callGemini(
  hist: Pick<ChatMessage, 'role' | 'text'>[],
  ai: AIConfig,
  sys: string,
  runTool: (name: string, args: Record<string, unknown> | undefined) => unknown,
  signal?: AbortSignal
): Promise<string> {
  const decls = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  const contents: unknown[] = hist.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const available = await fetchAvailableGeminiModels(ai);
  const models = rankGeminiModels(available, ai.model);
  let mi = 0;

  for (let step = 0; step < 8; step++) {
    let res: Response | undefined;
    while (true) {
      const model = models[mi];
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        tools: [{ functionDeclarations: decls }],
        generationConfig: buildGeminiGenerationConfig(model),
      });
      const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const t0 = performance.now();
      if (geminiAuthMode !== 'query') {
        res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.key.trim() },
          body,
          signal,
        });
      }
      if (
        geminiAuthMode === 'query' ||
        (res && !res.ok && (res.status === 401 || res.status === 400) && geminiAuthMode === 'auto')
      ) {
        const r2 = await fetch(base + '?key=' + encodeURIComponent(ai.key.trim()), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
        });
        if (r2.ok) {
          geminiAuthMode = 'query';
          res = r2;
        } else if (geminiAuthMode === 'query') {
          res = r2;
        }
      } else if (res?.ok) {
        geminiAuthMode = 'header';
      }
      devLog(`direct step=${step + 1} model=${model} status=${res?.status} (${Math.round(performance.now() - t0)}ms)`);

      if (
        res &&
        (res.status === 404 || res.status === 503 || res.status === 429) &&
        mi < models.length - 1
      ) {
        mi++;
        continue;
      }
      if (res?.ok) {
        workingGeminiModel = model;
      }
      break;
    }

    if (!res || !res.ok) {
      throw classifyHttpError(res?.status ?? 0, res ? await res.text() : '', 'Gemini');
    }

    try {
      const parsed = await parseGeminiStep(res, contents, runTool);
      if (parsed.done) return parsed.text;
    } catch (err) {
      if (err instanceof AnalystApiError && err.kind === 'unknown' && mi < models.length - 1) {
        mi++;
        continue;
      }
      throw err;
    }
  }

  return 'Stopped after reaching the maximum tool steps.';
}

async function callOpenAI(
  hist: Pick<ChatMessage, 'role' | 'text'>[],
  ai: AIConfig,
  sys: string,
  runTool: (name: string, args: Record<string, unknown> | undefined) => unknown,
  signal?: AbortSignal
): Promise<string> {
  const tools = TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
  const msgs: unknown[] = [
    { role: 'system', content: sys },
    ...hist.map((m) => ({ role: m.role, content: m.text })),
  ];
  const url = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions';

  for (let step = 0; step < 8; step++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ai.key },
      body: JSON.stringify({ model: ai.model, messages: msgs, tools, temperature: 0.2 }),
      signal,
    });
    if (!res.ok) throw classifyHttpError(res.status, await res.text(), 'AI API');
    const j = (await res.json()) as {
      choices: {
        message: {
          content?: string;
          tool_calls?: { id: string; function: { name: string; arguments?: string } }[];
        };
      }[];
    };
    const m = j.choices[0].message;
    msgs.push(m);
    if (!m.tool_calls?.length) return (m.content || '').trim();
    for (const tc of m.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        // ignore parse error
      }
      msgs.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(runTool(tc.function.name, args)),
      });
    }
  }
  return 'Stopped after reaching the maximum tool steps.';
}

async function callClaude(
  hist: Pick<ChatMessage, 'role' | 'text'>[],
  sys: string,
  sampleFn: NonNullable<Awaited<ReturnType<NonNullable<ClaudeSampleWindow['claude']>['use']>>>,
  runTool: (name: string, args: Record<string, unknown> | undefined) => unknown
): Promise<string> {
  const transcript = hist
    .slice(0, -1)
    .map((m) => (m.role === 'user' ? 'USER: ' : 'ASSISTANT: ') + m.text)
    .join('\n\n');
  const input =
    sys +
    (transcript ? '\n\nCONVERSATION SO FAR:\n' + transcript : '') +
    '\n\nUSER (answer this, using tools): ' +
    hist[hist.length - 1].text;
  const tools = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.parameters,
    execute: async (args: Record<string, unknown>) => runTool(t.name, args),
  }));
  const r = await sampleFn(input, { tools, cache: false, modelTier: 'default' });
  return (r.text || '').trim();
}
