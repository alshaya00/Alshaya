const { spawn } = require('child_process');
const path = require('path');

const nextProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', process.env.PORT || '5000'], {
  stdio: 'inherit',
  env: process.env,
});

process.on('SIGTERM', () => nextProcess.kill('SIGTERM'));
process.on('SIGINT', () => nextProcess.kill('SIGINT'));

nextProcess.on('exit', (code) => process.exit(code || 0));

setTimeout(() => {
  console.log('[init] Running background initialization...');
  
  const initProcess = spawn('npx', ['tsx', path.join(__dirname, 'ensure-admin.ts')], {
    stdio: 'inherit',
    env: process.env,
  });
  
  initProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('[init] Admin initialization complete');
      const membersProcess = spawn('npx', ['tsx', path.join(__dirname, 'ensure-members.ts')], {
        stdio: 'inherit',
        env: process.env,
      });
      membersProcess.on('exit', (code2) => {
        console.log(`[init] Members initialization ${code2 === 0 ? 'complete' : 'failed'}`);
      });
    } else {
      console.warn('[init] Admin initialization failed, continuing...');
    }
  });
}, 3000);
