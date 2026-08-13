import { Router } from 'express';
import vm from 'node:vm';
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
  const { language = 'javascript', code } = request.body;
  if (!code) {
    throw new HttpError(400, 'Code is required.');
  }

  const runtime = runtimeByLanguage[language];
  if (!runtime) {
    throw new HttpError(400, 'Unsupported language.');
  }

  const pistonUrl = process.env.PISTON_API_URL;
  if (!pistonUrl) {
    response.json(createLocalExecutionResult({ language, code, reason: 'Piston is not configured.' }));
    return;
  }

  const resolvedRuntime = await resolveRuntime(pistonUrl, runtime);
  if (!resolvedRuntime) {
    response.json(createLocalExecutionResult({ language, code, reason: `No Piston runtime found for ${language}.` }));
    return;
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
    response.json(createLocalExecutionResult({
      language,
      code,
      reason: details.message || 'Execution provider request failed.'
    }));
    return;
  }

  response.json(await result.json());
}));

function createLocalExecutionResult({ language, code, reason }) {
  if (language !== 'javascript') {
    return {
      run: {
        output: `${reason}\nLocal fallback can execute JavaScript only. ${language.toUpperCase()} needs a hosted execution service.`,
        stderr: '',
        code: 0
      },
      source: 'local-fallback'
    };
  }

  const output = [];
  const sandbox = {
    console: {
      log: (...values) => output.push(values.map(String).join(' '))
    }
  };

  try {
    vm.runInNewContext(String(code), sandbox, {
      timeout: 1000,
      displayErrors: true
    });

    return {
      run: {
        output: output.join('\n') || `${reason}\nJavaScript ran locally with no console output.`,
        stderr: '',
        code: 0
      },
      source: 'local-fallback'
    };
  } catch (error) {
    return {
      run: {
        output: `${reason}\nLocal JavaScript error: ${error.message}`,
        stderr: error.stack,
        code: 1
      },
      source: 'local-fallback'
    };
  }
}

async function resolveRuntime(pistonUrl, runtime) {
  const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/runtimes`);
  if (!result.ok) return null;

  const runtimes = await result.json();
  return runtimes.find((item) =>
    runtime.aliases.includes(String(item.language).toLowerCase()) ||
    item.aliases?.some((alias) => runtime.aliases.includes(String(alias).toLowerCase()))
  );
}
