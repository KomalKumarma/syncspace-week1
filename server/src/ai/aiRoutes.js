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

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiResult = await askGemini({ apiKey: geminiKey, prompt, code, roomId, mode });
    if (geminiResult.ok) {
      response.json({
        answer: geminiResult.answer,
        source: 'gemini'
      });
      return;
    }

    response.json({
      answer: createLocalAssistantAnswer({
        prompt,
        code,
        roomId,
        mode,
        reason: geminiResult.error
      }),
      source: 'local-fallback',
      providerError: geminiResult.error
    });
    return;
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    response.json({
      answer: createLocalAssistantAnswer({ prompt, code, roomId, mode, reason: 'Gemini/OpenAI key is not configured.' }),
      source: 'local-fallback'
    });
    return;
  }

  const result = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
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
    answer: data.choices?.[0]?.message?.content || 'No answer returned.',
    source: 'openai'
  });
}));

async function askGemini({ apiKey, prompt, code, roomId, mode }) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const systemText =
    'You are SyncSpace AI, a concise engineering assistant for collaborative whiteboard and code sessions. Help explain code, find bugs, optimize, generate tests, explain errors, and analyze architecture.';

  const result = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemText }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: JSON.stringify({ mode, roomId, prompt, code })
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1200
      }
    })
  });

  if (!result.ok) {
    const details = await result.json().catch(async () => ({ error: { message: await result.text() } }));
    return {
      ok: false,
      error: details.error?.message || 'Gemini provider request failed.'
    };
  }

  const data = await result.json();
  return {
    ok: true,
    answer: data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || 'No answer returned.'
  };
}

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
