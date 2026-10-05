import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid';
import { asyncLocalStorage } from '../utils/helpers/request.helpers';

export const attachCorrelationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Generate a unique correlation ID
    const correlationId = req.get('X-Correlation-ID') || uuidV4();
    
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Call the next middleware or route handler

    asyncLocalStorage.run( { correlationId: correlationId } , () => {
        next();
    });
}
