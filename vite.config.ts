import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Serves api/gemini.ts at /api/gemini during `npm run dev` / `npm run preview`,
 * mirroring how Vercel runs it as a server function in production.
 */
function localApi(): Plugin {
  const mount = (server: { middlewares: any }, load: () => Promise<any>) => {
    server.middlewares.use('/api/gemini', async (req: any, res: any) => {
      try {
        const mod = await load();
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        });
        const handler = mod[req.method as string];
        const response: Response = handler
          ? await handler(request)
          : new Response('Method Not Allowed', { status: 405 });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Local API error' }));
      }
    });
  };

  return {
    name: 'soko-local-api',
    configureServer(server) {
      mount(server, () => server.ssrLoadModule('/api/gemini.ts'));
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local values available to the local API handler (server side only).
  // Nothing here is exposed to the browser bundle.
  const env = loadEnv(mode, '.', '');
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

  return {
    plugins: [react(), tailwindcss(), localApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via the DISABLE_HMR env var
      // (file watching is turned off there to prevent flickering during agent edits).
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
