import {Request,Response,} from "express";
import {StatusCodes,} from "http-status-codes";
import {SearchRoomAvailabilityDTO,} from "../dtos/roomAvailability.dto";
import {searchRoomAvailabilityService,} from "../services/roomAvailability.service";

export async function searchRoomAvailabilityHandler(
  req: Request,
  res: Response
) {
  const hotelId =
    Number(req.params.hotelId);

  const query =
    res.locals.validatedQuery;

  const availabilityData:
    SearchRoomAvailabilityDTO = {
      checkIn:
        query.checkIn,

      checkOut:
        query.checkOut,

      rooms:
        query.rooms
          ? Number(query.rooms)
          : 1,

      roomCategoryId:
        query.roomCategoryId
          ? Number(
              query.roomCategoryId
            )
          : undefined,
    };

  const availability =
    await searchRoomAvailabilityService(
      hotelId,
      availabilityData
    );

  res
    .status(StatusCodes.OK)
    .json({
      message:
        "Room availability retrieved successfully",

      success: true,

      data: availability,
    });
}