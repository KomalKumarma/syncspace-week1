import { Router } from 'express';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler, HttpError } from '../shared/httpError.js';

const execFileAsync = promisify(execFile);

const runtimeByLanguage = {
  javascript: { language: 'javascript', aliases: ['javascript', 'node'] },
  python: { language: 'python', aliases: ['python', 'python3'] },
  java: { language: 'java', aliases: ['java'] },
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
    const localResult = await createLocalExecutionResult({ language, code, reason: 'Piston is not configured.' });
    response.json(localResult);
    return;
  }

  let resolvedRuntime = null;
  try {
    resolvedRuntime = await resolveRuntime(pistonUrl, runtime);
  } catch (err) {
    const localResult = await createLocalExecutionResult({
      language,
      code,
      reason: `Hosted execution service timeout (${err.message}).`
    });
    response.json(localResult);
    return;
  }

  if (!resolvedRuntime) {
    const localResult = await createLocalExecutionResult({
      language,
      code,
      reason: `No hosted runtime found for ${language}.`
    });
    response.json(localResult);
    return;
  }

  try {
    const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2500),
      body: JSON.stringify({
        language: resolvedRuntime.language,
        version: resolvedRuntime.version,
        files: [{ content: code }]
      })
    });

    if (!result.ok) {
      const details = await result.json().catch(async () => ({ message: await result.text() }));
      const localResult = await createLocalExecutionResult({
        language,
        code,
        reason: details.message || 'Hosted execution service request failed.'
      });
      response.json(localResult);
      return;
    }

    response.json(await result.json());
  } catch (err) {
    const localResult = await createLocalExecutionResult({
      language,
      code,
      reason: `Hosted execution service connection failed (${err.message}).`
    });
    response.json(localResult);
  }
}));

async function createLocalExecutionResult({ language, code, reason }) {
  if (language === 'javascript') {
    const output = [];
    const sandbox = {
      console: {
        log: (...values) => output.push(values.map((v) => (typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))).join(' '))
      }
    };

    try {
      vm.runInNewContext(String(code), sandbox, {
        timeout: 2000,
        displayErrors: true
      });

      return {
        run: {
          output: output.join('\n') || 'JavaScript executed successfully with no console output.',
          stderr: '',
          code: 0
        },
        source: 'local-js'
      };
    } catch (error) {
      return {
        run: {
          output: error.message,
          stderr: error.stack,
          code: 1
        },
        source: 'local-js'
      };
    }
  }

  if (language === 'python') {
    const pythonCmds = ['python', 'py', 'python3'];
    for (const cmd of pythonCmds) {
      try {
        const { stdout, stderr } = await execFileAsync(cmd, ['-c', code], {
          timeout: 4000,
          maxBuffer: 1024 * 512
        });

        return {
          run: {
            output: stdout || stderr || 'Python executed successfully with no console output.',
            stderr: stderr || '',
            code: 0
          },
          source: 'local-python'
        };
      } catch (err) {
        if (err.stdout !== undefined || err.stderr !== undefined) {
          return {
            run: {
              output: err.stdout || err.stderr || err.message,
              stderr: err.stderr || '',
              code: err.code || 1
            },
            source: 'local-python'
          };
        }
      }
    }
  }

  if (language === 'java') {
    const tempDir = os.tmpdir();
    const javaDir = path.join(tempDir, `java_${Date.now()}`);
    const sourceFile = path.join(javaDir, 'Main.java');

    const javaCmds = [
      'java',
      'C:\\Program Files\\Java\\jdk-23\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe'
    ];

    try {
      await fs.mkdir(javaDir, { recursive: true });
      await fs.writeFile(sourceFile, code, 'utf-8');

      for (const cmd of javaCmds) {
        try {
          const { stdout, stderr } = await execFileAsync(cmd, [sourceFile], {
            timeout: 6000,
            maxBuffer: 1024 * 512
          });

          await fs.rm(javaDir, { recursive: true, force: true }).catch(() => {});
          return {
            run: {
              output: stdout || stderr || 'Java executed successfully with no console output.',
              stderr: stderr || '',
              code: 0
            },
            source: 'local-java'
          };
        } catch (err) {
          if (err.stdout !== undefined || err.stderr !== undefined) {
            await fs.rm(javaDir, { recursive: true, force: true }).catch(() => {});
            return {
              run: {
                output: err.stdout || err.stderr || err.message,
                stderr: err.stderr || '',
                code: err.code || 1
              },
              source: 'local-java'
            };
          }
        }
      }
      await fs.rm(javaDir, { recursive: true, force: true }).catch(() => {});
    } catch (err) {
      await fs.rm(javaDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  if (language === 'cpp') {
    const tempDir = os.tmpdir();
    const uniqueId = Date.now();
    const sourceFile = path.join(tempDir, `temp_${uniqueId}.cpp`);
    const exeFile = path.join(tempDir, `temp_${uniqueId}.exe`);

    try {
      await fs.writeFile(sourceFile, code, 'utf-8');
      await execFileAsync('g++', [sourceFile, '-o', exeFile], { timeout: 5000 });
      const { stdout, stderr } = await execFileAsync(exeFile, [], { timeout: 3000 });
      await fs.unlink(sourceFile).catch(() => {});
      await fs.unlink(exeFile).catch(() => {});
      return {
        run: { output: stdout || stderr || 'C++ executed successfully.', stderr: stderr || '', code: 0 },
        source: 'local-cpp'
      };
    } catch (err) {
      await fs.unlink(sourceFile).catch(() => {});
      await fs.unlink(exeFile).catch(() => {});
      if (err.stdout !== undefined || err.stderr !== undefined) {
        return {
          run: { output: err.stdout || err.stderr || err.message, stderr: err.stderr || '', code: 1 },
          source: 'local-cpp'
        };
      }
    }
  }

  if (language === 'go') {
    const tempDir = os.tmpdir();
    const sourceFile = path.join(tempDir, `main_${Date.now()}.go`);
    try {
      await fs.writeFile(sourceFile, code, 'utf-8');
      const { stdout, stderr } = await execFileAsync('go', ['run', sourceFile], { timeout: 5000 });
      await fs.unlink(sourceFile).catch(() => {});
      return {
        run: { output: stdout || stderr || 'Go executed successfully.', stderr: stderr || '', code: 0 },
        source: 'local-go'
      };
    } catch (err) {
      await fs.unlink(sourceFile).catch(() => {});
      if (err.stdout !== undefined || err.stderr !== undefined) {
        return {
          run: { output: err.stdout || err.stderr || err.message, stderr: err.stderr || '', code: 1 },
          source: 'local-go'
        };
      }
    }
  }

  return {
    run: {
      output: `${reason || 'Hosted execution service timed out.'}\nNote: Local ${language.toUpperCase()} interpreter/compiler was not detected on this server host.`,
      stderr: '',
      code: 0
    },
    source: 'local-fallback'
  };
}

async function resolveRuntime(pistonUrl, runtime) {
  const result = await fetch(`${pistonUrl.replace(/\/$/, '')}/runtimes`, {
    signal: AbortSignal.timeout(2000)
  });
  if (!result.ok) return null;

  const runtimes = await result.json();
  return runtimes.find((item) =>
    runtime.aliases.includes(String(item.language).toLowerCase()) ||
    item.aliases?.some((alias) => runtime.aliases.includes(String(alias).toLowerCase()))
  );
}


