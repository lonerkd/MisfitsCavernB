const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INTEL_DIR = path.join(ROOT_DIR, '.cavern-intelligence');
const MANIFEST_PATH = path.join(INTEL_DIR, 'sync-manifest.json');

const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', '.cavern-intelligence', 'dist', 'out']);
const INCLUDE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.md']);

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(file)) {
        walk(filePath, fileList);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (INCLUDE_EXTS.has(ext)) {
        fileList.push({
          relPath: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
          size: stat.size,
          mtime: stat.mtime,
          ext: ext
        });
      }
    }
  }
  return fileList;
}

function generateManifest() {
  console.log('Scanning Misfits Cavern codebase...');
  const files = walk(ROOT_DIR);

  // Group files by top-level category
  const categories = {
    app: [],
    components: [],
    lib: [],
    database: [],
    scripts: [],
    config: []
  };

  const fileStats = {
    totalFiles: 0,
    totalSize: 0,
    byExtension: {}
  };

  for (const f of files) {
    fileStats.totalFiles++;
    fileStats.totalSize += f.size;
    fileStats.byExtension[f.ext] = (fileStats.byExtension[f.ext] || 0) + 1;

    if (f.relPath.startsWith('app/')) {
      categories.app.push(f.relPath);
    } else if (f.relPath.startsWith('components/')) {
      categories.components.push(f.relPath);
    } else if (f.relPath.startsWith('lib/')) {
      categories.lib.push(f.relPath);
    } else if (f.relPath.endsWith('.sql')) {
      categories.database.push(f.relPath);
    } else if (f.relPath.startsWith('scripts/')) {
      categories.scripts.push(f.relPath);
    } else {
      categories.config.push(f.relPath);
    }
  }

  // Structured modules overview
  const modules = {
    "ScriptOS Screenplay Engine": {
      description: "Fountain screenplay rendering, AST parsing, real-time sync, revisions and PDF generation",
      path: "lib/scriptos",
      files: categories.lib.filter(p => p.startsWith('lib/scriptos/'))
    },
    "Supabase Client and API Layer": {
      description: "Database queries, RLS wrapper functions, auth services, and real-time chat subscriptions",
      path: "lib/supabase",
      files: categories.lib.filter(p => p.startsWith('lib/supabase/'))
    },
    "WebRTC Voice Engine": {
      description: "Peer-to-peer decentralized crew voice mesh signaling over Supabase Realtime",
      path: "lib/webrtc",
      files: categories.lib.filter(p => p.startsWith('lib/webrtc/'))
    },
    "Next.js Route Structure": {
      description: "App router pages, layouts, custom route middleware and authentication gates",
      path: "app",
      files: categories.app
    },
    "UI Components": {
      description: "Design system buttons, inputs, canvas pins, overlays, and confirmation models",
      path: "components",
      files: categories.components
    },
    "Database Schema & Reference": {
      description: "Postgres schema declarations, indices, and row-level security definitions",
      path: ".",
      files: categories.database
    }
  };

  const manifest = {
    project: "Misfits Cavern",
    last_synchronized: new Date().toISOString(),
    stats: fileStats,
    modules: modules,
    all_monitored_files: files.map(f => ({
      path: f.relPath,
      size: f.size,
      last_modified: f.mtime
    }))
  };

  if (!fs.existsSync(INTEL_DIR)) {
    fs.mkdirSync(INTEL_DIR, { recursive: true });
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Successfully compiled sync-manifest.json with ${fileStats.totalFiles} tracked files!`);
}

generateManifest();
