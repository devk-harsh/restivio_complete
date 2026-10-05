import express from "express";
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { requireHotelOwner } from '../../middlewares/ownership.middleware';
import {
  createRoomCategoryHandler,
  getRoomCategoriesByHotelHandler,
  updateRoomCategoryHandler,
  deleteRoomCategoryHandler,
} from "../../controllers/roomCategory.controller";

import {generateRoomInventoryHandler,} from "../../controllers/roomGeneration.controller";

import {validatePathParams, validateRequestBody,
} from "../../validators";
import {
  createRoomCategorySchema,
  updateRoomCategorySchema,
  roomCategoryHotelParamsSchema,
  roomCategoryParamsSchema,
} from "../../validators/roomCategory.validator";

import {generateRoomInventorySchema,} from "../../validators/roomGeneration.validator";

const roomCategoryRouter = express.Router({
  mergeParams: true,
});

roomCategoryRouter.use((req, res, next) => {
  if (req.method === 'GET') { next(); return; }
  authenticate(req, res, () => requireRole('HOTEL_MANAGER', 'ADMIN')(req, res, () => {
    Promise.resolve(requireHotelOwner(req, res, next)).catch(next);
  }));
});

roomCategoryRouter.post(
  "/",
  validatePathParams(roomCategoryHotelParamsSchema),
  validateRequestBody(createRoomCategorySchema),
  createRoomCategoryHandler
);

roomCategoryRouter.get(
  "/",
  validatePathParams(roomCategoryHotelParamsSchema),
  getRoomCategoriesByHotelHandler
);

roomCategoryRouter.patch(
  "/:roomCategoryId",
  validatePathParams(roomCategoryParamsSchema),
  validateRequestBody(updateRoomCategorySchema),
  updateRoomCategoryHandler
);

roomCategoryRouter.delete(
  "/:roomCategoryId",
  validatePathParams(roomCategoryParamsSchema),
  deleteRoomCategoryHandler
);

roomCategoryRouter.post(
  "/:roomCategoryId/inventory/generate",

  validatePathParams(
    roomCategoryParamsSchema
  ),

  validateRequestBody(
    generateRoomInventorySchema
  ),

  generateRoomInventoryHandler
);

export default roomCategoryRouter;
