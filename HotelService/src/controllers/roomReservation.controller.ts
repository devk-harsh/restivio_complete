import {
  Request,
  Response,
} from "express";

import {
  StatusCodes,
} from "http-status-codes";

import {
  reserveRoomsService,
  releaseRoomsService,
} from "../services/roomReservation.service";

export async function reserveRoomsHandler(
  req: Request,
  res: Response
) {
  const reservation =
    await reserveRoomsService(
      req.body
    );

  res
    .status(StatusCodes.OK)
    .json({
      message:
        reservation.alreadyReserved
          ? "Room reservation already exists"
          : "Rooms reserved successfully",

      success: true,

      data: reservation,
    });
}

export async function releaseRoomsHandler(
  req: Request,
  res: Response
) {
  const result =
    await releaseRoomsService(
      req.body
    );

  res
    .status(StatusCodes.OK)
    .json({
      message:
        "Room inventory released successfully",

      success: true,

      data: result,
    });
}