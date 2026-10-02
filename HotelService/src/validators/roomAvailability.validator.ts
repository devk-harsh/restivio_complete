import { z } from "zod";

import {
  isoDateString,
  positiveIntegerString,
} from "./common.validator";

import {
  getNightCount,
} from "../utils/date.utils";

export const roomAvailabilityPathParamsSchema =
  z.object({
    hotelId: positiveIntegerString,
  });

export const searchRoomAvailabilitySchema =
  z
    .object({
      checkIn: isoDateString,
      checkOut: isoDateString,

      rooms:
        positiveIntegerString.optional(),

      roomCategoryId:
        positiveIntegerString.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.checkIn >= data.checkOut) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "checkOut must be after checkIn",
          path: ["checkOut"],
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
          message:
            "A stay can be at most 30 nights",
          path: ["checkOut"],
        });
      }
    });