import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler, HttpError } from '../shared/httpError.js';

const runtimeByLanguage = {
  javascript: { language: 'javascript', aliases: ['javascript', 'node'] },
  python: { language: 'python', aliases: ['python', 'python3'] },
  cpp: { language: 'cpp', aliases: ['cpp', 'c++'] },
  go: { language: 'go', aliases: ['go', 'golang'] }
};

export const codeRouter = Router();

codeRouter.use(requireAuth);

codeRouter.post('/run', asyncHandler(async (request, response) => {
  const pistonUrl = process.env.PISTON_API_URL;
  if (!pistonUrl) {
    throw new HttpError(503, 'Code execution is not configured. Add PISTON_API_URL on the backend.');
  }

  const { language = 'javascript', code } = request.body;
  if (!code) {
    throw new HttpError(400, 'Code is required.');
  }

  const runtime = runtimeByLanguage[language];
  if (!runtime) {
    throw new HttpError(400, 'Unsupported language.');
  }

  const resolvedRuntime = await resolveRuntime(pistonUrl, runtime);
  if (!resolvedRuntime) {
    throw new HttpError(502, `No Piston runtime found for ${language}.`);
  }

  const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: resolvedRuntime.language,
      version: resolvedRuntime.version,
      files: [{ content: code }]
    })
  });

  if (!result.ok) {
    const details = await result.json().catch(async () => ({ message: await result.text() }));
    throw new HttpError(
      502,
      details.message || 'Execution provider request failed.',
      details
    );
  }

  response.json(await result.json());
}));

async function resolveRuntime(pistonUrl, runtime) {
  const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/runtimes`);
  if (!result.ok) return null;

  const runtimes = await result.json();
  return runtimes.find((item) =>
    runtime.aliases.includes(String(item.language).toLowerCase()) ||
    item.aliases?.some((alias) => runtime.aliases.includes(String(alias).toLowerCase()))
  );
}
