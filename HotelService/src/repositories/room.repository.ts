import Room from "../db/models/room";
import BaseRepository from "./base.repository";
import {CreationAttributes, Op, Transaction,} from "sequelize";

export class RoomRepository extends BaseRepository<Room> {
  constructor() {
    super(Room);
  }

  async countByRoomCategoryId(
    roomCategoryId: number
  ): Promise<number> {
    const count = await this.model.count({
      where: {
        roomCategoryId,
      },
    });

    return count;
  }

  async findInventoryInDateRange(
    roomCategoryId: number,
    startDate: string,
    endDate: string
  ): Promise<Room[]> {
    return this.model.findAll({
      where: {
        roomCategoryId,

        dateOfAvailability: {
          [Op.between]: [
            startDate,
            endDate,
          ],
        },

        deletedAt: null,
      },

      attributes: [
        "roomNo",
        "dateOfAvailability",
      ],
    });
  }

  async bulkCreateInventory(
    rooms: CreationAttributes<Room>[]
  ): Promise<Room[]> {
    return this.model.bulkCreate(
      rooms,
      {
        ignoreDuplicates: true,
      }
    );
  }

  async findUnbookedInventoryForStay(
    hotelId: number,
    roomCategoryIds: number[],
    stayDates: string[]
  ): Promise<Room[]> {
    if (
      roomCategoryIds.length === 0 ||
      stayDates.length === 0
    ) {
      return [];
    }

    const rooms =
      await this.model.findAll({
        where: {
          hotelId,

          roomCategoryId: {
            [Op.in]: roomCategoryIds,
          },

          dateOfAvailability: {
            [Op.in]: stayDates,
          },

          bookingId: null,

          deletedAt: null,
        },

        attributes: [
          "roomCategoryId",
          "roomNo",
          "dateOfAvailability",
        ],

        order: [
          ["roomCategoryId", "ASC"],
          ["roomNo", "ASC"],
          ["dateOfAvailability", "ASC"],
        ],
      });
    return rooms;
  }
  async findByBookingIdForUpdate(
    bookingId: number,
    transaction: Transaction
  ): Promise<Room[]> {
    return this.model.findAll({
      where: {
        bookingId,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,

      order: [
        ["roomNo", "ASC"],
        ["dateOfAvailability", "ASC"],
      ],
    });
  }

  async findUnbookedInventoryForStayForUpdate(
    hotelId: number,
    roomCategoryId: number,
    stayDates: string[],
    transaction: Transaction
  ): Promise<Room[]> {
    if (stayDates.length === 0) {
      return [];
    }

    return this.model.findAll({
      where: {
        hotelId,
        roomCategoryId,

        dateOfAvailability: {
          [Op.in]: stayDates,
        },

        bookingId: null,
        deletedAt: null,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,

      order: [
        ["roomNo", "ASC"],
        ["dateOfAvailability", "ASC"],
      ],
    });
  }

  async reserveInventoryRows(
    bookingId: number,
    hotelId: number,
    roomCategoryId: number,
    roomNos: number[],
    stayDates: string[],
    transaction: Transaction
  ): Promise<number> {
    const [affectedRows] =
      await this.model.update(
        {
          bookingId,
        },
        {
          where: {
            hotelId,
            roomCategoryId,

            roomNo: {
              [Op.in]: roomNos,
            },

            dateOfAvailability: {
              [Op.in]: stayDates,
            },

            bookingId: null,
            deletedAt: null,
          },

          transaction,
        }
      );

    return affectedRows;
  }

  async releaseInventoryByBookingId(
    bookingId: number,
    hotelId: number,
    transaction: Transaction
  ): Promise<number> {
    const [affectedRows] =
      await this.model.update(
        {
          bookingId: null,
        },
        {
          where: {
            bookingId,
            hotelId,
          },

          transaction,
        }
      );

    return affectedRows;
  }
}