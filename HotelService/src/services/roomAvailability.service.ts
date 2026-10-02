import {SearchRoomAvailabilityDTO,} from "../dtos/roomAvailability.dto";
import {HotelRepository,} from "../repositories/hotel.repository";
import {RoomCategoryRepository,} from "../repositories/roomCategory.repository";
import {RoomRepository,} from "../repositories/room.repository";
import {NotFoundError,} from "../utils/errors/app.error";
import {getStayDates,} from "../utils/date.utils";

const hotelRepository = new HotelRepository();
const roomCategoryRepository = new RoomCategoryRepository();
const roomRepository = new RoomRepository();

export async function searchRoomAvailabilityService(
  hotelId: number,
  availabilityData: SearchRoomAvailabilityDTO
){
  // 1. Ensure hotel exists.
  await hotelRepository.findById(
    hotelId
  );

  // 2. Resolve categories to search.
  let roomCategories;

  if (availabilityData.roomCategoryId !== undefined) {
    const roomCategory =
      await roomCategoryRepository
        .findByIdAndHotelId(
          availabilityData.roomCategoryId,
          hotelId
        );

    if (!roomCategory) {
      throw new NotFoundError(
        "Room category not found for this hotel"
      );
    }

    roomCategories = [roomCategory];
  } else {
    roomCategories =
      await roomCategoryRepository
        .findByHotelId(hotelId);
  }

  // 3. Checkout is exclusive.
  const stayDates =
    getStayDates(
      availabilityData.checkIn,
      availabilityData.checkOut
    );

  const nights =
    stayDates.length;

  if (roomCategories.length === 0) {
    return {
      hotelId,
      checkIn:
        availabilityData.checkIn,
      checkOut:
        availabilityData.checkOut,
      nights,
      requestedRooms:
        availabilityData.rooms,
      categories: [],
    };
  }

  const roomCategoryIds =
    roomCategories.map(
      (roomCategory) =>
        roomCategory.id
    );

  // 4. Get only currently unbooked rows.
  const inventoryRows =
    await roomRepository.findUnbookedInventoryForStay(
        hotelId,
        roomCategoryIds,
        stayDates
      );

  /*
    Structure:

    categoryId
       ↓
    roomNo
       ↓
    Set<date>
  */
  const availabilityMap =
    new Map<
      number,
      Map<number, Set<string>>
    >();

  for (const room of inventoryRows) {
    if (
      !availabilityMap.has(
        room.roomCategoryId
      )
    ) {
      availabilityMap.set(
        room.roomCategoryId,
        new Map()
      );
    }

    const roomsForCategory =
      availabilityMap.get(
        room.roomCategoryId
      )!;

    if (
      !roomsForCategory.has(
        room.roomNo
      )
    ) {
      roomsForCategory.set(
        room.roomNo,
        new Set()
      );
    }

    roomsForCategory
      .get(room.roomNo)!
      .add(
        room.dateOfAvailability
      );
  }

  // 5. Calculate availability per category.
  const categories =
    roomCategories.map(
      (roomCategory) => {
        const roomsForCategory =
          availabilityMap.get(
            roomCategory.id
          );

        let availableRoomCount = 0;

        if (roomsForCategory) {
          for (
            const availableDates
            of roomsForCategory.values()
          ) {
            if (
              availableDates.size ===
              nights
            ) {
              availableRoomCount++;
            }
          }
        }

        const isAvailable =
          availableRoomCount >=
          availabilityData.rooms;

        const estimatedTotalAmount =
          roomCategory.price *
          nights *
          availabilityData.rooms;

        return {
          roomCategoryId:
            roomCategory.id,

          roomType:
            roomCategory.roomType,

          pricePerNight:
            roomCategory.price,

          availableRoomCount,

          requestedRooms:
            availabilityData.rooms,

          isAvailable,

          estimatedTotalAmount,
        };
      }
    );

  return {
    hotelId,

    checkIn:
      availabilityData.checkIn,

    checkOut:
      availabilityData.checkOut,

    nights,

    requestedRooms:
      availabilityData.rooms,

    categories,
  };
}