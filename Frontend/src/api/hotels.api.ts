import { hotelClient } from "./client";
import type {
  Envelope,
  Hotel,
  HotelInput,
  RoomCategory,
  CategoryInput,
  Availability,
  Stay,
  InventoryResult,
} from "../types/api";
export const hotelsApi = {
  async list() {
    return (await hotelClient.get<Envelope<Hotel[]>>("/hotels")).data.data;
  },
  async get(id: number) {
    return (await hotelClient.get<Envelope<Hotel>>("/hotels/" + id)).data.data;
  },
  async create(input: HotelInput) {
    return (await hotelClient.post<Envelope<Hotel>>("/hotels", input)).data
      .data;
  },
  async update(id: number, input: HotelInput) {
    return (await hotelClient.put<Envelope<Hotel>>("/hotels/" + id, input)).data
      .data;
  },
  async remove(id: number) {
    await hotelClient.delete("/hotels/" + id);
  },
  async categories(id: number) {
    return (
      await hotelClient.get<Envelope<RoomCategory[]>>(
        "/hotels/" + id + "/room-categories",
      )
    ).data.data;
  },
  async addCategory(id: number, input: CategoryInput) {
    return (
      await hotelClient.post<Envelope<RoomCategory>>(
        "/hotels/" + id + "/room-categories",
        input,
      )
    ).data.data;
  },
  async updateCategory(
    id: number,
    categoryId: number,
    input: Omit<CategoryInput, "roomType">,
  ) {
    return (
      await hotelClient.patch<Envelope<RoomCategory>>(
        "/hotels/" + id + "/room-categories/" + categoryId,
        input,
      )
    ).data.data;
  },
  async removeCategory(id: number, categoryId: number) {
    await hotelClient.delete(
      "/hotels/" + id + "/room-categories/" + categoryId,
    );
  },
  async generate(
    id: number,
    categoryId: number,
    startDate: string,
    endDate: string,
  ) {
    return (
      await hotelClient.post<Envelope<InventoryResult>>(
        "/hotels/" +
          id +
          "/room-categories/" +
          categoryId +
          "/inventory/generate",
        { startDate, endDate },
      )
    ).data.data;
  },
  async availability(id: number, stay: Stay) {
    return (
      await hotelClient.get<Envelope<Availability>>(
        "/hotels/" + id + "/availability",
        {
          params: {
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            rooms: stay.numberOfRooms,
          },
        },
      )
    ).data.data;
  },
};
