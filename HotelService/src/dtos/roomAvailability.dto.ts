export type SearchRoomAvailabilityDTO = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  roomCategoryId?: number;
};