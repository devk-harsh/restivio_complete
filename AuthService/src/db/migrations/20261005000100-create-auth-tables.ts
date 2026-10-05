import { DataTypes, QueryInterface } from 'sequelize';
export default {
  async up(q: QueryInterface) {
    await q.createTable('users', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.ENUM('USER', 'HOTEL_MANAGER', 'ADMIN'), allowNull: false, defaultValue: 'USER' },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await q.createTable('refresh_tokens', {
      tokenHash: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await q.addIndex('refresh_tokens', ['userId']);
  },
  async down(q: QueryInterface) { await q.dropTable('refresh_tokens'); await q.dropTable('users'); },
};
