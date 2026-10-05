import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from './sequelize';
export type EventType = 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED';
class OutboxEvent extends Model<InferAttributes<OutboxEvent>, InferCreationAttributes<OutboxEvent>> {
  declare id: string;
  declare eventType: EventType;
  declare aggregateId: number;
  declare payload: Record<string, unknown>;
  declare correlationId: string;
  declare status: CreationOptional<'PENDING' | 'PUBLISHED'>;
  declare attempts: CreationOptional<number>;
  declare lastError: CreationOptional<string | null>;
  declare nextAttemptAt: Date;
  declare publishedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
OutboxEvent.init({
  id: { type: DataTypes.UUID, primaryKey: true },
  eventType: { type: DataTypes.ENUM('BOOKING_CONFIRMED', 'BOOKING_CANCELLED'), allowNull: false },
  aggregateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  payload: { type: DataTypes.JSON, allowNull: false },
  correlationId: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'PUBLISHED'), defaultValue: 'PENDING', allowNull: false },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  lastError: { type: DataTypes.TEXT, allowNull: true },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
}, { sequelize, tableName: 'outbox_events', timestamps: true });
export default OutboxEvent;
