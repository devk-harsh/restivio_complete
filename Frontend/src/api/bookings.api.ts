import { bookingClient } from "./client";
import type { Envelope, Booking, BookingIntent } from "../types/api";
export const bookingsApi = {
  async create(intent: BookingIntent, key: string) {
    return (
      await bookingClient.post<Envelope<Booking>>("/bookings", intent, {
        headers: { "Idempotency-Key": key },
      })
    ).data.data;
  },
  async list(offset = 0) {
    return (
      await bookingClient.get<Envelope<Booking[]>>("/bookings", {
        params: { offset },
      })
    ).data.data;
  },
  async get(id: number) {
    return (await bookingClient.get<Envelope<Booking>>("/bookings/" + id)).data
      .data;
  },
  async cancel(id: number) {
    return (
      await bookingClient.post<Envelope<Booking>>("/bookings/" + id + "/cancel")
    ).data.data;
  },
};
