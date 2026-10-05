import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
export const createBookingSchema = z.object({
  hotelId: z.number().int().positive(), roomCategoryId: z.number().int().positive(),
  checkIn: date, checkOut: date,
  numberOfRooms: z.number().int().min(1).max(100), totalGuests: z.number().int().min(1).max(1000),
}).strict().refine(data => data.checkOut > data.checkIn &&
  (Date.parse(data.checkOut) - Date.parse(data.checkIn)) / 86400000 <= 30,
  'Stay must be between 1 and 30 nights');
export const cancelBookingParamsSchema = z.object({ id: z.string().regex(/^[1-9]\d*$/) });
export const idempotencyKeySchema = z.string().min(1).max(128).regex(/^[\x21-\x7E]+$/, 'Use a printable opaque key without spaces');
