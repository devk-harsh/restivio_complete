import winston from "winston"
import { getCorrelationId } from "../utils/context/request.context";
import DailyRotateFile from "winston-daily-rotate-file";
const logger = winston.createLogger({
    defaultMeta: { service: 'BookingService' },
    format : winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        //winston.format.json(),//Format the log in JSON or can use printf like this below :
        winston.format.printf(({timestamp, level, message, ...data})=>{
            const cid = getCorrelationId();
            const output = {level,correlationId: data.correlationId || cid || "background", message, timestamp, data};
            return JSON.stringify(output);
        })
    ),
    transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
            dirname: "logs",
            filename: "app-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d",        // keep 14 days
            zippedArchive: true,    // compress old logs
        }),
    ],
});


export default logger;

//...data is the JavaScript rest operator used in object destructuring.

/*{timestamp, level, message, ...data} here
“Collect all remaining properties of this object except timestamp, level, and message,
and put them into a new object called data.”*/
