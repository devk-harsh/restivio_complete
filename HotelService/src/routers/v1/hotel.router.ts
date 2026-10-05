import express from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { requireHotelOwner } from '../../middlewares/ownership.middleware';
import { createHotelHandler, getHotelByIdHandler, getAllHotelsHandler, deleteHotelHandler, updateHotelHandler} from '../../controllers/hotel.controller';
import {  validateRequestBody, validatePathParams, validateQueryParams } from '../../validators';
import { hotelSchema, updateHotelSchema, hotelIdParamSchema } from '../../validators/hotel.validator';
import roomCategoryRouter from "./roomCategory.router";
import {searchRoomAvailabilityHandler,} from "../../controllers/roomAvailability.controller";
import {roomAvailabilityPathParamsSchema,searchRoomAvailabilitySchema,} from "../../validators/roomAvailability.validator";
const hotelRouter = express.Router();

hotelRouter.post('/', authenticate, requireRole('HOTEL_MANAGER', 'ADMIN'), validateRequestBody(hotelSchema), createHotelHandler);

hotelRouter.get('/:id', validatePathParams(hotelIdParamSchema), getHotelByIdHandler);

hotelRouter.get('/', getAllHotelsHandler);

hotelRouter.use("/:hotelId/room-categories", roomCategoryRouter);

hotelRouter.put('/:id', authenticate, requireRole('HOTEL_MANAGER', 'ADMIN'), validatePathParams(hotelIdParamSchema), requireHotelOwner, validateRequestBody(updateHotelSchema), updateHotelHandler);

hotelRouter.delete('/:id', authenticate, requireRole('HOTEL_MANAGER', 'ADMIN'), validatePathParams(hotelIdParamSchema), requireHotelOwner, deleteHotelHandler);
export default hotelRouter;

hotelRouter.get(
  "/:hotelId/availability",
  validatePathParams(
    roomAvailabilityPathParamsSchema
  ),
  validateQueryParams(
    searchRoomAvailabilitySchema
  ),
  searchRoomAvailabilityHandler
);
