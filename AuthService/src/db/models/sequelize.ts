import '../../config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'mysql', host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'restivio_auth',
  username: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'root',
  logging: false,
});
export default sequelize;
