import { createHash } from 'crypto';
import { Transaction } from 'sequelize';
import InventoryReservation from '../db/models/inventoryReservation';
import sequelize from "../db/models/sequelize";

import { RoomRepository } from "../repositories/room.repository";
import { HotelRepository } from "../repositories/hotel.repository";
import { RoomCategoryRepository } from "../repositories/roomCategory.repository";

import {
  ReserveRoomsDTO,
  ReleaseRoomsDTO,
} from "../dtos/roomReservation.dto";

import {
  ConflictError,
  NotFoundError,
} from "../utils/errors/app.error";

import {
  getStayDates,
} from "../utils/date.utils";

import Room from "../db/models/room";

const hotelRepository =
  new HotelRepository();

const roomCategoryRepository =
  new RoomCategoryRepository();

const roomRepository =
  new RoomRepository();

function findCompleteRoomNos(
  inventoryRows: Room[],
  stayDates: string[]
): number[] {
  const requiredDates =
    new Set(stayDates);

  const roomDateMap =
    new Map<number, Set<string>>();

  for (const room of inventoryRows) {
    if (!roomDateMap.has(room.roomNo)) {
      roomDateMap.set(
        room.roomNo,
        new Set()
      );
    }

    roomDateMap
      .get(room.roomNo)!
      .add(
        room.dateOfAvailability
      );
  }

  const completeRoomNos: number[] = [];

  for (
    const [roomNo, availableDates]
    of roomDateMap.entries()
  ) {
    const hasEveryNight =
      stayDates.every(
        (date) =>
          availableDates.has(date)
      );

    if (
      hasEveryNight &&
      availableDates.size ===
        requiredDates.size
    ) {
      completeRoomNos.push(roomNo);
    }
  }

  return completeRoomNos;
}

function isSameReservation(
  existingRows: Room[],
  request: ReserveRoomsDTO,
  stayDates: string[]
): boolean {
  if (existingRows.length === 0) {
    return false;
  }

  const belongsToSameRequest =
    existingRows.every(
      (room) =>
        room.hotelId ===
          request.hotelId &&
        room.roomCategoryId ===
          request.roomCategoryId
    );

  if (!belongsToSameRequest) {
    return false;
  }

  const roomNos =
    new Set(
      existingRows.map(
        (room) => room.roomNo
      )
    );

  if (
    roomNos.size !==
    request.numberOfRooms
  ) {
    return false;
  }

  const expectedRowCount =
    request.numberOfRooms *
    stayDates.length;

  if (
    existingRows.length !==
    expectedRowCount
  ) {
    return false;
  }

  const expectedDates =
    new Set(stayDates);

  for (const roomNo of roomNos) {
    const datesForRoom =
      new Set(
        existingRows
          .filter(
            (room) =>
              room.roomNo ===
              roomNo
          )
          .map(
            (room) =>
              room.dateOfAvailability
          )
      );

    if (
      datesForRoom.size !==
      expectedDates.size
    ) {
      return false;
    }

    for (const date of expectedDates) {
      if (!datesForRoom.has(date)) {
        return false;
      }
    }
  }

  return true;
}

