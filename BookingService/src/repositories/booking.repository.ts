import logger from "../config/logger.config";
import Booking from "../db/models/booking";
import { CreationAttributes, Transaction } from "sequelize";

type CreateBookingRepositoryDTO = CreationAttributes<Booking>;

export async function createBooking(
  bookingData: CreateBookingRepositoryDTO,
  transaction: Transaction
) {
  const booking = await Booking.create(bookingData, { transaction });
  logger.info(`Booking created with ID: ${booking.id}`);
  return booking;
}

export async function confirmBooking(
  bookingId: number,
  transaction: Transaction
) {
  const [updatedRowsCount] = await Booking.update(
    { status: "CONFIRMED" },
    {
      where: { id: bookingId },
      transaction
    }
  );

  if (updatedRowsCount === 0) {
    return null;
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  logger.info(`Booking confirmed with ID: ${bookingId}`);
  return booking;
}

export async function getBookingById(bookingId: number) {
  const booking = await Booking.findByPk(bookingId);
  return booking;
}

export async function cancelBooking(bookingId: number) {
  const [updatedRowsCount] = await Booking.update(
    { status: "CANCELLED" },
    {
      where: { id: bookingId }
    }
  );

  if (updatedRowsCount === 0) {
    return null;
  }
  const booking = await Booking.findByPk(bookingId);
  logger.info(`Booking cancelled with ID: ${bookingId}`);
  return booking;
}
