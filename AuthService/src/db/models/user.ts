import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from './sequelize';
export type Role = 'USER' | 'HOTEL_MANAGER' | 'ADMIN';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare role: CreationOptional<Role>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
User.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('USER', 'HOTEL_MANAGER', 'ADMIN'), allowNull: false, defaultValue: 'USER' },
  createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'users', timestamps: true });
export default User;
