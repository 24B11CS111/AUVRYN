const path = require('path');
const fs = require('fs');

const webRoot = path.resolve(__dirname, '..');
const appSrc = path.join(webRoot, 'src/app');
const serverAppDst = path.join(webRoot, '.next/server/app');
const staticAppDst = path.join(webRoot, '.next/static/chunks/app');
const typesAppDst = path.join(webRoot, '.next/types/app');

function precreateDirs(currentSrc, rel = '') {
  if (!fs.existsSync(currentSrc)) return;
  const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subRel = path.join(rel, entry.name);
      try {
        fs.mkdirSync(path.join(serverAppDst, subRel), { recursive: true });
        fs.mkdirSync(path.join(staticAppDst, subRel), { recursive: true });
        fs.mkdirSync(path.join(typesAppDst, subRel), { recursive: true });
      } catch (err) {
        // Ignore any transient permission issues
      }
      precreateDirs(path.join(currentSrc, entry.name), subRel);
    }
  }
}

try {
  fs.mkdirSync(serverAppDst, { recursive: true });
  fs.mkdirSync(staticAppDst, { recursive: true });
  fs.mkdirSync(typesAppDst, { recursive: true });
  precreateDirs(appSrc);
} catch (err) {
  // Ignore
}
