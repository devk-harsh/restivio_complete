export type ReserveRoomsDTO = {
  bookingId: number;
  hotelId: number;
  roomCategoryId: number;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
};

export type ReleaseRoomsDTO = {
  bookingId: number;
  hotelId: number;
};