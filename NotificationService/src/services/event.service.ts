import { BookingEvent } from '../validators/event.validator';
import { EmailJobPayload } from '../types/email.types';
export function eventToEmail(event: BookingEvent): EmailJobPayload {
  const confirmed = event.type === 'BOOKING_CONFIRMED';
  return {
    eventId: event.eventId, correlationId: event.correlationId, bookingId: event.payload.bookingId,
    to: event.payload.userEmail,
    subject: confirmed ? 'Booking Confirmed' : 'Booking Cancelled',
    templateId: confirmed ? 'booking-confirmed' : 'booking-cancelled',
    params: event.payload,
  };
}
