import { createHash } from 'crypto';
import { CreateBookingDTO } from '../../dtos/booking.dto';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function scopedIdempotencyKey(userId: number, key: string) { return hash(JSON.stringify([userId, key])); }
export function requestFingerprint(data: CreateBookingDTO) {
  return hash(JSON.stringify([data.hotelId, data.roomCategoryId, data.checkIn, data.checkOut, data.numberOfRooms, data.totalGuests]));
}
