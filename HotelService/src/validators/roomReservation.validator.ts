import { z } from "zod";

import { isoDateString } from "./common.validator";
import { getNightCount } from "../utils/date.utils";

export const reserveRoomsSchema = z
  .object({
    bookingId: z
      .number()
      .int()
      .positive(),

    hotelId: z
      .number()
      .int()
      .positive(),

    roomCategoryId: z
      .number()
      .int()
      .positive(),

    checkIn: isoDateString,

    checkOut: isoDateString,

    numberOfRooms: z
      .number()
      .int()
      .positive(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.checkIn >= data.checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOut"],
        message:
          "checkOut must be after checkIn",
      });

      return;
    }

    const nights = getNightCount(
      data.checkIn,
      data.checkOut
    );

    if (nights > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOut"],
        message:
          "A stay can be at most 30 nights",
      });
    }
  });

export const releaseRoomsSchema = z
  .object({
    bookingId: z
      .number()
      .int()
      .positive(),

    hotelId: z
      .number()
      .int()
      .positive(),
  })
  .strict();