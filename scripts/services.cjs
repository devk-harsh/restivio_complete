const { spawnSync } = require('node:child_process');
const path = require('node:path');
const action = process.argv[2];
for (const service of ['AuthService', 'HotelService', 'BookingService', 'NotificationService']) {
  const args = action === 'install' ? ['ci'] : ['run', action];
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: path.resolve(__dirname, '..', service), stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
