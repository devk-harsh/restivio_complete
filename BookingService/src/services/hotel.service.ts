import axios from 'axios';
import Booking from '../db/models/booking';
import { AppError } from '../utils/errors/app.error';
import { getCorrelationId } from '../utils/context/request.context';
export type Reservation = { roomNos: number[]; nights: number; pricePerNight: number; totalAmount: number };
async function callHotel(operation: 'reserve' | 'release', body: Record<string, unknown>) {
  try {
    const response = await axios.post((process.env.HOTEL_SERVICE_URL || 'http://localhost:3001') + '/api/v1/internal/rooms/' + operation, body, {
      timeout: 5000,
      headers: { 'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY, 'X-Correlation-ID': getCorrelationId() },
    });
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && [400, 404, 409].includes(error.response?.status || 0)) {
      throw new AppError(error.response?.data?.message || 'Inventory request rejected', error.response!.status);
    }
    // Timeout does not prove the remote transaction failed. The caller compensates.
    throw new AppError('HotelService is temporarily unavailable', 503);
  }
}
export async function reserveBookingRooms(booking: Booking): Promise<Reservation> {
  return callHotel('reserve', { bookingId: booking.id, hotelId: booking.hotelId,
    roomCategoryId: booking.roomCategoryId, checkIn: booking.checkIn,
    checkOut: booking.checkOut, numberOfRooms: booking.numberOfRooms });
}
export async function releaseBookingRooms(booking: Booking) {
  return callHotel('release', { bookingId: booking.id, hotelId: booking.hotelId });
}
