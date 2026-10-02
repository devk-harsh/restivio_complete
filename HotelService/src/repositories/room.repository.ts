import Room from "../db/models/room";
import BaseRepository from "./base.repository";
import {CreationAttributes, Op,} from "sequelize";

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

}