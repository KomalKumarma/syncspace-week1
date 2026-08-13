import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler, HttpError } from '../shared/httpError.js';

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post('/assistant', asyncHandler(async (request, response) => {
  const { prompt, code, roomId, mode = 'explain' } = request.body;
  if (!prompt && !code) {
    throw new HttpError(400, 'Prompt or code context is required.');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.json({
      answer: createLocalAssistantAnswer({ prompt, code, roomId, mode, reason: 'OpenAI key is not configured.' }),
      source: 'local-fallback'
    });
    return;
  }

  const result = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are SyncSpace AI, a concise engineering assistant for collaborative whiteboard and code sessions. Help explain code, find bugs, optimize, generate tests, explain errors, and analyze architecture.'
        },
        {
          role: 'user',
          content: JSON.stringify({ mode, roomId, prompt, code })
        }
      ],
      temperature: 0.2
    })
  });

  if (!result.ok) {
    const details = await result.json().catch(async () => ({ error: { message: await result.text() } }));
    response.json({
      answer: createLocalAssistantAnswer({
        prompt,
        code,
        roomId,
        mode,
        reason: details.error?.message || 'AI provider request failed.'
      }),
      source: 'local-fallback',
      providerError: details.error?.message || 'AI provider request failed.'
    });
    return;
  }

  const data = await result.json();
  response.json({
    answer: data.choices?.[0]?.message?.content || 'No answer returned.'
  });
}));

function createLocalAssistantAnswer({ prompt, code, roomId, mode, reason }) {
  const codeLines = String(code || '').split('\n').filter(Boolean).length;
  const hasJsonParse = String(code || '').includes('JSON.parse');
  const hasTryCatch = /\btry\b/.test(String(code || '')) && /\bcatch\b/.test(String(code || ''));
  const roomText = roomId ? `Room context: ${roomId}.` : 'No room is currently joined.';

  const suggestions = [
    `${roomText}`,
    `Provider note: ${reason}`,
    `Mode: ${mode}. Prompt: ${prompt || 'Analyze current context.'}`,
    `Current code context has ${codeLines} non-empty line(s).`,
    hasJsonParse && !hasTryCatch
      ? 'Bug risk: JSON parsing is used without try/catch. Add error handling before production use.'
      : 'Error handling check: no obvious JSON parsing risk found in the visible code.',
    'Optimization: keep socket payloads small, validate roomId/user input on the backend, and debounce frequent cursor/code updates.',
    'Test idea: add tests for auth token validation, room join permissions, snapshot restore, and code execution error states.'
  ];

  return suggestions.filter(Boolean).join('\n');
}