export async function reserveRoomsService(
  reservationData: ReserveRoomsDTO
) {
  // Active hotel must exist.
  await hotelRepository.findById(
    reservationData.hotelId
  );

  // Category must belong to hotel.
  const roomCategory =
    await roomCategoryRepository
      .findByIdAndHotelId(
        reservationData.roomCategoryId,
        reservationData.hotelId
      );

  if (!roomCategory) {
    throw new NotFoundError(
      "Room category not found for this hotel"
    );
  }

  const stayDates =
    getStayDates(
      reservationData.checkIn,
      reservationData.checkOut
    );

  const nights = stayDates.length;

  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    async (transaction) => {
      const fingerprint = createHash('sha256').update(JSON.stringify([reservationData.hotelId, reservationData.roomCategoryId, reservationData.checkIn, reservationData.checkOut, reservationData.numberOfRooms])).digest('hex');
      // Serialize reserve/release for this booking without replacing inventory row locks.
      await sequelize.query('INSERT IGNORE INTO inventory_reservations (bookingId, hotelId, fingerprint, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())', { replacements: [reservationData.bookingId, reservationData.hotelId, fingerprint, 'PENDING'], transaction });
      const ledger = (await InventoryReservation.findByPk(reservationData.bookingId, { transaction, lock: transaction.LOCK.UPDATE }))!;
      if (ledger.status === 'RELEASED') throw new ConflictError('This booking reservation has already been released');
      if (ledger.hotelId !== reservationData.hotelId || ledger.fingerprint !== fingerprint) throw new ConflictError('This bookingId has a different reservation request');
      if (ledger.status === 'RESERVED' && ledger.response) return { ...ledger.response, alreadyReserved: true };
      /*
        1. Idempotency:
        Has this booking already reserved inventory?
      */
      const existingReservation =
        await roomRepository
          .findByBookingIdForUpdate(
            reservationData.bookingId,
            transaction
          );

      if (
        existingReservation.length > 0
      ) {
        if (
          !isSameReservation(
            existingReservation,
            reservationData,
            stayDates
          )
        ) {
          throw new ConflictError(
            "This bookingId already has a different room reservation"
          );
        }

        const existingRoomNos =
          [
            ...new Set(
              existingReservation.map(
                (room) =>
                  room.roomNo
              )
            ),
          ];

        const result = {
          bookingId:
            reservationData.bookingId,

          hotelId:
            reservationData.hotelId,

          roomCategoryId:
            reservationData.roomCategoryId,

          roomType:
            roomCategory.roomType,

          checkIn:
            reservationData.checkIn,

          checkOut:
            reservationData.checkOut,

          nights,

          numberOfRooms:
            reservationData.numberOfRooms,

          roomNos:
            existingRoomNos,

          pricePerNight:
            roomCategory.price,

          totalAmount:
            roomCategory.price *
            nights *
            reservationData.numberOfRooms,

          alreadyReserved: true,
        };
        await ledger.update({ status: 'RESERVED', response: result }, { transaction });
        return result;
      }

      /*
        2. Lock currently-free inventory rows.
      */
      const inventoryRows =
        await roomRepository
          .findUnbookedInventoryForStayForUpdate(
            reservationData.hotelId,
            reservationData.roomCategoryId,
            stayDates,
            transaction
          );

      /*
        3. Find physical rooms available
        for the ENTIRE stay.
      */
      const completeRoomNos =
        findCompleteRoomNos(
          inventoryRows,
          stayDates
        );

      if (
        completeRoomNos.length <
        reservationData.numberOfRooms
      ) {
        throw new ConflictError(
          "Not enough rooms are available for the requested stay"
        );
      }

      /*
        4. Deterministically pick rooms.
      */
      const selectedRoomNos =
        completeRoomNos
          .sort(
            (a, b) => a - b
          )
          .slice(
            0,
            reservationData.numberOfRooms
          );

      /*
        5. Reserve all selected
        room-night rows.
      */
      const affectedRows =
        await roomRepository
          .reserveInventoryRows(
            reservationData.bookingId,
            reservationData.hotelId,
            reservationData.roomCategoryId,
            selectedRoomNos,
            stayDates,
            transaction
          );

      const expectedRows =
        reservationData.numberOfRooms *
        nights;

      /*
        This should always match because
        rows are locked.

        Still, verify it.
      */
      if (
        affectedRows !==
        expectedRows
      ) {
        throw new ConflictError(
          "Room inventory changed while processing the reservation"
        );
      }

      /*
        Callback returns successfully
        → Sequelize COMMITs transaction.
      */
      const result = {
        bookingId:
          reservationData.bookingId,

        hotelId:
          reservationData.hotelId,

        roomCategoryId:
          reservationData.roomCategoryId,

        roomType:
          roomCategory.roomType,

        checkIn:
          reservationData.checkIn,

        checkOut:
          reservationData.checkOut,

        nights,

        numberOfRooms:
          reservationData.numberOfRooms,

        roomNos:
          selectedRoomNos,

        pricePerNight:
          roomCategory.price,

        totalAmount:
          roomCategory.price *
          nights *
          reservationData.numberOfRooms,

        alreadyReserved: false,
      };
      await ledger.update({ status: 'RESERVED', response: result }, { transaction });
      return result;
    }
  );
}

export async function releaseRoomsService(
  releaseData: ReleaseRoomsDTO
) {
  return sequelize.transaction(
    async (transaction) => {
      await sequelize.query('INSERT IGNORE INTO inventory_reservations (bookingId, hotelId, status, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())', { replacements: [releaseData.bookingId, releaseData.hotelId, 'PENDING'], transaction });
      const ledger = (await InventoryReservation.findByPk(releaseData.bookingId, { transaction, lock: transaction.LOCK.UPDATE }))!;
      if (ledger.hotelId !== releaseData.hotelId) throw new ConflictError('Booking belongs to a different hotel');
      await ledger.update({ status: 'RELEASED' }, { transaction });
      const releasedRows =
        await roomRepository
          .releaseInventoryByBookingId(
            releaseData.bookingId,
            releaseData.hotelId,
            transaction
          );

      return {
        bookingId:
          releaseData.bookingId,

        hotelId:
          releaseData.hotelId,

        releasedInventoryRows:
          releasedRows,
      };
    }
  );
}