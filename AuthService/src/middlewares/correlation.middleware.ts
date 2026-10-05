import { Request, Response, NextFunction } from "express";
import { randomUUID as uuidv4 } from "crypto";
import { requestContext } from "../utils/context/request.context";

export const attachCorrelationIdMiddleware = (req: Request, res: Response,next: NextFunction) => {
  const correlationId =
    req.headers["x-correlation-id"]?.toString() || uuidv4();
  /* attach to request
  (req as any).correlationId = correlationId;*/

  // also send it back in response headers
  res.setHeader("x-correlation-id", correlationId);

  //Better do this
  requestContext.run({correlationId : correlationId },() => {
    next();
  });
};
