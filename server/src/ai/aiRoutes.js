import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler, HttpError } from '../shared/httpError.js';

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post('/assistant', asyncHandler(async (request, response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, 'SyncSpace AI is not configured. Add OPENAI_API_KEY on the backend.');
  }

  const { prompt, code, roomId, mode = 'explain' } = request.body;
  if (!prompt && !code) {
    throw new HttpError(400, 'Prompt or code context is required.');
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
    throw new HttpError(
      502,
      details.error?.message || 'AI provider request failed.',
      details
    );
  }

  const data = await result.json();
  response.json({
    answer: data.choices?.[0]?.message?.content || 'No answer returned.'
  });
}));
