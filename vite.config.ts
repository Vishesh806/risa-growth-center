import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function localApiProxyPlugin(): Plugin {
  return {
    name: 'local-api-chat-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
        const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;

        if (!geminiKey && !openaiKey) {
          res.statusCode = 501;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Missing GEMINI_API_KEY or OPENAI_API_KEY in .env',
            })
          );
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            action?: 'models' | 'generate';
            provider?: 'gemini' | 'openai';
            model?: string;
            body?: unknown;
          };

          const t0 = Date.now();
          if (payload.action === 'models' && geminiKey) {
            const upstream = await fetch(
              'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',
              {
                method: 'GET',
                headers: { 'x-goog-api-key': geminiKey },
              }
            );
            console.log(`[Gemini API] GET /v1beta/models -> ${upstream.status} (${Date.now() - t0}ms)`);
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(await upstream.text());
            return;
          }

          if ((payload.provider !== 'openai' && geminiKey) || !openaiKey) {
            const model = payload.model || 'gemini-3.8-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
            const upstream = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey!,
              },
              body: JSON.stringify(payload.body),
            });
            console.log(`[Gemini API] POST ${model}:generateContent -> ${upstream.status} (${Date.now() - t0}ms)`);
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(await upstream.text());
            return;
          }

          const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify(payload.body),
          });
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(await upstream.text());
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error).message || 'Local proxy error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiProxyPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/seed.json')) return 'seed';
          if (id.includes('recharts')) return 'charts';
        },
      },
    },
  },
});
