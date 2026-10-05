import bcrypt from 'bcrypt';
import sequelize from './models/sequelize';
import User, { Role } from './models/user';

async function seed() {
  if (process.env.SEED_DEMO !== 'true') throw new Error('Set SEED_DEMO=true for local demo accounts');
  const passwordHash = await bcrypt.hash('RestivioDemo123!', 12);
  for (const [id, name, email, role] of [
    [1, 'Demo Admin', 'admin@restivio.local', 'ADMIN'],
    [2, 'Demo Manager', 'manager@restivio.local', 'HOTEL_MANAGER'],
    [3, 'Demo User', 'user@restivio.local', 'USER'],
  ] as [number, string, string, Role][]) {
    await User.findOrCreate({ where: { email }, defaults: { id, name, email, role, passwordHash } });
  }
}
seed().then(() => sequelize.close()).catch(error => { console.error(error.message); process.exitCode = 1; return sequelize.close(); });
