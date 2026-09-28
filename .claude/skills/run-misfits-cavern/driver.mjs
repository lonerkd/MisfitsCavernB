#!/usr/bin/env node
/**
 * Misfits Cavern dev server driver
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

// Stop dev server
function stopServer() {
  try {
    // Kill any node processes running "next dev" on port 3000
    if (process.platform === 'win32') {
      execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
    } else {
      execSync('pkill -f "node.*next dev"', { stdio: 'ignore' });
    }
    log('Dev server stopped');
  } catch (e) {
    // Process may not exist
  }
  serverProcess = null;
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
        stopServer();
        process.exit(0);
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
