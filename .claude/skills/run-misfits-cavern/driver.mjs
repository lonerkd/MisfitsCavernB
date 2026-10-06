#!/usr/bin/env node
/**
 * The Cavern dev server driver
 *
 * Usage:
 *   node driver.mjs start         # Start dev server (background)
 *   node driver.mjs health        # Check if server is responding
 *   node driver.mjs verify        # Run smoke tests (compile, lint, tests)
 *   node driver.mjs stop          # Kill dev server
 *   node driver.mjs build         # Full production build (verify only, not for running)
 */

import { spawn, execSync } from 'child_process';
import { createReadStream } from 'fs';
import http from 'http';

const PORT = 3000;
const TIMEOUT = 15000;
let serverProcess = null;

function log(msg) {
  console.log(`[driver] ${msg}`);
}

function error(msg) {
  console.error(`[driver] ERROR: ${msg}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// HTTP health check
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}`, { timeout: 5000 }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start dev server
function startServer() {
  return new Promise((resolve, reject) => {
    if (serverProcess) {
      log('Dev server already running');
      return resolve();
    }

    log('Starting dev server...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });

    serverProcess.unref();

    // Wait for server to be ready
    const checkStart = async () => {
      const start = Date.now();
      while (Date.now() - start < TIMEOUT) {
        if (await checkHealth()) {
          log('Dev server ready on http://localhost:3000');
          resolve();
          return;
        }
        await sleep(500);
      }
      reject(new Error('Dev server failed to start within 15s'));
    };

    checkStart().catch(reject);
  });
}

// PIDs of whatever is listening on PORT. Scoped to the port so we never
// touch unrelated Node processes (editors, other dev servers, Claude Code).
function pidsOnPort() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const cols = line.trim().split(/\s+/);
        // Proto  Local Address  Foreign Address  State  PID
        if (cols.length >= 5 && cols[3] === 'LISTENING' && cols[1].endsWith(`:${PORT}`)) {
          pids.add(cols[4]);
        }
      }
      return [...pids].filter(p => p !== '0');
    }
    const out = execSync(`lsof -ti tcp:${PORT} -sTCP:LISTEN`, { encoding: 'utf8' });
    return out.split(/\s+/).filter(Boolean);
  } catch {
    // lsof exits 1 when nothing is listening.
    return [];
  }
}

// Stop dev server
function stopServer() {
  const pids = pidsOnPort();
  if (pids.length === 0) {
    log(`Nothing listening on port ${PORT}`);
    serverProcess = null;
    return true;
  }
  let ok = true;
  for (const pid of pids) {
    try {
      // /T kills the process tree (npm -> next -> workers).
      execSync(process.platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill ${pid}`, { stdio: 'ignore' });
    } catch (e) {
      error(`Could not stop PID ${pid}: ${e.message}`);
      ok = false;
    }
  }
  if (ok) log(`Dev server stopped (PID ${pids.join(', ')})`);
  serverProcess = null;
  return ok;
}

// Verify code quality
function verify() {
  try {
    log('Running TypeScript check...');
    execSync('npm run typecheck', { stdio: 'inherit' });

    log('Running linter...');
    execSync('npm run lint', { stdio: 'inherit' });

    log('Running unit tests...');
    execSync('npm run test', { stdio: 'inherit' });

    log('All checks passed ✓');
    return true;
  } catch (e) {
    error('Verification failed');
    return false;
  }
}

// Production build (verify only)
function build() {
  try {
    log('Running production build...');
    execSync('npm run build', { stdio: 'inherit' });
    log('Build successful ✓');
    return true;
  } catch (e) {
    error('Build failed');
    return false;
  }
}

// Main
async function main() {
  const cmd = process.argv[2] || 'start';

  try {
    switch (cmd) {
      case 'start':
        await startServer();
        break;

      case 'health':
        const isHealthy = await checkHealth();
        if (isHealthy) {
          log('Dev server is responding ✓');
          process.exit(0);
        } else {
          error('Dev server is not responding');
          process.exit(1);
        }
        break;

      case 'verify':
        const ok = verify();
        process.exit(ok ? 0 : 1);
        break;

      case 'build':
        const buildOk = build();
        process.exit(buildOk ? 0 : 1);
        break;

      case 'stop':
        process.exit(stopServer() ? 0 : 1);
        break;

      default:
        console.log('Usage: node driver.mjs [start|health|verify|build|stop]');
        process.exit(1);
    }
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
}

main();
