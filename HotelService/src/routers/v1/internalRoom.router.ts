import express from "express";
import { requireInternalKey } from '../../middlewares/auth.middleware';

import {
  reserveRoomsHandler,
  releaseRoomsHandler,
} from "../../controllers/roomReservation.controller";

import {
  validateRequestBody,
} from "../../validators";

import {
  reserveRoomsSchema,
  releaseRoomsSchema,
} from "../../validators/roomReservation.validator";

const internalRoomRouter =
  express.Router();

internalRoomRouter.use(requireInternalKey);

internalRoomRouter.post(
  "/reserve",
  validateRequestBody(
    reserveRoomsSchema
  ),
  reserveRoomsHandler
);

internalRoomRouter.post(
  "/release",
  validateRequestBody(
    releaseRoomsSchema
  ),
  releaseRoomsHandler
);

export default internalRoomRouter;
