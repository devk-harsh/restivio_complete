import { Sequelize } from "sequelize";
import { dbConfig } from "../../config/index";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: dbConfig.DB_HOST,
  port: dbConfig.DB_PORT,
  username: dbConfig.DB_USER,
  password: dbConfig.DB_PASSWORD,
  database: dbConfig.DB_NAME,
  logging: false
});

export default sequelize;