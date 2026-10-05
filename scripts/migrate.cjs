// Supports the existing mixed default/CommonJS TypeScript migrations, preserving
// their filenames in SequelizeMeta. Run from the owning service directory.
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const local = createRequire(path.resolve('package.json'));
local('dotenv').config();
local('ts-node').register({ transpileOnly: true });
const { Sequelize, DataTypes } = local('sequelize');
const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  dialect: 'mysql', host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, logging: false,
});
async function migrate() {
  const meta = db.define('SequelizeMeta', { name: { type: DataTypes.STRING, primaryKey: true } }, { tableName: 'SequelizeMeta', timestamps: false });
  // Only the migration ledger is synchronized; application schemas use migrations.
  await meta.sync();
  const applied = new Set((await meta.findAll()).map(row => row.name));
  const directory = path.resolve('src/db/migrations');
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.ts')).sort()) {
    if (applied.has(name)) continue;
    const module = local(path.join(directory, name));
    await (module.default || module).up(db.getQueryInterface());
    await meta.create({ name });
    console.log(`Migrated ${name}`);
  }
}
migrate().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
