import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional
} from "sequelize";
import sequelize from "./sequelize";

class IdempotencyKey extends Model<
  InferAttributes<IdempotencyKey>,
  InferCreationAttributes<IdempotencyKey>
> {
  declare id: CreationOptional<number>;
  declare idemKey: string;
  declare finalized: CreationOptional<boolean>;
  declare bookingId: number;
  declare userId: CreationOptional<number | null>;
  declare requestHash: CreationOptional<string | null>;
  declare status: CreationOptional<'PROCESSING' | 'COMPLETED' | 'COMPENSATING'>;
  declare response: CreationOptional<Record<string, unknown> | null>;
  declare responseStatus: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

IdempotencyKey.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    idemKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    finalized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    bookingId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    requestHash: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.ENUM('PROCESSING', 'COMPLETED', 'COMPENSATING'), allowNull: false, defaultValue: 'PROCESSING' },
    response: { type: DataTypes.JSON, allowNull: true },
    responseStatus: { type: DataTypes.INTEGER, allowNull: true },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: "IdempotencyKey",
    tableName: "idempotency_keys",
    timestamps: true,
  }
);


export default IdempotencyKey;
