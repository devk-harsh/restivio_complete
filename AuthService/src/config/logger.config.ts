import winston from 'winston';
import { getCorrelationId } from '../utils/context/request.context';
export default winston.createLogger({
  defaultMeta: { service: 'AuthService' },
  format: winston.format.combine(winston.format.timestamp(), winston.format(info => {
    info.correlationId = getCorrelationId(); return info;
  })(), winston.format.json()),
  transports: [new winston.transports.Console()],
});
