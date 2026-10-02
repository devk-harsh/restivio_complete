import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import logger from "../config/logger.config";

/**
 * 
 * @param schema - Zod schema to validate the request body
 * @returns - Middleware function to validate the request body
 */
export const validateRequestBody = (schema: ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {

            logger.info("Validating request body");
            req.body = await schema.parseAsync(req.body);
            logger.info("Request body is valid");
            next();

        } catch (error) {
            // If the validation fails, 
            logger.error("Request body is invalid");
            res.status(400).json({
                message: "Invalid request body",
                success: false,
                error: error
            });
            
        }
    }
}

/**
 * 
 * @param schema - Zod schema to validate the request body
 * @returns - Middleware function to validate the request query params
 */
export const validateQueryParams = (schema: ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating query params");
        res.locals.validatedQuery =
            await schema.parseAsync(
            req.query
            );
        logger.info(
            "Query params are valid"
        );

        next();
        } catch (error) {
        logger.error(
            "Query params are invalid"
        );

        res.status(400).json({
            message:
            "Invalid query params",
            success: false,
            error,
        });
        }
    }
}

export const validatePathParams = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("Validating path params");
      await schema.parseAsync(req.params);
      logger.info("Path params are valid");
      next();
    } catch (error) {
      logger.error("Path params are invalid");
      res.status(400).json({
        message: "Invalid path params",
        success: false,
        error,
      });
    }
  };
};