import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler, HttpError } from '../shared/httpError.js';

const runtimeByLanguage = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' }
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

  const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ content: code }]
    })
  });

  if (!result.ok) {
    const details = await result.text();
    throw new HttpError(502, 'Execution provider request failed.', details);
  }

  response.json(await result.json());
}));
