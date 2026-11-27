/**
 * Single-hosting serverless proxy for Vercel (deploy the whole repo to Vercel).
 * Set GEMINI_API_KEY (or OPENAI_API_KEY) in Vercel Project Settings → Environment Variables.
 * Your API key never leaves the server and is never bundled into the frontend.
 */
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return new Response(
      JSON.stringify({ error: 'Server proxy not configured (missing GEMINI_API_KEY / OPENAI_API_KEY).' }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload = (await req.json()) as {
      action?: 'models' | 'generate';
      provider?: 'gemini' | 'openai';
      model?: string;
      body?: unknown;
    };

    if (payload.action === 'models' && geminiKey) {
      const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
        method: 'GET',
        headers: { 'x-goog-api-key': geminiKey },
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ((payload.provider !== 'openai' && geminiKey) || !openaiKey) {
      const model = payload.model || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey!,
        },
        body: JSON.stringify(payload.body),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload.body),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
