import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from './sequelize';

class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  declare tokenHash: string;
  declare userId: number;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
RefreshToken.init({
  tokenHash: { type: DataTypes.STRING(64), primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'refresh_tokens', timestamps: true });
export default RefreshToken;
