/**
 * After `next build`, copy public/ and .next/static into .next/standalone/
 * so images and CSS work on GoDaddy / IP deployment.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${src}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
}

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('Run npm run build first.');
  process.exit(1);
}

copyDir(path.join(root, 'public'), path.join(standalone, 'public'));
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));

console.log('Standalone deploy folder ready:', standalone);
