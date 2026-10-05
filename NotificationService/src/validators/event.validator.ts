import { z } from 'zod';
export const bookingEventSchema = z.object({
  eventId: z.uuid(),
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_CANCELLED']),
  correlationId: z.string().min(1).max(255),
  payload: z.object({
    bookingId: z.number().int().positive(), hotelId: z.number().int().positive(),
    userId: z.number().int().positive(), userEmail: z.email(),
    totalGuests: z.number().int().positive(), bookingAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    checkIn: z.string().nullable(), checkOut: z.string().nullable(), numberOfRooms: z.number().int().positive().nullable(),
  }).strict(),
}).strict();
export type BookingEvent = z.infer<typeof bookingEventSchema>;
