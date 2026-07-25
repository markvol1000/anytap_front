import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const www = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  spawn(npmCmd, ['run', 'dev'], { cwd: www, stdio: 'inherit', shell: true }),
  spawn(npmCmd, ['run', 'dev:v2'], { cwd: www, stdio: 'inherit', shell: true }),
];

function shutdown(code = 0) {
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) shutdown(code);
  });
}

console.log('\n  Compare view → http://localhost:5173/compare.html\n');
console.log('  Current SPA  → http://localhost:5173/');
console.log('  Homepage v2  → http://localhost:5174/index.html\n');
