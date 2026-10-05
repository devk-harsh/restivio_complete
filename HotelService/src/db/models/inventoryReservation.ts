import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from './sequelize';
class InventoryReservation extends Model<InferAttributes<InventoryReservation>, InferCreationAttributes<InventoryReservation>> {
  declare bookingId: number;
  declare hotelId: number;
  declare fingerprint: CreationOptional<string | null>;
  declare status: 'PENDING' | 'RESERVED' | 'RELEASED';
  declare response: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
InventoryReservation.init({
  bookingId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  hotelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  fingerprint: { type: DataTypes.STRING(64), allowNull: true },
  status: { type: DataTypes.ENUM('PENDING', 'RESERVED', 'RELEASED'), allowNull: false },
  response: { type: DataTypes.JSON, allowNull: true },
  createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'inventory_reservations', timestamps: true });
export default InventoryReservation;
