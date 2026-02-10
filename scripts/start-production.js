const { execSync, spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || '5000';

const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

const nextProcess = spawn(nextBin, ['start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env,
});

process.on('SIGTERM', () => nextProcess.kill('SIGTERM'));
process.on('SIGINT', () => nextProcess.kill('SIGINT'));

nextProcess.on('exit', (code) => process.exit(code || 0));
