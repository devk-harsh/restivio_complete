import express from 'express';
import { createHotelHandler, getHotelByIdHandler, getAllHotelsHandler, deleteHotelHandler, updateHotelHandler} from '../../controllers/hotel.controller';
import {  validateRequestBody, validatePathParams, validateQueryParams } from '../../validators';
import { hotelSchema, updateHotelSchema, hotelIdParamSchema } from '../../validators/hotel.validator';
import roomCategoryRouter from "./roomCategory.router";
import {searchRoomAvailabilityHandler,} from "../../controllers/roomAvailability.controller";
import {roomAvailabilityPathParamsSchema,searchRoomAvailabilitySchema,} from "../../validators/roomAvailability.validator";
const hotelRouter = express.Router();

hotelRouter.post('/', validateRequestBody(hotelSchema), createHotelHandler);

hotelRouter.get('/:id', validatePathParams(hotelIdParamSchema), getHotelByIdHandler);

hotelRouter.get('/', getAllHotelsHandler);

hotelRouter.use("/:hotelId/room-categories", roomCategoryRouter);

hotelRouter.put('/:id', validatePathParams(hotelIdParamSchema), validateRequestBody(updateHotelSchema), updateHotelHandler);

hotelRouter.delete('/:id', validatePathParams(hotelIdParamSchema), deleteHotelHandler);
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