import { httpServerHandler } from 'cloudflare:node';

interface WorkerEnv {
  HYPERDRIVE: { connectionString: string };
  ASSETS: { fetch(request: Request): Promise<Response> };
  AUTH_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  GEMINI_API_KEY?: string;
}

type WorkerExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };
type ExpressWorkerHandler = (request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) => Promise<Response>;
let handlerPromise: Promise<ExpressWorkerHandler> | undefined;

async function initializeApi(env: WorkerEnv): Promise<ExpressWorkerHandler> {
  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error('Cloudflare Hyperdrive binding HYPERDRIVE is missing.');
  }
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET is missing or too short. Configure it as a Cloudflare Worker secret (32+ characters).');
  }
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12) {
    throw new Error('Configure ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) as Worker secrets.');
  }

  // Inject Cloudflare secrets/bindings before importing modules that read process.env at startup.
  process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  process.env.AUTH_SECRET = env.AUTH_SECRET;
  process.env.ADMIN_EMAIL = env.ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  process.env.NODE_ENV = 'production';
  process.env.REQUIRE_DATABASE = 'true';
  process.env.CLOUDFLARE_WORKER = 'true';
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || '';

  const { app, dbManager } = await import('./server/app.ts');
  await dbManager.waitUntilInitialized();

  // Express is served through Cloudflare's supported Node HTTP compatibility adapter.
  app.listen(3000);
  return httpServerHandler({ port: 3000 });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      handlerPromise ??= initializeApi(env).catch((error) => {
        // Allow retry on the next request after a failed cold-start or temporary DB outage.
        handlerPromise = undefined;
        throw error;
      });
      const handler = await handlerPromise;
      return await handler(request, env, ctx);
    } catch (error) {
      console.error('Cloudflare API startup/request failure:', error);
      return Response.json(
        { error: 'Backend ឬ Neon Database មិនទាន់រួចរាល់។ សូមពិនិត្យ Cloudflare Worker Logs និង Hyperdrive configuration។' },
        { status: 503 },
      );
    }
  },
};
