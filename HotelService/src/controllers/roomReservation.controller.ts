import {
  Request,
  Response,
} from "express";

import {
  StatusCodes,
} from "http-status-codes";
import { reservations, releases } from '../config/metrics';

import {
  reserveRoomsService,
  releaseRoomsService,
} from "../services/roomReservation.service";

export async function reserveRoomsHandler(
  req: Request,
  res: Response
) {
  reservations.inc({ outcome: 'attempt' });
  const reservation =
    await reserveRoomsService(
      req.body
    ).catch(error => {
      reservations.inc({ outcome: error.statusCode === 409 ? 'conflict' : 'failed' });
      throw error;
    });
  reservations.inc({ outcome: 'success' });

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
  releases.inc();

  res
    .status(StatusCodes.OK)
    .json({
      message:
        "Room inventory released successfully",

      success: true,

      data: result,
    });
}
