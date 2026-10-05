import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional
} from "sequelize";
import sequelize from "./sequelize";

class Hotel extends Model<
  InferAttributes<Hotel>, //Look at the Hotel class and automatically figure out all its attributes.
  InferCreationAttributes<Hotel> //Which fields are needed when creating a new record?
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare managerUserId: CreationOptional<number | null>;
  declare address: string;
  declare location: string;
  declare rating: CreationOptional<number | null>;
  declare ratingCount: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  // Fields that are tagged using CreationOptional will be optional.
}

Hotel.init( //actual mapping
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    managerUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: "manager_user_id" },
    address: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    location: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: null,
    },

    ratingCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: "rating_count",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize : sequelize,          // connection instance
    tableName: "hotels",// must match migration table name
    underscored: true, // createdAt --> created_at
    modelName: "Hotel",
    timestamps: true,   // uses createdAt & updatedAt
  }
);

export default Hotel;
